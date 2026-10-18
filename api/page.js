'use strict';
/* Serves the organizer console and meeting rooms:
     /            organizer console (after passcode) or the organizer sign-in
     /r/<room>    the meeting room (after a personal link or the room code) or the join page
   The app and the console are stored as parts with a checksum each and assembled here. */
const L = require('./_lib');
const Rooms = require('./_rooms');
const fs = require('fs'), path = require('path'), crypto = require('crypto');
let CACHE = null;
function loadParts() {
  if (CACHE) return CACHE;
  const dir = path.join(__dirname, '..', 'parts');
  const man = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
  const bad = [], got = {};
  man.files.forEach(function (f) {
    const txt = fs.readFileSync(path.join(dir, f.n), 'utf8');
    if (crypto.createHash('sha1').update(txt, 'utf8').digest('hex') !== f.sha1) bad.push(f.n);
    got[f.n] = txt;
  });
  if (bad.length) { const e = new Error('Checksum mismatch in: ' + bad.join(', ')); e.bad = bad; throw e; }
  const body = man.files.filter(function (f) { return /^p\d+\.html$/.test(f.n); }).map(function (f) { return got[f.n]; }).join('');
  CACHE = { shim: got['host-shim.js'].replace(/<\/script/gi, '<\\/script'), body: body, consoleHtml: got['console.html'] };
  return CACHE;
}
function loadApp() { const p = loadParts(); return p.body; }

const BASE_CSS = '*{box-sizing:border-box}html,body{height:100%}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}';
function head(title, extra) {
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow"><title>' + esc(title) + '</title>' +
    '<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 64 64\'%3E%3Crect width=\'64\' height=\'64\' rx=\'14\' fill=\'%232C5E3B\'/%3E%3Cg fill=\'none\' stroke=\'%23FFFFFF\' stroke-width=\'7\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'M16 17l15 15-15 15\'/%3E%3Cpath d=\'M34 17l15 15-15 15\'/%3E%3C/g%3E%3C/svg%3E">' + (extra || '');
}
function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

const GATE_CSS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500..700&family=Public+Sans:wght@400;500;600;700&display=swap"><style>' +
  ':root{--bg:#F2EFE6;--surface:#FFFEFA;--ink:#1B241D;--ink2:#475046;--line:#DAD4C3;--accent:#2C5E3B;--accent-ink:#FFFFFF;--accent-soft:#DDE9DA;--bad:#A3322A;color-scheme:light}' +
  '@media (prefers-color-scheme:dark){:root{--bg:#111611;--surface:#182018;--ink:#EDEBDF;--ink2:#BBC2B2;--line:#2C372C;--accent:#8CCB8C;--accent-ink:#0C170C;--accent-soft:#1F3A22;--bad:#F2958A;color-scheme:dark}}' +
  BASE_CSS + 'body{background:var(--bg);color:var(--ink);font:16px/1.45 "Public Sans",system-ui,-apple-system,"Segoe UI",sans-serif;display:grid;place-items:center;padding:16px;-webkit-font-smoothing:antialiased}' +
  'main{width:100%;max-width:25rem;background:var(--surface);border:1px solid var(--line);border-radius:.95rem;padding:2rem 1.75rem 1.75rem;display:grid;gap:1rem;box-shadow:0 1px 2px rgba(48,40,20,.08),0 18px 36px -14px rgba(48,40,20,.2)}' +
  '.mark{width:2.6rem;height:2.6rem;border-radius:.6rem;background:var(--accent);color:var(--accent-ink);display:grid;place-items:center}.mark svg{width:1.5rem;height:1.5rem}' +
  'h1{margin:0;font-family:"Fraunces",Georgia,serif;font-weight:600;font-size:1.65rem;letter-spacing:-.012em;line-height:1.1}p{margin:0;color:var(--ink2);font-size:.95rem}' +
  'label{font:500 .72rem/1 ui-monospace,Menlo,Consolas,monospace;text-transform:uppercase;letter-spacing:.09em;color:var(--ink2)}' +
  'input{width:100%;font:inherit;padding:.7rem .8rem;border:1px solid var(--line);border-radius:.6rem;background:var(--bg);color:var(--ink)}input:focus-visible{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}' +
  'button{font:inherit;font-weight:600;padding:.75rem 1rem;border:0;border-radius:.6rem;background:var(--accent);color:var(--accent-ink);cursor:pointer}button:disabled{opacity:.6}.err{color:var(--bad);min-height:1.3em;font-size:.9rem}' +
  '</style></head><body><main><div class="mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5l7 7-7 7"/><path d="M12 5l7 7-7 7"/></svg></div>';

