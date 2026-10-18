'use strict';
/* Shared server helpers: Redis REST client, signed cookies, validation, per-room document storage.

   Storage layout (Upstash Redis, every key starts with lr:):
     lr:rooms                 hash   room id -> room settings (JSON): people, tokens, agenda, look, status
     lr:r:<rid>:d:<col>       hash   one field per document field, named "<id>|<field>" (JSON value). "<id>|__" marks a doc as existing
     lr:r:<rid>:cv            hash   collection -> version counter, bumped after every write
     lr:r:<rid>:m             hash   presence ("p:<peer>") and reactions ("r:<ts>-<rand>"), short lived
     lr:r:<rid>:rec           list   saved session records (markdown), newest last
     lr:fail:<ip>             int    failed passcode tries, expires after ten minutes                        */
const crypto = require('crypto');

const COLS = ['live', 'notes', 'ideas', 'votes', 'cards', 'rocks', 'targets', 'commits', 'decisions', 'forms', 'links', 'signoff', 'issues', 'todos', 'metrics', 'ratings', 'updates'];
const LEAD_ONLY = { live: 1 };
const P = 'lr:';
const ID_RE = /^[A-Za-z0-9_:.\-]{1,120}$/;
const FIELD_RE = /^[A-Za-z0-9][A-Za-z0-9_]{0,39}$/;
const PEER_RE = /^[A-Za-z0-9_\-]{6,40}$/;
const RID_RE = /^[a-z0-9]{8}$/;

function env(n) { return process.env[n] || ''; }
function redisUrl() { return env('KV_REST_API_URL') || env('UPSTASH_REDIS_REST_URL'); }
function redisTok() { return env('KV_REST_API_TOKEN') || env('UPSTASH_REDIS_REST_TOKEN'); }
function redisReady() { return !!(redisUrl() && redisTok()); }
function secret() { const s = env('SESSION_SECRET') || (env('ADMIN_PASSCODE') ? env('ADMIN_PASSCODE') + '|mr' : ''); return s; }
function rp(rid) { return P + 'r:' + rid + ':'; }

async function R(cmds, timeoutMs) {
  if (!redisReady()) { const e = new Error('Redis is not connected'); e.code = 'not_configured'; throw e; }
  const r = await fetch(redisUrl().replace(/\/$/, '') + '/pipeline', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + redisTok(), 'Content-Type': 'application/json' },
    body: JSON.stringify(cmds),
    ...(timeoutMs ? { signal: AbortSignal.timeout(timeoutMs) } : {})
  });
  if (!r.ok) { const e = new Error('Redis error ' + r.status); e.code = 'unavailable'; throw e; }
  const j = await r.json();
  return j.map(function (x) { if (x && x.error) { const e = new Error(x.error); e.code = 'unavailable'; throw e; } return x.result; });
}
function toObj(flat) { const o = {}; if (Array.isArray(flat)) for (let i = 0; i + 1 < flat.length; i += 2) o[flat[i]] = flat[i + 1]; return o; }
function bad(m, status) { const e = new Error(m); e.code = 'invalid_argument'; e.status = status || 400; return e; }

