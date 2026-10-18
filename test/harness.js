/* local test rig: a mock Upstash REST endpoint, a mock mail service, and the real handlers behind an http server.
   It mimics the two rewrites in vercel.json: / and /r/:rid go to the page handler. */
const http = require('http');
const store = { h: {}, s: {}, l: {} };
function cmd(c) {
  const [op, ...a] = c; const O = op.toUpperCase();
  const H = k => store.h[k] || (store.h[k] = {});
  switch (O) {
    case 'PING': return 'PONG';
    case 'HSET': { const h = H(a[0]); let n = 0; for (let i = 1; i < a.length; i += 2) { if (!(a[i] in h)) n++; h[a[i]] = String(a[i + 1]); } return n; }
    case 'HSETNX': { const h = H(a[0]); if (a[1] in h) return 0; h[a[1]] = String(a[2]); return 1; }
    case 'HGET': return (store.h[a[0]] || {})[a[1]] ?? null;
    case 'HGETALL': return Object.entries(store.h[a[0]] || {}).flat();
    case 'HLEN': return Object.keys(store.h[a[0]] || {}).length;
    case 'HKEYS': return Object.keys(store.h[a[0]] || {});
    case 'HEXISTS': return (store.h[a[0]] && a[1] in store.h[a[0]]) ? 1 : 0;
    case 'HDEL': { const h = store.h[a[0]] || {}; let n = 0; a.slice(1).forEach(k => { if (k in h) { delete h[k]; n++; } }); return n; }
    case 'HINCRBY': { const h = H(a[0]); h[a[1]] = String((Number(h[a[1]] || 0)) + Number(a[2])); return Number(h[a[1]]); }
    case 'GET': return store.s[a[0]] ?? null;
    case 'EXISTS': return (a[0] in store.s || a[0] in store.h || a[0] in store.l) ? 1 : 0;
    case 'SET': { if (a[2] === 'NX' && a[0] in store.s) return null; store.s[a[0]] = String(a[1]); return 'OK'; }
    case 'INCR': { store.s[a[0]] = String(Number(store.s[a[0]] || 0) + 1); return Number(store.s[a[0]]); }
    /* TTLs are not simulated. EXPIRE ... NX is accepted (and recorded in expireArgs) and returns 1 like a first EXPIRE. */
    case 'EXPIRE': (store.expires = store.expires || []).push(a[0]); (store.expireArgs = store.expireArgs || []).push(a.join(' ')); return 1;
    case 'DEL': { let n = 0; a.forEach(k => { if (k in store.h) { delete store.h[k]; n++; } if (k in store.s) { delete store.s[k]; n++; } if (k in store.l) { delete store.l[k]; n++; } }); return n; }
    case 'RPUSH': { (store.l[a[0]] = store.l[a[0]] || []).push(...a.slice(1)); return store.l[a[0]].length; }
    case 'LRANGE': { const l = store.l[a[0]] || []; const e = Number(a[2]); return l.slice(Number(a[1]), e < 0 ? undefined : e + 1); }
    case 'LTRIM': { const l = store.l[a[0]] || [], end = Number(a[2]); store.l[a[0]] = l.slice(Number(a[1]), end < 0 ? undefined : end + 1); return 'OK'; }
  }
  throw new Error('mock: unsupported ' + O);
}
const mock = http.createServer((req, res) => { let b = ''; req.on('data', d => b += d); req.on('end', () => {
  if (req.headers.authorization !== 'Bearer tok') { res.statusCode = 401; return res.end('{}'); }
  const cmds = JSON.parse(b); const out = cmds.map(c => { if (store.failOn && store.failOn.test(JSON.stringify(c))) return { error: 'mock failure' }; try { return { result: cmd(c) }; } catch (e) { return { error: e.message }; } });
  res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(out)); }); });
const mails = [];
const mailSrv = http.createServer((req, res) => { let b = ''; req.on('data', d => b += d); req.on('end', () => {
  const j = JSON.parse(b); mails.push({ auth: req.headers.authorization, body: j });
  if (mails.fail > 0) { mails.fail--; res.statusCode = 422; res.setHeader('content-type', 'application/json'); return res.end(JSON.stringify({ message: 'bad address' })); }
  res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ id: 'mail_' + mails.length })); }); });
module.exports.start = async function (opts) {
  opts = opts || {};
  await new Promise(r => mock.listen(0, r)); await new Promise(r => mailSrv.listen(0, r));
  process.env.KV_REST_API_URL = 'http://127.0.0.1:' + mock.address().port; process.env.KV_REST_API_TOKEN = 'tok';
  process.env.ADMIN_PASSCODE = 'admin-delta-42'; process.env.SESSION_SECRET = 'testsecret';
  if (opts.mail !== false) { process.env.RESEND_API_KEY = 'fixture-mail-key'; process.env.MAIL_FROM = 'Meetings <meetings@example.com>'; process.env.MAIL_API_URL = 'http://127.0.0.1:' + mailSrv.address().port + '/emails'; }
  else { delete process.env.RESEND_API_KEY; delete process.env.MAIL_FROM; }
  const page = require('../api/page');
  const routes = Object.fromEntries(['admin','join','sync','write','pulse','session','health'].map(name => ['/api/' + name, require('../api/' + name)]));
  const app = http.createServer((req, res) => { let b = ''; req.on('data', d => b += d); req.on('end', () => {
    const u = new URL(req.url, 'http://x'); let h = routes[u.pathname];
    if (u.pathname === '/robots.txt') { h = page; req.query = { robots: '1' }; }
    if (u.pathname === '/') { h = page; req.query = {}; }
    const m = /^\/r\/([a-z0-9]+)$/.exec(u.pathname);
    if (m) { h = page; req.query = { rid: m[1], k: u.searchParams.get('k') || undefined }; req.url = '/api/page?rid=' + m[1] + (u.search ? '&' + u.search.slice(1) : ''); }
    if (!h) { res.statusCode = 404; return res.end('nf'); }
    try { req.body = b ? JSON.parse(b) : undefined; } catch (e) { }
    res.status = c => { res.statusCode = c; return res; }; res.json = o => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(o)); }; res.send = s => res.end(s);
    h(req, res).catch(e => { res.statusCode = 500; res.end(String(e && e.stack || e)); }); }); });
  await new Promise(r => app.listen(0, r));
  return { base: 'http://127.0.0.1:' + app.address().port, store, mails, close() { app.close(); mock.close(); mailSrv.close(); } };
};

/* A browser context with the first-visit tours already marked as seen, so the other tests are not blocked by the overlay.
   test-tour.js uses a plain context to test the tours themselves. */
module.exports.ctx = async function (browser, opts) {
  const c = await browser.newContext(opts);
  await c.addInitScript(function () { try { ['console', 'lead', 'member'].forEach(function (k) { localStorage.setItem('mr.tour.' + k + '.v1', '1'); }); } catch (e) { } });
  return c;
};
