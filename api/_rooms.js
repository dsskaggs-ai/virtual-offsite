'use strict';
/* Room creation: pick a template, apply the organizer's edits, resolve dates, work out starting documents, and roll a recurring room to its next session. */
const L = require('./_lib');
const T = require('./_templates');

const PRESETS = {
  notes: function (id, title) { return []; },
  wall: function (id, title) { return [{ k: 'wall', id: 'w' + id, title: title, prompt: 'One card each.', ph: 'Add an idea or question' }]; },
  issues: function (id, title) { return [{ k: 'issues', id: 'i' + id, title: title, prompt: 'Add an item, vote for the ones that matter, and work them from the top.' }]; },
  todos: function (id, title) { return [{ k: 'todos', id: 't' + id, title: 'Actions', mode: 'both', noun: 'action' }]; },
  roundtable: function (id, title) { return [{ k: 'standup', id: 'u' + id, title: 'Round table' }]; },
  rating: function (id, title) { return [{ k: 'rating', id: 'r' + id, title: 'Rate this meeting', prompt: 'One to ten.' }]; }
};
const PRESET_LABELS = { notes: 'Notes only', wall: 'Discussion wall', issues: 'Ranked issues', todos: 'Actions', roundtable: 'Round table', rating: 'Rate the meeting' };

function clone(x) { return JSON.parse(JSON.stringify(x)); }
function str(v, max) { return String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max); }
function validDate(d) { return /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(Date.parse(d + 'T12:00:00Z')); }
function validTime(t) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(t); }
function validTz(z) { try { new Intl.DateTimeFormat('en-US', { timeZone: z }); return true; } catch (e) { return false; } }
function addDays(d, n) { const t = new Date(d + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); }
function todayIn(tz) {
  try { const p = {}; new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; }); return p.year + '-' + p.month + '-' + p.day; }
  catch (e) { return new Date().toISOString().slice(0, 10); }
}
function resolveDefault(def, base) { const m = /^\+(\d+)d$/.exec(String(def || '')); return m ? addDays(base, +m[1]) : (def || ''); }

function summary(t) {
  let mins = 0, scenes = 0; const days = t.days.map(function (d) {
    return { label: d.label, items: d.items.map(function (i) { mins += i.mins; if (!i.brk) scenes++; return i.brk ? { brk: i.brk, mins: i.mins } : { id: i.id, title: i.title, mins: i.mins, out: i.out }; }) };
  });
  return { id: t.id, name: t.name, short: t.short, basis: t.basis, blurb: t.blurb, recurring: t.recurring, defaultTitle: t.defaultTitle, setup: t.setup, minutes: mins, scenes: scenes, days: days };
}

/* The organizer may reorder, retime, remove and add scenes. Scene content (points and tools) always comes from the template, never from the request. */
function normalizeAgenda(tpl, input) {
  const base = clone(tpl.days);
  if (!input || !Array.isArray(input) || !input.length) return base;
  const lib = {}; tpl.days.forEach(function (d) { d.items.forEach(function (i) { if (i.id) lib[i.id] = i; }); });
  const used = {}, out = [];
  input.slice(0, 5).forEach(function (d, di) {
    const items = [];
    (Array.isArray(d.items) ? d.items : []).slice(0, 40).forEach(function (it) {
      const mins = Math.max(1, Math.min(480, Math.round(Number(it.mins) || 10)));
      if (it.brk) { items.push({ brk: str(it.brk, 40) || 'Break', mins: mins }); return; }
      if (it.custom) {
        const id = /^[a-z0-9]{3,12}$/.test(String(it.id || '')) ? it.id : 'c' + L.rand(5, 'abcdefghjkmnpqrstuvwxyz23456789');
        if (used[id]) return; used[id] = 1;
        const preset = PRESETS[it.preset] ? it.preset : 'notes', title = str(it.title, 80) || 'Discussion';
        items.push({ id: id, custom: true, preset: preset, title: title, mins: mins, out: str(it.out, 300) || 'A clear output from this item.', pts: [], tools: PRESETS[preset](id, title), nonotes: false });
        return;
      }
      const src = lib[it.id]; if (!src || used[src.id]) return; used[src.id] = 1;
      const s = clone(src); s.mins = mins; const t = str(it.title, 80); if (t) s.title = t;
      items.push(s);
    });
    if (items.length) out.push({ label: str(d.label, 40) || ('Day ' + (di + 1)), items: items });
  });
  return out.length ? out : base;
}

