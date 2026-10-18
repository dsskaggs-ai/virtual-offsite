'use strict';
/* Organizer API. Every action except login needs the lr_admin cookie. */
const L = require('./_lib');
const Rooms = require('./_rooms');
const Mail = require('./_mail');

function baseUrl(req) {
  const b = L.env('BASE_URL'); if (b) return b.replace(/\/$/, '');
  const h = (req.headers && (req.headers['x-forwarded-host'] || req.headers.host)) || 'localhost';
  const proto = (req.headers && req.headers['x-forwarded-proto']) || (/^localhost|^127\./.test(h) ? 'http' : 'https');
  return proto.split(',')[0] + '://' + h;
}
function view(meta, base) {
  return {
    id: meta.id, code: meta.code, title: meta.title, org: meta.org, tpl: meta.tpl, tname: meta.tname, look: meta.look, theme: meta.theme, tz: meta.tz, start: meta.start, dates: meta.dates,
    opts: meta.opts, recurring: meta.recurring, sess: meta.sess, status: meta.status, created: meta.created, when: Rooms.whenText(meta), roomUrl: base + '/r/' + meta.id,
    agenda: meta.agenda.map(function (d) { return { label: d.label, items: d.items.filter(function (i) { return i.id; }).map(function (i) { return { id: i.id, title: i.title }; }) }; }),
    people: meta.people.map(function (p, i) { return { i: i, n: p.n, e: p.e, lead: p.lead, link: Rooms.linkFor(base, meta, p) }; })
  };
}
async function inviteOne(meta, p, base) {
  if (!p.e) return { n: p.n, e: '', sent: false, reason: 'No email address.' };
  const link = Rooms.linkFor(base, meta, p);
  const c = Mail.inviteContent({ name: p.n.split(' ')[0], title: meta.title, tname: meta.tname, when: Rooms.whenText(meta), link: link, code: meta.code, base: base + '/r/' + meta.id, org: meta.org });
  const r = await Mail.send({ to: p.e, subject: c.subject, html: c.html, text: c.text, ics: Rooms.icsFor(meta, link) });
  return { n: p.n, e: p.e, sent: !!r.sent, reason: r.reason || '' };
}
async function inviteMany(meta, base, which) {
  const out = [];
  for (let i = 0; i < meta.people.length; i++) { if (which && which.indexOf(i) < 0) continue; out.push(await inviteOne(meta, meta.people[i], base)); }
  return out;
}
/* Only call after authenticating the organizer. */
async function mustRoom(rid) {
  const m = await L.getMeta(rid, true); if (!m) throw L.bad('That room was not found.', 404); return m;
}