/* ---------- signed cookies ---------- */
function b64(s) { return Buffer.from(s).toString('base64url'); }
function mac(p) { return crypto.createHmac('sha256', secret()).update(p).digest('base64url'); }
function safeEq(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest(), hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}
function norm(s) { return String(s || '').trim().toLowerCase(); }
function mint(obj, days) {
  if (!secret()) throw bad('The server has no SESSION_SECRET or ADMIN_PASSCODE set.', 503);
  const p = b64(JSON.stringify(Object.assign({}, obj, { e: Date.now() + days * 864e5 })));
  return p + '.' + mac(p);
}
function readSigned(req, name) {
  const h = (req.headers && req.headers.cookie) || '';
  const hit = h.split(/;\s*/).map(function (x) { const i = x.indexOf('='); return [x.slice(0, i), x.slice(i + 1)]; }).filter(function (x) { return x[0] === name; })[0];
  const v = hit ? hit[1] : '';
  const i = v.indexOf('.'); if (i < 1 || !secret()) return null;
  const p = v.slice(0, i), s = v.slice(i + 1);
  let ok = false; try { ok = safeEq(s, mac(p)); } catch (e) { }
  if (!ok) return null;
  try { const d = JSON.parse(Buffer.from(p, 'base64url').toString()); if (d.e > Date.now()) return d; } catch (e) { }
  return null;
}
function setCookie(res, name, value, days) {
  const prev = res.getHeader && res.getHeader('Set-Cookie');
  const c = name + '=' + value + '; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=' + Math.round(days * 86400);
  res.setHeader('Set-Cookie', prev ? [].concat(prev, c) : c);
}
function clearCookie(res, name) {
  const prev = res.getHeader && res.getHeader('Set-Cookie');
  const c = name + '=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0';
  res.setHeader('Set-Cookie', prev ? [].concat(prev, c) : c);
}
/* room members: cookie lr_<rid> carries the room, role and name, signed */
function roomCookieName(rid) { return 'lr_' + rid; }
function roomSession(req, rid) {
  if (!RID_RE.test(String(rid || ''))) return null;
  const d = readSigned(req, roomCookieName(rid));
  if (!d || d.i !== rid || (d.r !== 'lead' && d.r !== 'member')) return null;
  return { role: d.r, name: String(d.n || ''), tok: String(d.t || '') };
}
function grantRoom(res, rid, role, name, tok) {
  setCookie(res, roomCookieName(rid), mint({ i: rid, r: role, n: String(name || '').slice(0, 60), t: tok || '' }, 14), 14);
}
/* One organizer passcode controls this deployment. */
function adminSession(req) { const d = readSigned(req, 'lr_admin'); return !!(d && d.a === 1); }
function grantAdmin(res) { setCookie(res, 'lr_admin', mint({ a: 1 }, 2), 2); }

function ipOf(req) { return String((req.headers && (req.headers['x-forwarded-for'] || '')) || '').split(',')[0].trim().replace(/[^0-9a-fA-F:.]/g, '') || 'unknown'; }
/* the IP every rate limiter uses. Vercel sets x-vercel-forwarded-for itself; x-forwarded-for can carry client-supplied values. */
function rateIp(req) {
  const h = (req && req.headers) || {};
  const v = String(h['x-vercel-forwarded-for'] || h['x-real-ip'] || '').split(',')[0].trim().replace(/[^0-9a-fA-F:.]/g, '');
  return v || ipOf(req);
}
async function tooManyTries(req) {
  if (!redisReady()) return false;
  try { return Number((await R([['GET', P + 'fail:' + rateIp(req)]]))[0] || 0) >= 15; } catch (e) { return false; }
}
async function noteFailure(req) {
  if (redisReady()) { try { const k = P + 'fail:' + rateIp(req); await R([['INCR', k], ['EXPIRE', k, '600']]); } catch (e) { } }
  await new Promise(function (r) { setTimeout(r, 600); });
}

/* ---------- rooms ---------- */
const metaCache = {};
async function getMeta(rid, fresh) {
  if (!RID_RE.test(String(rid || ''))) return null;
  const c = metaCache[rid];
  if (!fresh && c && c.t > Date.now() - 4000) return c.m;
  const v = (await R([['HGET', P + 'rooms', rid]]))[0];
  let m = null; try { m = v ? JSON.parse(v) : null; } catch (e) { }
  metaCache[rid] = { t: Date.now(), m: m };
  return m;
}
async function putMeta(rid, m) {
  await R([['HSET', P + 'rooms', rid, JSON.stringify(m)]]);
  metaCache[rid] = { t: Date.now(), m: m };
}
function dropMetaCache(rid) { delete metaCache[rid]; }
/* every request about a room goes through here: signed in, room exists, room open */
async function gate(req, res, rid) {
  const s = roomSession(req, rid);
  if (!s) { res.status(401).json({ code: 'unauthorized' }); return null; }
  if (!redisReady()) { res.status(503).json({ code: 'not_configured', message: 'The shared database is not connected yet.' }); return null; }
  const m = await getMeta(rid);
  if (!m) { res.status(404).json({ code: 'no_room', message: 'This room no longer exists.' }); return null; }
  if (s.tok) {
    const person = (m.people || []).find(function (p) { return p.t === s.tok; });
    if (!person) { res.status(401).json({ code: 'unauthorized', message: 'Your link was replaced. Ask the organizer for a new one.' }); return null; }
    s.role = person.lead ? 'lead' : 'member';
  }
  if (m.status === 'closed') { res.status(410).json({ code: 'closed', message: 'This room has been closed by the organizer.' }); return null; }
  return { s: s, m: m };
}