function toolsOf(agenda) { const o = []; agenda.forEach(function (d) { d.items.forEach(function (i) { (i.tools || []).forEach(function (t) { o.push(t); }); }); }); return o; }
function checksFor(tpl, agenda) {
  const tl = toolsOf(agenda);
  function has(f) { return tl.some(f); }
  return (tpl.checks || []).filter(function (c) {
    switch (c.kind) {
      case 'rocks': return has(function (t) { return t.k === 'rocks' && t.scope === c.scope; });
      case 'targets': return has(function (t) { return t.k === 'targets' && t.scope === c.scope; });
      case 'form': case 'pairs': return has(function (t) { return t.k === 'form' && t.id === c.id; });
      case 'commits': return has(function (t) { return t.k === 'commits' && t.id === c.id; });
      case 'signoff': return has(function (t) { return t.k === 'signoff' && t.id === c.id; });
      case 'metrics': return has(function (t) { return t.k === 'metrics' && t.id === c.id; });
      case 'rocktrack': return has(function (t) { return t.k === 'rocktrack' && t.id === c.id; });
      case 'ratings': return has(function (t) { return t.k === 'rating' && t.id === c.id; });
      case 'updates': return has(function (t) { return t.k === 'standup'; });
      case 'todosreview': return has(function (t) { return t.k === 'todos' && (t.mode === 'review' || t.mode === 'both'); });
      case 'todosnew': return has(function (t) { return t.k === 'todos' && t.mode !== 'review'; });
      default: return true;
    }
  }).map(clone);
}

function seedDocsFor(agenda) {
  const docs = [];
  toolsOf(agenda).forEach(function (t) {
    if (t.k === 'targets') (t.seeds || []).forEach(function (s, i) { docs.push({ col: 'targets', id: t.scope + '_' + L.slug(s.metric), data: { scope: t.scope, ord: i + 1, metric: s.metric, ref: s.ref || '', target: '', note: '', agreed: false } }); });
    if (t.k === 'metrics') (t.seeds || []).forEach(function (s, i) { docs.push({ col: 'metrics', id: t.id + '_' + L.slug(s.name), data: { scope: t.id, ord: i + 1, name: s.name, owner: s.owner || '', goal: s.goal || '', value: '', prev: '', hi: s.hi === false ? false : true, type: s.type || '' } }); });
  });
  return docs;
}

/* A room holds up to MAX_PEOPLE people. peopleFrom (create) and the addpeople check in api/admin.js use the same number. */
const MAX_PEOPLE = 80;
function peopleFrom(input, keepLeads) {
  const out = [], seen = {};
  (Array.isArray(input) ? input : []).slice(0, MAX_PEOPLE).forEach(function (p) {
    const n = str(p && p.n, 60), e = str(p && p.e, 160).toLowerCase();
    if (!n) return;
    if (e && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(e)) { const er = L.bad('"' + e + '" does not look like an email address.'); throw er; }
    const key = n.toLowerCase(); if (seen[key]) return; seen[key] = 1;
    out.push({ n: n, e: e, t: L.token(), lead: !!(p && p.lead) });
  });
  if (!out.length) throw L.bad('Add at least one person.');
  if (!keepLeads && !out.some(function (p) { return p.lead; })) out[0].lead = true;
  return out;
}

