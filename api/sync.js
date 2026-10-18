'use strict';
const L = require('./_lib');

module.exports = async function (req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ code: 'invalid_argument' });
  try {
    const b = req.body && typeof req.body === 'object' ? req.body : {};
    const rid = String(b.rid || '');
    const g = await L.gate(req, res, rid); if (!g) return;
    const rp = L.rp(rid);
    const vs = b.vs && typeof b.vs === 'object' ? b.vs : {};
    const peer = L.PEER_RE.test(String(b.peer || '')) ? b.peer : '';
    const lastR = Number(b.lastR) || 0;
    const now = Date.now();

    const r = await L.R([['HGETALL', rp + 'cv'], ['HGETALL', rp + 'm']]);
    const cv = L.toObj(r[0]), m = L.toObj(r[1]);

    const changed = L.COLS.filter(function (c) { return String(cv[c] || 0) !== String(vs[c]); });
    const cols = {};
    if (changed.length) {
      const got = await L.R(changed.map(function (c) { return ['HGETALL', rp + 'd:' + c]; }));
      changed.forEach(function (c, i) { cols[c] = L.decode(got[i]); });
    }

    const peers = [], reacts = [], stale = [];
    Object.keys(m).forEach(function (k) {
      let v; try { v = JSON.parse(m[k]); } catch (e) { stale.push(k); return; }
      if (k.indexOf('p:') === 0) {
        if (v.t < now - 45000) { stale.push(k); return; }
        const id = k.slice(2);
        peers.push({ peer: id, by: id, kind: 'user', isMe: id === peer, presence: { who: v.who || null, scene: v.scene || null } });
      } else if (k.indexOf('r:') === 0) {
        if (v.t < now - 20000) { stale.push(k); return; }
        if (v.t > lastR) reacts.push({ k: v.k, who: v.who, t: v.t });
      }
    });
    if (stale.length) { try { await L.R([['HDEL', rp + 'm'].concat(stale.slice(0, 50))]); } catch (e) { } }

    const cvOut = {}; L.COLS.forEach(function (c) { cvOut[c] = Number(cv[c] || 0); });
    res.status(200).json({ role: g.s.role, sess: g.m.sess, now: now, cv: cvOut, cols: cols, peers: peers, reacts: reacts });
  } catch (e) {
    res.status(e.status || 500).json({ code: e.code || 'unavailable', message: e.message });
  }
};