/* ---------- validation ---------- */
function cleanData(d) {
  if (!d || typeof d !== 'object' || Array.isArray(d)) throw bad('Data must be an object');
  const keys = Object.keys(d); if (keys.length > 40) throw bad('Too many fields');
  const out = {};
  keys.forEach(function (k) {
    if (!FIELD_RE.test(k)) throw bad('Bad field name');
    const s = JSON.stringify(d[k]); if (s === undefined) return;
    if (s.length > 6000) throw bad('Value too long');
    out[k] = s;
  });
  return out;
}

/* ---------- documents ---------- */
function decode(flat) {
  const docs = {}, o = toObj(flat);
  Object.keys(o).forEach(function (k) {
    const i = k.lastIndexOf('|'); if (i < 1) return;
    const id = k.slice(0, i), f = k.slice(i + 1);
    const d = docs[id] || (docs[id] = {});
    if (f === '__') return;
    try { d[f] = JSON.parse(o[k]); } catch (e) { }
  });
  return docs;
}
function setArgs(rid, col, id, fields) {
  return setCmds(rid, col, id, fields);
}
function setCmds(rid, col, id, fields) {
  const args = ['HSET', rp(rid) + 'd:' + col, id + '|__', '1'];
  Object.keys(fields).forEach(function (f) { args.push(id + '|' + f, fields[f]); });
  return args;
}
async function writeOp(rid, op, role) {
  if (!op || typeof op !== 'object') throw bad('Bad operation');
  const col = op.col, id = op.id, kind = op.op;
  if (COLS.indexOf(col) < 0) throw bad('Unknown collection');
  if (!ID_RE.test(String(id || ''))) throw bad('Bad id');
  if (LEAD_ONLY[col] && role !== 'lead') throw bad('Only the facilitator can change this', 403);
  const key = rp(rid) + 'd:' + col;
  if (kind === 'set') {
    const f = cleanData(op.data);
    if (!op.fresh) {
      const keys = (await R([['HKEYS', key]]))[0] || [];
      const old = keys.filter(function (k) { return k.indexOf(id + '|') === 0; });
      if (old.length) await R([['HDEL', key].concat(old)]);
    }
    await R([setCmds(rid, col, id, f)]);
  } else if (kind === 'update') {
    const f = cleanData(op.data);
    const ex = (await R([['HEXISTS', key, id + '|__']]))[0];
    if (!ex) throw bad('That item no longer exists');
    if (Object.keys(f).length) await R([setCmds(rid, col, id, f)]);
  } else if (kind === 'delete') {
    const keys = (await R([['HKEYS', key]]))[0] || [];
    const old = keys.filter(function (k) { return k.indexOf(id + '|') === 0; });
    if (old.length) await R([['HDEL', key].concat(old)]);
  } else throw bad('Unknown operation');
  await R([['HINCRBY', rp(rid) + 'cv', col, '1']]);
}
/* write many documents at once (room creation, session rollover). docs: [{col,id,data}] */
async function seedDocs(rid, docs) {
  if (!docs.length) return;
  const cols = {}, cmds = [], now = Date.now();
  docs.forEach(function (d, n) {
    cols[d.col] = 1;
    cmds.push(setCmds(rid, d.col, d.id, cleanData(Object.assign({ ts: now + n }, d.data))));
  });
  Object.keys(cols).forEach(function (c) { cmds.push(['HINCRBY', rp(rid) + 'cv', c, '1']); });
  for (let i = 0; i < cmds.length; i += 80) await R(cmds.slice(i, i + 80));
}
async function readCol(rid, col) { return decode((await R([['HGETALL', rp(rid) + 'd:' + col]]))[0]); }

function slug(s) { return String(s || '').normalize('NFKD').replace(/[^\w]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'x'; }
function rand(n, alphabet) { const b = crypto.randomBytes(n); let o = ''; for (let i = 0; i < n; i++) o += alphabet[b[i] % alphabet.length]; return o; }
function token() { return crypto.randomBytes(18).toString('base64url'); }

module.exports = {
  COLS, P, PEER_RE, RID_RE, R, rp, toObj, decode, redisReady, env, bad, norm, safeEq, slug, rand, token,
  roomSession, grantRoom, adminSession, grantAdmin, setCookie, clearCookie, roomCookieName,
  getMeta, putMeta, dropMetaCache, gate, writeOp, seedDocs, readCol, cleanData, setArgs, tooManyTries, noteFailure, ipOf, rateIp, mint, readSigned
};