function adminLogin(note) {
  return head('Virtual Offsite · Organizer') + GATE_CSS + '<h1>Organizer sign-in</h1><p>' + esc(note || 'Enter the organizer passcode to set up and manage meeting rooms.') + '</p>' +
    '<form id="f" style="display:grid;gap:10px"><label for="p">Passcode</label><input id="p" type="password" autocomplete="current-password" autofocus required><button id="b" type="submit">Sign in</button><div class="err" id="e" role="alert"></div></form></main>' +
    '<script>document.getElementById("f").addEventListener("submit",function(ev){ev.preventDefault();var b=document.getElementById("b"),e=document.getElementById("e");b.disabled=true;e.textContent="";' +
    'fetch("/api/admin",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({a:"login",passcode:document.getElementById("p").value})})' +
    '.then(function(r){return r.json().then(function(j){return{ok:r.ok,j:j}})}).then(function(x){if(x.ok){location.reload()}else{e.textContent=x.j.message||"That did not work.";b.disabled=false}})' +
    '.catch(function(){e.textContent="Could not reach the server. Try again.";b.disabled=false})});</script></body></html>';
}
function joinPage(rid, title, note) {
  return head('Join · ' + (title || 'Meeting')) + GATE_CSS + '<h1>' + esc(title || 'Join the meeting') + '</h1><p>' + esc(note || 'Use your personal link from the invitation, or enter the room code and your name.') + '</p>' +
    '<form id="f" style="display:grid;gap:10px"><label for="n">Your name</label><input id="n" type="text" autocomplete="name" required maxlength="60"><label for="c">Room code</label><input id="c" type="text" autocapitalize="characters" autocomplete="off" required maxlength="12" style="text-transform:uppercase;letter-spacing:.12em"><button id="b" type="submit">Join</button><div class="err" id="e" role="alert"></div></form></main>' +
    '<script>var RID=' + JSON.stringify(rid) + ';document.getElementById("f").addEventListener("submit",function(ev){ev.preventDefault();var b=document.getElementById("b"),e=document.getElementById("e");b.disabled=true;e.textContent="";' +
    'fetch("/api/join",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({rid:RID,name:document.getElementById("n").value,code:document.getElementById("c").value})})' +
    '.then(function(r){return r.json().then(function(j){return{ok:r.ok,j:j}})}).then(function(x){if(x.ok){location.reload()}else{e.textContent=x.j.message||"That did not work.";b.disabled=false}})' +
    '.catch(function(){e.textContent="Could not reach the server. Try again.";b.disabled=false})});</script></body></html>';
}
/* the error page: 4xx messages are meant for people; anything else may carry internals, so it goes to the log only */
function errPage(e) {
  if (e.status && e.status < 500) return msgPage('The page could not be built', e.message);
  console.warn('[page] ' + (e && e.message));
  return msgPage('The page could not be built', 'Something went wrong on the server. Try again in a minute.');
}
function msgPage(title, msg) {
  return head(title) + GATE_CSS + '<h1>' + esc(title) + '</h1><p>' + esc(msg) + '</p></main></body></html>';
}

function hostScript(host) {
  const j = JSON.stringify(host).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  return '<script>window.__HOST=' + j + ';(function(){var H=window.__HOST,r=document.documentElement;r.setAttribute("data-look",H.room.look);' +
    'var t=H.room.theme;try{t=localStorage.getItem("lr."+H.rid+".theme")||t}catch(e){}if(t==="light"||t==="dark")r.setAttribute("data-theme",t);})();</script>';
}
function appPage(host) {
  const p = loadParts();
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow">' +
    '<title>' + esc(host.room.title) + '</title><style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}html,body{height:100%}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>' +
    hostScript(host) + '</head><body><script>' + p.shim + '</script>' + p.body + '</body></html>';
}

const handler = async function (req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  let q = new URLSearchParams();
  try { q = new URL(req.url, 'http://x').searchParams; } catch (e) { }
  const qs = req.query || {};
  const rid = String(qs.rid || q.get('rid') || ''), k = String(qs.k || q.get('k') || '');
  if (qs.robots || q.get('robots')) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8'); res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.status(200).send('User-agent: *\nDisallow: /\n');
  }
  try {
    if (!rid) {
      if (!L.adminSession(req)) return res.status(200).send(adminLogin(L.env('ADMIN_PASSCODE') ? '' : 'The server has no ADMIN_PASSCODE set yet. Add it in the Vercel project settings and redeploy.'));
      return res.status(200).send(loadParts().consoleHtml);
    }
    if (!L.RID_RE.test(rid) || !L.redisReady()) return res.status(404).send(msgPage('Room not found', 'Check the link in your invitation.'));
    const meta = await L.getMeta(rid, true);
    if (!meta) return res.status(404).send(msgPage('Room not found', 'Check the link in your invitation.'));
    if (k) {
      const person = (meta.people || []).filter(function (p) { return L.safeEq(p.t, k); })[0];
      if (person && meta.status !== 'closed') {
        L.grantRoom(res, rid, person.lead ? 'lead' : 'member', person.n, person.t);
        res.statusCode = 302; res.setHeader('Location', '/r/' + rid); return res.end();
      }
      return res.status(200).send(joinPage(rid, meta.status === 'closed' ? '' : meta.title, 'That link is no longer valid. Ask the organizer for a new one, or enter the room code and your name.'));
    }
    if (meta.status === 'closed') return res.status(410).send(msgPage('This room is closed', 'The organizer has closed this meeting room.'));
    const s = L.roomSession(req, rid);
    const stillValid = s && (!s.tok || (meta.people || []).some(function (p) { return p.t === s.tok; }));
    if (!stillValid) return res.status(200).send(joinPage(rid, meta.title));
    if (s.tok) s.role = meta.people.find(function (p) { return p.t === s.tok; }).lead ? 'lead' : 'member';
    const host = Rooms.hostFor(meta, s);
    return res.status(200).send(appPage(host));
  } catch (e) {
    res.status(500).send(errPage(e));
  }
};

handler.loadApp = loadApp;
handler.loadParts = loadParts;
module.exports = handler;