/* Pure: work out a room's settings and starting documents from a create request. No storage. */
function buildRoom(body) {
  const tpl = T.byId[String(body.template || '')];
  if (!tpl) throw L.bad('Pick a template.');
  const tz = validTz(body.tz) ? body.tz : 'America/Chicago';
  const title = str(body.title, 90) || tpl.defaultTitle;
  const agenda = normalizeAgenda(tpl, body.agenda);
  const dates = Array.isArray(body.dates) ? body.dates.slice(0, agenda.length).map(function (d) { return validDate(d) ? d : ''; }) : [];
  while (dates.length < agenda.length) dates.push('');
  const baseDate = dates[0] || todayIn(tz);
  const opts = {};
  (tpl.setup || []).forEach(function (f) {
    const given = str(body.opts && body.opts[f.k], 20);
    opts[f.k] = validDate(given) ? given : resolveDefault(f.def, baseDate);
  });
  const rid = L.rand(8, 'abcdefghjkmnpqrstuvwxyz23456789');
  const meta = {
    id: rid, code: L.rand(6, 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'), title: title, org: str(body.org, 80), tpl: tpl.id, tname: tpl.name, basis: tpl.basis,
    look: ['field', 'cab', 'spec'].indexOf(body.look) >= 0 ? body.look : 'field', theme: ['light', 'dark', 'auto'].indexOf(body.theme) >= 0 ? body.theme : 'light',
    tz: tz, start: validTime(body.start) ? body.start : '09:00', dates: dates, opts: opts, recurring: !!tpl.recurring, carry: tpl.carry || [], sess: 1,
    status: 'open', created: Date.now(), people: peopleFrom(body.people), agenda: agenda, checks: checksFor(tpl, agenda)
  };
  return { meta: meta, docs: seedDocsFor(agenda) };
}
/* HSETNX: a new room never overwrites an existing one. On an id collision, try a new id (five tries in all). */
async function createRoom(body) {
  const built = buildRoom(body);
  let stored = false;
  for (let i = 0; i < 5 && !stored; i++) {
    if (i) built.meta.id = L.rand(8, 'abcdefghjkmnpqrstuvwxyz23456789');
    stored = Number((await L.R([['HSETNX', L.P + 'rooms', built.meta.id, JSON.stringify(built.meta)]]))[0]) === 1;
  }
  if (!stored) { const e = new Error('Could not pick a free room id.'); e.code = 'unavailable'; e.status = 503; throw e; }
  L.dropMetaCache(built.meta.id);
  await L.seedDocs(built.meta.id, built.docs);
  return built.meta;
}

/* what the room page is told. No emails, no tokens. */
function hostFor(meta, session) {
  return {
    role: session.role, rid: meta.id, who: session.name,
    room: {
      id: meta.id, title: meta.title, org: meta.org, tpl: meta.tpl, tname: meta.tname, basis: meta.basis, look: meta.look, theme: meta.theme, tz: meta.tz, start: meta.start,
      dates: meta.dates, opts: meta.opts, recurring: meta.recurring, sess: meta.sess, days: meta.agenda, checks: meta.checks,
      people: meta.people.map(function (p) { return { n: p.n, lead: p.lead }; }),
      code: session.role === 'lead' ? meta.code : undefined
    }
  };
}

function linkFor(base, meta, p) { return base.replace(/\/$/, '') + '/r/' + meta.id + '?k=' + p.t; }

/* wall time in a zone to a UTC instant */
function zonedToUtc(date, time, tz) {
  const p = date.split('-').map(Number), q = time.split(':').map(Number);
  const guess = Date.UTC(p[0], p[1] - 1, p[2], q[0], q[1]);
  function offset(ms) {
    const o = {}; new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(new Date(ms)).forEach(function (x) { o[x.type] = x.value; });
    return Date.UTC(+o.year, +o.month - 1, +o.day, +o.hour, +o.minute, +o.second) - ms;
  }
  let t = guess - offset(guess); t = guess - offset(t); return t;
}
function dayMinutes(meta) { return (meta.agenda[0] ? meta.agenda[0].items : []).reduce(function (a, i) { return a + i.mins; }, 0); }
function whenText(meta) {
  const d = meta.dates && meta.dates[0]; if (!d) return '';
  try {
    const ms = zonedToUtc(d, meta.start, meta.tz);
    const dd = new Intl.DateTimeFormat('en-US', { timeZone: meta.tz, weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(ms));
    const tt = new Intl.DateTimeFormat('en-US', { timeZone: meta.tz, hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(ms));
    const last = meta.dates.filter(Boolean).length > 1 ? ' (' + meta.dates.filter(Boolean).length + ' days)' : '';
    return dd + ' at ' + tt + last;
  } catch (e) { return d; }
}
function icsFor(meta, link) {
  const d = meta.dates && meta.dates[0]; if (!d) return '';
  const s = zonedToUtc(d, meta.start, meta.tz), e = s + dayMinutes(meta) * 60000;
  const f = function (ms) { return new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); };
  const esc = function (t) { return String(t).replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n'); };
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Virtual Offsite//EN', 'METHOD:PUBLISH', 'BEGIN:VEVENT', 'UID:' + meta.id + '@meeting-room', 'DTSTAMP:' + f(Date.now()), 'DTSTART:' + f(s), 'DTEND:' + f(e),
    'SUMMARY:' + esc(meta.title), 'DESCRIPTION:' + esc(meta.tname + '\nOpen the room: ' + link), 'URL:' + link, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
}

/* ---------- saved records ---------- */
/* The structured decisions of a session, kept next to the markdown so the Prep brief can quote them
   after rollover clears the room: solved issues with their resolution, and the decision log. */
function decisionsOf(cols) {
  const out = [], issues = cols.issues || {}, log = cols.decisions || {};
  Object.keys(issues).forEach(function (k) {
    const i = issues[k];
    if (i.status === 'solved' && str(i.resolution, 200)) out.push({ ts: Number(i.ts) || 0, text: str(i.title, 120) + ': ' + str(i.resolution, 200), src: 'issues' });
  });
  Object.keys(log).forEach(function (k) {
    const d = log[k];
    if (str(d.text, 300)) out.push({ ts: Number(d.ts) || 0, text: str(d.text, 300), src: 'decisions' });
  });
  return out.sort(function (a, b) { return a.ts - b.ts; }).slice(0, 50);
}
/* One entry for lr:r:<rid>:rec. Every path that saves a record goes through here. */
function capRecord(text) {
  const b = Buffer.from(String(text), 'utf8');
  if (b.length <= 400000) return String(text);
  let end = 400000; while (end > 0 && (b[end] & 0xc0) === 0x80) end--;
  return b.subarray(0, end).toString('utf8');
}
async function recordEntry(rid, meta, text, kind) {
  const cols = { issues: await L.readCol(rid, 'issues'), decisions: await L.readCol(rid, 'decisions') };
  return JSON.stringify({ ts: Date.now(), sess: meta.sess || 1, title: meta.title, text: capRecord(text), decisions: decisionsOf(cols), kind: kind || undefined });
}


/* ---------- next session of a recurring room ---------- */
async function rollover(rid, meta, record) {
  const rp = L.rp(rid);
  const carry = meta.carry || [];
  const cmds = [];
  if (record) cmds.push(['RPUSH', rp + 'rec', await recordEntry(rid, meta, record)]);
  const touched = {};
  const keepCols = ['rocks', 'metrics', 'issues', 'todos', 'updates', 'forms', 'cards'].filter(function (c) { return carry.indexOf(c) >= 0; });
  for (const col of L.COLS) {
    const key = rp + 'd:' + col;
    if (keepCols.indexOf(col) < 0) { if (col !== 'live' || true) cmds.push(['DEL', key]); touched[col] = 1; continue; }
    const docs = await L.readCol(rid, col);
    const del = [], set = [];
    Object.keys(docs).forEach(function (id) {
      const d = docs[id];
      if (col === 'issues') { if (d.status === 'solved') del.push(id); else if (d.status === 'active') set.push([id, { status: 'open' }]); }
      else if (col === 'todos') { if (d.done || d.status === 'done') del.push(id); else set.push([id, { status: '', note: '' }]); }
      else if (col === 'rocks') { set.push([id, { track: d.track === 'done' ? 'done' : '', issued: '' }]); }
      else if (col === 'metrics') { set.push([id, { prev: String(d.value || '').trim() ? d.value : (d.prev || ''), value: '', status: '', issued: '' }]); }
      else if (col === 'updates') { set.push([id, { yesterday: d.today || '', today: '', blockers: '' }]); }
    });
    if (del.length) {
      const keys = (await L.R([['HKEYS', key]]))[0] || [];
      const gone = keys.filter(function (k) { const i = k.lastIndexOf('|'); return del.indexOf(k.slice(0, i)) >= 0; });
      if (gone.length) cmds.push(['HDEL', key].concat(gone));
    }
    set.forEach(function (s) { cmds.push(L.setArgs(rid, col, s[0], L.cleanData(s[1]))); });
    if (del.length || set.length) touched[col] = 1;
  }
  Object.keys(touched).forEach(function (c) { cmds.push(['HINCRBY', rp + 'cv', c, '1']); });
  cmds.push(['DEL', rp + 'm']);
  for (let i = 0; i < cmds.length; i += 60) await L.R(cmds.slice(i, i + 60));
  meta.sess = (meta.sess || 1) + 1;
  await L.putMeta(rid, meta);
  return meta.sess;
}

async function deleteRoom(rid) {
  const rp = L.rp(rid);
  await L.R([['DEL', rp + 'cv'], ['DEL', rp + 'm'], ['DEL', rp + 'rec']].concat(L.COLS.map(function (c) { return ['DEL', rp + 'd:' + c]; })).concat([['HDEL', L.P + 'rooms', rid]]));
  L.dropMetaCache(rid);
}

module.exports = { summary, createRoom, buildRoom, hostFor, linkFor, whenText, icsFor, rollover, decisionsOf, recordEntry, addDays, deleteRoom, normalizeAgenda, PRESET_LABELS, peopleFrom, MAX_PEOPLE, validDate, validTime, validTz, str, todayIn, resolveDefault, zonedToUtc, templates: T };
