/* Host shim: gives the page a small surface (db, user, room, downloads) over this site's own API, scoped to one room.
   Live updates use short polling. Writes apply on screen at once, then confirm with the server. */
(function () {
  'use strict';
  var HOST = window.__HOST || {};
  var ROLE = HOST.role || 'member';
  var RID = HOST.rid || '';
  var COLS = ['live', 'notes', 'ideas', 'votes', 'cards', 'rocks', 'targets', 'commits', 'decisions', 'forms', 'links', 'signoff', 'issues', 'todos', 'metrics', 'ratings', 'updates'];
  var cache = {}, cv = {}, subs = {}, firstSync = true, lastR = 0, inflight = 0, lastAck = 0, pollTimer = 0, polling = false;
  var presence = { who: null, scene: null }, peersCb = [], reactCb = [], lastPeers = [];
  COLS.forEach(function (c) { cache[c] = {}; subs[c] = []; });

  var peer = '';
  try { peer = sessionStorage.getItem('lr.' + RID + '.peer') || ''; } catch (e) { }
  if (!peer) { peer = 'p' + Math.random().toString(36).slice(2, 12); try { sessionStorage.setItem('lr.' + RID + '.peer', peer); } catch (e) { } }

  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function err(code, msg) { var e = new Error(msg || code); e.code = code; return e; }

  function api(path, body) {
    body = Object.assign({ rid: RID }, body);
    return fetch(path, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) {
        if (r.status === 401) { location.reload(); throw err('unauthorized'); }
        if (r.status === 410 || r.status === 404) { try { document.body.textContent = 'This meeting room has been closed or removed.'; } catch (e) { } throw err('closed'); }
        return r.json().then(function (j) {
          if (!r.ok) throw err(j.code || 'unavailable', j.message);
          return j;
        }, function () { throw err('unavailable'); });
      });
  }

  function snap(col) {
    var m = cache[col] || {};
    var docs = Object.keys(m).sort().map(function (id) { var d = m[id]; return { id: id, exists: true, data: function () { return d; } }; });
    return { docs: docs, size: docs.length, empty: !docs.length };
  }
  function notify(col) { var s = snap(col); subs[col].slice().forEach(function (f) { try { f(s); } catch (e) { console.error(e); } }); }

  /* ---------- polling ---------- */
  function handle(j, started) {
    if (j.role) ROLE = j.role;
    if (j.sess && window.__mrSess) window.__mrSess(j.sess);
    var stale = inflight > 0 || started <= lastAck;
    if (!stale) {
      Object.keys(j.cols || {}).forEach(function (c) { if (!cache[c]) return; cache[c] = j.cols[c]; notify(c); });
      COLS.forEach(function (c) { cv[c] = j.cv[c] || 0; });
    }
    lastPeers = j.peers || [];
    peersCb.forEach(function (f) { try { f({ peers: lastPeers }); } catch (e) { } });
    var maxR = lastR;
    (j.reacts || []).forEach(function (r) {
      if (r.t > maxR) maxR = r.t;
      if (!firstSync && r.t > lastR) reactCb.forEach(function (f) { try { f({ data: { k: r.k, who: r.who } }); } catch (e) { } });
    });
    lastR = Math.max(maxR, firstSync ? j.now : 0);
    firstSync = false;
    return stale;
  }
  function poll() {
    if (polling) return Promise.resolve();
    polling = true;
    var started = Date.now();
    return api('/api/sync', { vs: cv, peer: peer, lastR: lastR }).then(function (j) { return handle(j, started); })
      .finally(function () { polling = false; });
  }
  function schedule(ms) {
    clearTimeout(pollTimer);
    pollTimer = setTimeout(function () {
      if (document.hidden) { schedule(8000); return; }
      poll().then(function (stale) { schedule(stale ? 350 : 2000); }, function () { schedule(5000); });
    }, ms);
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) schedule(100); });

  /* ---------- writes ---------- */
  var queue = Promise.resolve();
  function send(op) {
    inflight++;
    var p = queue.catch(function () { }).then(function () { return api('/api/write', { ops: [op] }); });
    queue = p;
    return p.then(function () { inflight--; lastAck = Date.now(); schedule(150); }, function (e) {
      inflight--; lastAck = Date.now(); cv = {}; schedule(100); throw e;
    });
  }
  function ref(col, id) {
    return {
      id: id, path: col + '/' + id,
      get: function () { var d = cache[col] && cache[col][id]; return Promise.resolve({ id: id, exists: !!d, data: function () { return d; } }); },
      set: function (v) {
        if (ROLE !== 'lead' && col === 'live') return Promise.reject(err('invalid_argument', 'Only the presenter can change this'));
        cache[col][id] = clone(v); notify(col);
        return send({ op: 'set', col: col, id: id, data: v });
      },
      update: function (v) {
        if (!cache[col][id]) return Promise.reject(err('invalid_argument', 'That item no longer exists'));
        Object.assign(cache[col][id], clone(v)); notify(col);
        return send({ op: 'update', col: col, id: id, data: v });
      },
      delete: function () { delete cache[col][id]; notify(col); return send({ op: 'delete', col: col, id: id }); }
    };
  }
  function newId() { return 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  var db = {
    doc: function (p) { var s = p.split('/'); return ref(s[0], s[1]); },
    collection: function (col) {
      return {
        doc: function (id) { return ref(col, id || newId()); },
        add: function (v) {
          var id = newId();
          cache[col][id] = clone(v); notify(col);
          return send({ op: 'set', col: col, id: id, data: v, fresh: true }).then(function () { return ref(col, id); });
        },
        onSnapshot: function (next, onErr) {
          subs[col].push(next);
          setTimeout(function () { next(snap(col)); }, 0);
          return function () { subs[col] = subs[col].filter(function (f) { return f !== next; }); };
        }
      };
    }
  };

  /* ---------- presence and reactions ---------- */
  var pulseT = 0;
  function pulse() {
    clearTimeout(pulseT);
    pulseT = setTimeout(function () { api('/api/pulse', { peer: peer, presence: presence }).catch(function () { }); }, 250);
  }
  setInterval(function () { if (!document.hidden) api('/api/pulse', { peer: peer, presence: presence }).catch(function () { }); }, 15000);
  var room = {
    presence: function (patch) { Object.assign(presence, patch || {}); pulse(); return Promise.resolve(); },
    onPeers: function (fn) { peersCb.push(fn); try { fn({ peers: lastPeers }); } catch (e) { } return function () { }; },
    on: function (topic, fn) { if (topic === 'react') reactCb.push(fn); return function () { }; },
    emit: function (topic, data) {
      if (topic !== 'react') return Promise.resolve();
      return api('/api/pulse', { peer: peer, react: { k: data && data.k, who: data && data.who } }).then(function () { schedule(150); });
    }
  };

  var user = {
    canEdit: function () { return Promise.resolve(ROLE === 'lead'); },
    can: function () { return Promise.resolve(true); },
    me: function () { return Promise.resolve({ name: HOST.who || '' }); },
    isOwner: function () { return ROLE === 'lead'; }
  };

  var downloads = {
    save: function (req) {
      try {
        var blob = new Blob([req.data], { type: 'text/markdown;charset=utf-8' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = req.filename || 'meeting-record.md';
        document.body.appendChild(a); a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
        return Promise.resolve({ status: 'saved' });
      } catch (e) { return Promise.reject(err('unavailable')); }
    }
  };

  /* db is only offered once the first sync works, so a missing database falls back to the page's single-screen mode */
  var dbReady = null;
  function ensureDb() {
    if (dbReady) return dbReady;
    dbReady = poll().then(function () { schedule(2000); return db; }, function (e) { console.warn('shared database unavailable', e && e.code); return null; });
    return dbReady;
  }
  window.__mr = { rid: RID, post: function (path, body) { return api(path, body); } };
  var table = { room: room, user: user, downloads: downloads };
  window.meetingServices = {
    use: function (name) {
      if (name === 'db') return ensureDb();
      if (table[name]) return ensureDb().then(function (d) { return d ? table[name] : null; });
      return Promise.resolve(null);
    }
  };
})();