module.exports = async function (req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const base = baseUrl(req);
    if (req.method === 'GET') {
      /* record download */
      const authorized = L.adminSession(req);
      if (!authorized) return res.status(401).json({ code: 'unauthorized' });
      const q = new URL(req.url, 'http://x').searchParams;
      const rid = q.get('rid'), n = Number(q.get('n') || 0);
      const meta = await mustRoom(rid);
      const recs = (await L.R([['LRANGE', L.rp(rid) + 'rec', '0', '-1']]))[0] || [];
      if (!q.get('n')) return res.status(200).json({ records: recs.map(function (r, i) { const o = JSON.parse(r); return { n: i, ts: o.ts, sess: o.sess, kind: o.kind, bytes: o.text.length }; }) });
      const rec = recs[n] ? JSON.parse(recs[n]) : null; if (!rec) return res.status(404).json({ code: 'not_found' });
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="' + meta.title.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') + '-session-' + rec.sess + '.md"');
      return res.status(200).send(rec.text);
    }
    if (req.method !== 'POST') return res.status(405).json({ code: 'invalid_argument' });
    const b = req.body && typeof req.body === 'object' ? req.body : {};
    const a = String(b.a || '');

    if (a === 'login') {
      const want = L.norm(L.env('ADMIN_PASSCODE'));
      if (!want) return res.status(503).json({ code: 'not_configured', message: 'ADMIN_PASSCODE is not set on the server.' });
      if (await L.tooManyTries(req)) return res.status(429).json({ code: 'rate_limited', message: 'Too many tries. Wait ten minutes.' });
      if (!L.safeEq(L.norm(b.passcode), want)) { await L.noteFailure(req); return res.status(401).json({ code: 'bad_passcode', message: 'That passcode did not work.' }); }
      L.grantAdmin(res);
      return res.status(200).json({ ok: true });
    }
    if (a === 'logout') { L.clearCookie(res, 'lr_admin'); return res.status(200).json({ ok: true }); }
    const authorized = L.adminSession(req);
    if (!authorized) return res.status(401).json({ code: 'unauthorized', message: 'Sign in again.' });
    if (!L.redisReady()) return res.status(503).json({ code: 'not_configured', message: 'The shared database is not connected yet.' });

    if (a === 'templates') {
      return res.status(200).json({ templates: Rooms.templates.list.map(Rooms.summary), presets: Rooms.PRESET_LABELS, email: Mail.configured(), base: base, today: Rooms.todayIn('America/Chicago') });
    }
    if (a === 'list') {
      const all = Object.values(L.toObj((await L.R([['HGETALL', L.P + 'rooms']]))[0]));
      const rooms = all.map(function (v) { try { return JSON.parse(v); } catch (e) { return null; } }).filter(Boolean)
        .sort(function (x, y) { return y.created - x.created; })
        .map(function (m) { return { id: m.id, code: m.code, title: m.title, tname: m.tname, status: m.status, people: m.people.length, sess: m.sess, recurring: m.recurring, when: Rooms.whenText(m), created: m.created, roomUrl: base + '/r/' + m.id }; });
      return res.status(200).json({ rooms: rooms });
    }
    if (a === 'create') {
      const meta = await Rooms.createRoom(b);
      let mail = [];
      if (b.send) mail = await inviteMany(meta, base);
      return res.status(200).json({ room: view(meta, base), mail: mail, email: Mail.configured() });
    }
    if (a === 'get') { return res.status(200).json({ room: view(await mustRoom(b.rid), base), email: Mail.configured() }); }
    if (a === 'invite') {
      const meta = await mustRoom(b.rid);
      const which = Array.isArray(b.idx) ? b.idx.map(Number) : null;
      return res.status(200).json({ mail: await inviteMany(meta, base, which), email: Mail.configured() });
    }
    if (a === 'addpeople') {
      const meta = await mustRoom(b.rid);
      const add = Rooms.peopleFrom(b.people, true);
      const have = {}; meta.people.forEach(function (p) { have[p.n.toLowerCase()] = 1; });
      const fresh = add.filter(function (p) { return !have[p.n.toLowerCase()]; });
      if (meta.people.length + fresh.length > Rooms.MAX_PEOPLE) throw L.bad('A room holds up to ' + Rooms.MAX_PEOPLE + ' people.');
      fresh.forEach(function (p) { meta.people.push(p); });
      await L.putMeta(meta.id, meta);
      let mail = [];
      if (b.send) { for (const p of fresh) mail.push(await inviteOne(meta, p, base)); }
      return res.status(200).json({ room: view(meta, base), mail: mail });
    }
    if (a === 'person') {
      const meta = await mustRoom(b.rid), i = Number(b.idx);
      const p = meta.people[i]; if (!p) throw L.bad('That person was not found.');
      if (b.op === 'remove') { if (meta.people.length === 1) throw L.bad('A room needs at least one person.'); meta.people.splice(i, 1); if (!meta.people.some(function (x) { return x.lead; })) meta.people[0].lead = true; }
      else if (b.op === 'newlink') p.t = L.token();
      else if (b.op === 'lead') { p.lead = !!b.lead; if (!meta.people.some(function (x) { return x.lead; })) throw L.bad('A room needs at least one facilitator.'); }
      else throw L.bad('Unknown change');
      await L.putMeta(meta.id, meta);
      return res.status(200).json({ room: view(meta, base) });
    }
    if (a === 'update') {
      const meta = await mustRoom(b.rid);
      if (b.title != null) meta.title = Rooms.str(b.title, 90) || meta.title;
      if (b.org != null) meta.org = Rooms.str(b.org, 80);
      if (b.start != null && Rooms.validTime(b.start)) meta.start = b.start;
      if (b.tz != null && Rooms.validTz(b.tz)) meta.tz = b.tz;
      if (Array.isArray(b.dates)) meta.dates = meta.agenda.map(function (_, i) { return Rooms.validDate(b.dates[i]) ? b.dates[i] : ''; });
      if (['field', 'cab', 'spec'].indexOf(b.look) >= 0) meta.look = b.look;
      if (['light', 'dark', 'auto'].indexOf(b.theme) >= 0) meta.theme = b.theme;
      await L.putMeta(meta.id, meta);
      return res.status(200).json({ room: view(meta, base) });
    }
    if (a === 'close' || a === 'reopen') {
      const meta = await mustRoom(b.rid); meta.status = a === 'close' ? 'closed' : 'open';
      await L.putMeta(meta.id, meta);
      return res.status(200).json({ room: view(meta, base) });
    }
    if (a === 'delete') {
      const meta = await mustRoom(b.rid);
      if (L.norm(b.confirm) !== L.norm(meta.code)) throw L.bad('Type the room code to delete the room for good.');
      await Rooms.deleteRoom(meta.id);
      return res.status(200).json({ ok: true });
    }
    throw L.bad('Unknown action');
  } catch (e) {
    /* client errors (4xx) explain themselves; anything else may carry internals, so it goes to the log only */
    const client = e.status && e.status < 500;
    if (!client) console.warn('[admin] ' + e.message);
    res.status(e.status || 500).json({ code: e.code || 'unavailable', message: client ? e.message : 'Something went wrong on the server. Try again in a minute.' });
  }
};
