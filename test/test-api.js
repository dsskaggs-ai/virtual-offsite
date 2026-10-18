/* API tests: organizer sign-in, room creation, invites, personal links, isolation between rooms, roles, close, rollover, delete. */
const H = require('./harness'), client = require('./client');
let pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.log('FAIL:', m); } }
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const t = await H.start();
  const org = client(t.base);

  // health
  let r = await org.get('/api/health'); const hj = JSON.parse(r.text);
  ok(hj.redis === 'ok' && hj.adminPasscodeSet && hj.emailConfigured, 'health ' + r.text);
  ok(hj.page === 'ok' || /Checksum|ENOENT/.test(hj.page) === false, 'health page ' + hj.page);

  // console is gated
  r = await org.get('/'); ok(r.status === 200 && /Organizer sign-in/.test(r.text) && !/sync/.test(r.text), 'console gated');
  r = await org.post('/api/admin', { a: 'templates' }); ok(r.status === 401, 'templates need sign-in');
  r = await org.post('/api/admin', { a: 'login', passcode: 'wrong' }); ok(r.status === 401, 'bad passcode');
  r = await org.post('/api/admin', { a: 'login', passcode: 'Admin-Delta-42 ' }); ok(r.status === 200, 'good passcode (case and space tolerant)');
  r = await org.get('/'); ok(/<title>/.test(r.text) && !/Organizer sign-in/.test(r.text), 'console served after sign-in');

  r = await org.post('/api/admin', { a: 'templates' });
  ok(r.j.templates.length === 7, 'seven templates');
  ['quarterly', 'annual', 'l10', '4dx', 'standup', 'project', 'generic'].forEach(id => ok(r.j.templates.some(x => x.id === id), 'template ' + id));
  ok(r.j.email === true, 'email flagged configured');

  // create a quarterly room
  r = await org.post('/api/admin', { a: 'create', template: 'quarterly', title: 'Q1 planning', org: 'Acme', dates: ['2027-01-12'], start: '08:30', tz: 'America/Chicago', look: 'cab', theme: 'dark', send: true,
    people: [{ n: 'Ann Lee', e: 'ann@example.com', lead: true }, { n: 'Bo Diaz', e: 'bo@example.com' }, { n: 'Cy Ng', e: '' }] });
  ok(r.status === 200, 'create ' + JSON.stringify(r.j));
  const room = r.j.room; const q = room;
  ok(/^[a-z0-9]{8}$/.test(q.id) && /^[A-Z0-9]{6}$/.test(q.code), 'ids shaped');
  ok(q.people.length === 3 && q.people[0].link.includes('/r/' + q.id + '?k='), 'links');
  ok(q.opts.horizon === '2027-04-12', 'horizon default is 90 days after the meeting date: ' + q.opts.horizon);
  ok(r.j.mail.length === 3 && r.j.mail[0].sent && r.j.mail[1].sent && !r.j.mail[2].sent && /No email/.test(r.j.mail[2].reason), 'mail results ' + JSON.stringify(r.j.mail));
  ok(t.mails.length === 2, 'two emails sent');
  const m0 = t.mails[0].body;
  ok(m0.to[0] === 'ann@example.com' && /Q1 planning/.test(m0.subject) && m0.html.includes(q.people[0].link) && m0.text.includes(q.people[0].link), 'email content');
  ok(m0.attachments && m0.attachments[0].filename === 'meeting.ics' && Buffer.from(m0.attachments[0].content, 'base64').toString().includes('DTSTART:20270112T143000Z'), 'ics start 08:30 CST = 14:30Z');
  ok(!m0.html.includes(q.people[1].link), 'each email carries only its own link');
  ok(t.mails[0].auth === 'Bearer fixture-mail-key', 'mail auth header');

  // personal link
  const ann = client(t.base), bo = client(t.base), cy = client(t.base);
  r = await ann.get('/r/' + q.id); ok(r.status === 200 && /Join/.test(r.text) && !/__HOST/.test(r.text), 'no cookie shows join page');
  r = await ann.get(new URL(q.people[0].link).pathname + new URL(q.people[0].link).search);
  ok(r.status === 302 && r.loc === '/r/' + q.id, 'token redeems with a redirect');
  r = await ann.get('/r/' + q.id);
  ok(r.status === 200 && r.text.includes('window.__HOST=') && r.text.includes('"role":"lead"') && r.text.includes('"who":"Ann Lee"'), 'lead gets the app');
  ok(!r.text.includes('ann@example.com') && !r.text.includes(q.people[1].link.split('k=')[1]) && !r.text.includes('bo@example.com'), 'page leaks no emails or tokens');
  ok(r.text.includes('"code":"' + q.code + '"'), 'lead sees the room code');
  ok(/data-look/.test(r.text) && r.text.includes('"look":"cab"') && r.text.includes('"theme":"dark"'), 'look and theme passed');
  r = await bo.get(new URL(q.people[1].link).pathname + new URL(q.people[1].link).search); r = await bo.get('/r/' + q.id);
  ok(r.text.includes('"role":"member"') && r.text.includes('"who":"Bo Diaz"') && !r.text.includes('"code":"' + q.code + '"'), 'member page, no code');
  r = await cy.get('/r/' + q.id + '?k=nottherighttoken'); ok(r.status === 200 && /no longer valid/.test(r.text), 'bad token says so');

  // seeded documents + sync
  r = await ann.post('/api/sync', { rid: q.id, vs: {}, peer: 'peerAnn001', lastR: 0 });
  ok(r.status === 200 && Object.keys(r.j.cols.targets).length === 4 && Object.keys(r.j.cols.metrics).length === 4, 'targets and metrics seeded ' + JSON.stringify(Object.keys(r.j.cols || {})));
  const tg = Object.values(r.j.cols.targets)[0]; ok(tg.scope === 'q' && tg.metric && tg.agreed === false, 'target shape');
  r = await ann.post('/api/sync', { rid: q.id, vs: r.j.cv, peer: 'peerAnn001', lastR: 0 }); ok(Object.keys(r.j.cols).length === 0, 'unchanged versions send nothing');

  // writes, roles
  r = await bo.post('/api/write', { rid: q.id, ops: [{ op: 'set', col: 'rocks', id: 'r1', fresh: true, data: { scope: 'q', title: 'Hire a service manager', status: 'proposed', ts: 1 } }] });
  ok(r.status === 200, 'member writes a rock');
  r = await ann.post('/api/sync', { rid: q.id, vs: {}, peer: 'peerAnn001', lastR: 0 }); ok(r.j.cols.rocks.r1.title === 'Hire a service manager', 'lead sees member write');
  r = await bo.post('/api/write', { rid: q.id, ops: [{ op: 'set', col: 'live', id: 'state', data: { scene: 'x' } }] }); ok(r.status === 403, 'member cannot move the room');
  r = await ann.post('/api/write', { rid: q.id, ops: [{ op: 'set', col: 'live', id: 'state', data: { scene: 'x' } }] }); ok(r.status === 200, 'lead can');
  r = await bo.post('/api/write', { rid: q.id, ops: [{ op: 'set', col: 'nope', id: 'a', data: {} }] }); ok(r.status === 400, 'unknown collection');
  r = await bo.post('/api/write', { rid: q.id, ops: [{ op: 'set', col: 'notes', id: 'a b', data: {} }] }); ok(r.status === 400, 'bad id');
  r = await bo.post('/api/write', { rid: q.id, ops: [{ op: 'set', col: 'notes', id: 'n1', data: { text: 'x'.repeat(7000) } }] }); ok(r.status === 400, 'oversize value');
  r = await bo.post('/api/write', { rid: q.id, ops: [{ op: 'update', col: 'notes', id: 'ghost', data: { text: 'x' } }] }); ok(r.status === 400, 'update of a missing doc is refused');

  // reactions and presence
  await bo.post('/api/pulse', { rid: q.id, peer: 'peerBo00001', presence: { who: 'Bo Diaz', scene: 'open' } });
  await bo.post('/api/pulse', { rid: q.id, peer: 'peerBo00001', react: { k: 'agree', who: 'Bo Diaz' } });
  r = await ann.post('/api/sync', { rid: q.id, vs: {}, peer: 'peerAnn001', lastR: 0 });
  ok(r.j.peers.some(p => p.presence.who === 'Bo Diaz') && r.j.reacts.some(x => x.k === 'agree'), 'presence and reactions');

  // a second room is a separate world
  r = await org.post('/api/admin', { a: 'create', template: 'standup', title: 'Daily', people: [{ n: 'Dee', e: 'dee@example.com' }, { n: 'Eve' }], send: false });
  const s2 = r.j.room; ok(r.j.mail.length === 0, 'no mail unless asked');
  r = await ann.post('/api/sync', { rid: s2.id, vs: {}, peer: 'peerAnn001', lastR: 0 }); ok(r.status === 401, 'room 1 cookie does not open room 2');
  const dee = client(t.base); await dee.get(new URL(s2.people[0].link).pathname + new URL(s2.people[0].link).search);
  r = await dee.post('/api/sync', { rid: s2.id, vs: {}, peer: 'peerDee0001', lastR: 0 }); ok(r.status === 200 && !r.j.cols.rocks || Object.keys(r.j.cols.rocks || {}).length === 0, 'room 2 has none of room 1 data');
  r = await dee.post('/api/sync', { rid: q.id, vs: {}, peer: 'peerDee0001', lastR: 0 }); ok(r.status === 401, 'room 2 cookie does not open room 1');
  const forged = client(t.base); forged.jar['lr_' + q.id] = Buffer.from(JSON.stringify({ i: q.id, r: 'lead', n: 'X', e: Date.now() + 1e9 })).toString('base64url') + '.AAAA';
  r = await forged.post('/api/sync', { rid: q.id, vs: {}, peer: 'peerForge01', lastR: 0 }); ok(r.status === 401, 'forged cookie refused');

  // walk-in with the code
  const w = client(t.base);
  r = await w.post('/api/join', { rid: q.id, code: 'WRONG1', name: 'Walker' }); ok(r.status === 401, 'wrong code');
  r = await w.post('/api/join', { rid: q.id, code: q.code.toLowerCase(), name: 'Walker' }); ok(r.status === 200, 'right code (any case)');
  r = await w.get('/r/' + q.id); ok(r.text.includes('"role":"member"') && r.text.includes('"who":"Walker"'), 'walk-in is a member under their own name');
  r = await w.post('/api/write', { rid: q.id, ops: [{ op: 'set', col: 'live', id: 'state', data: {} }] }); ok(r.status === 403, 'walk-in cannot lead');

  // revoke a personal link
  r = await org.post('/api/admin', { a: 'person', rid: q.id, idx: 1, op: 'newlink' }); const nl = r.j.room.people[1].link;
  r = await bo.post('/api/sync', { rid: q.id, vs: {}, peer: 'peerBo00001', lastR: 0 }); ok(r.status === 401, 'old link stops working');
  await bo.get(new URL(nl).pathname + new URL(nl).search); r = await bo.post('/api/sync', { rid: q.id, vs: {}, peer: 'peerBo00001', lastR: 0 }); ok(r.status === 200, 'new link works');
  r = await org.post('/api/admin', { a: 'person', rid: q.id, idx: 0, op: 'lead', lead: false }); ok(r.status === 400, 'cannot remove the last facilitator');
  r = await org.post('/api/admin', { a: 'addpeople', rid: q.id, people: [{ n: 'Flo Park', e: 'flo@example.com' }, { n: 'Bo Diaz', e: 'dup@example.com' }], send: true });
  ok(r.j.room.people.length === 4 && r.j.mail.length === 1 && t.mails.length === 3, 'added one new person, skipped the duplicate name');
  r = await org.post('/api/admin', { a: 'addpeople', rid: q.id, people: [{ n: 'Bad Mail', e: 'not-an-email' }] }); ok(r.status === 400, 'bad email refused');

  // capacity: a room holds up to 80 people; create and add agree
  const many = n => Array.from({ length: n }, (_, i) => ({ n: 'Guest ' + i }));
  r = await org.post('/api/admin', { a: 'create', template: 'standup', title: 'Big', people: many(81), send: false });
  ok(r.status === 200 && r.j.room.people.length === 80, 'create keeps 80 of 81 people, got ' + (r.j.room && r.j.room.people.length));
  const big = r.j.room;
  r = await org.post('/api/admin', { a: 'addpeople', rid: big.id, people: [{ n: 'One Too Many' }] });
  ok(r.status === 400 && /up to 80/.test(r.j.message || ''), 'adding to a full room is refused ' + r.status);
  r = await org.post('/api/admin', { a: 'create', template: 'standup', title: 'Edge', people: many(80), send: false });
  ok(r.status === 200 && r.j.room.people.length === 80, 'create accepts exactly 80');
  r = await org.post('/api/admin', { a: 'create', template: 'standup', title: 'Room to add', people: many(70), send: false });
  const part = r.j.room;
  r = await org.post('/api/admin', { a: 'addpeople', rid: part.id, people: many(80).map(p => ({ n: 'New ' + p.n })) });
  ok(r.status === 400, 'adding 80 to a room of 70 is refused');
  r = await org.post('/api/admin', { a: 'addpeople', rid: part.id, people: many(10).map(p => ({ n: 'New ' + p.n })) });
  ok(r.status === 200 && r.j.room.people.length === 80, 'adding up to exactly 80 works');

  // mail failure is reported, not fatal
  t.mails.fail = 2;
  r = await org.post('/api/admin', { a: 'invite', rid: q.id, idx: [0] }); ok(r.status === 200 && r.j.mail[0].sent === false, 'a refused email is reported ' + JSON.stringify(r.j.mail));

  // close and reopen
  r = await org.post('/api/admin', { a: 'close', rid: q.id }); ok(r.j.room.status === 'closed', 'closed');
  await sleep(10);
  r = await ann.post('/api/sync', { rid: q.id, vs: {}, peer: 'peerAnn001', lastR: 0 }); ok(r.status === 410, 'closed room refuses sync');
  r = await ann.get('/r/' + q.id); ok(r.status === 410, 'closed room page');
  r = await org.post('/api/admin', { a: 'reopen', rid: q.id }); ok(r.j.room.status === 'open', 'reopened');
  r = await ann.post('/api/sync', { rid: q.id, vs: {}, peer: 'peerAnn001', lastR: 0 }); ok(r.status === 200, 'open again');

  // list, update
  r = await org.post('/api/admin', { a: 'list' }); ok(r.j.rooms.length === 5 && r.j.rooms[0].roomUrl, 'list'); // 2 original rooms plus 3 capacity-test rooms
  r = await org.post('/api/admin', { a: 'update', rid: q.id, title: 'Q1 plan', start: '09:00', look: 'spec', theme: 'auto' }); ok(r.j.room.title === 'Q1 plan' && r.j.room.look === 'spec', 'update');

  // agenda edits: reorder, retime, remove, custom item; scene content always comes from the template
  r = await org.post('/api/admin', { a: 'create', template: 'generic', title: 'Edited', people: [{ n: 'Ann' }], agenda: [{ label: 'Meeting', items: [
    { id: 'discuss', title: 'Big discussion', mins: 45, pts: ['<img src=x onerror=alert(1)>'], tools: [{ k: 'evil' }] },
    { id: 'actions', mins: 15 }, { custom: true, preset: 'issues', title: 'Parking lot', mins: 10, out: 'Park it' }, { brk: 'Coffee', mins: 5 }, { id: 'nonexistent', mins: 5 }] }] });
  const ed = r.j.room; ok(r.status === 200, 'edited create');
  const annE = client(t.base); await annE.get(new URL(ed.people[0].link).pathname + new URL(ed.people[0].link).search);
  r = await annE.get('/r/' + ed.id); const hostJson = JSON.parse(/window\.__HOST=(.*?);\(function/s.exec(r.text)[1].replace(/\\u003c/g, '<'));
  const items = hostJson.room.days[0].items;
  ok(items.length === 4 && items[0].id === 'discuss' && items[0].mins === 45 && items[0].title === 'Big discussion', 'agenda reorder and retime');
  ok(items[0].pts.every(p => !/onerror/.test(p)) && items[0].tools[0].k === 'wall', 'client cannot inject points or tools');
  ok(items[2].custom && items[2].tools[0].k === 'issues' && items[3].brk === 'Coffee', 'custom item and break');
  ok(hostJson.room.checks.every(c => c.kind !== 'form' || c.id !== 'nothing'), 'checks filtered');

  // recurring rooms: roll to the next session
  r = await org.post('/api/admin', { a: 'create', template: 'l10', title: 'Weekly', people: [{ n: 'Ann', e: 'a@x.co', lead: true }, { n: 'Bo', e: 'b@x.co' }] });
  const wk = r.j.room; const wa = client(t.base), wb = client(t.base);
  await wa.get(new URL(wk.people[0].link).pathname + new URL(wk.people[0].link).search); await wb.get(new URL(wk.people[1].link).pathname + new URL(wk.people[1].link).search);
  const W = (c, ops) => c.post('/api/write', { rid: wk.id, ops });
  await W(wa, [
    { op: 'set', col: 'todos', id: 't_done', fresh: true, data: { text: 'done thing', owner: 'Ann', due: '2027-01-01', checkin: '2027-01-01', status: 'done', sess: 1, ts: 1 } },
    { op: 'set', col: 'todos', id: 't_miss', fresh: true, data: { text: 'missed thing', owner: 'Bo', due: '2027-01-01', checkin: '2027-01-01', status: 'missed', note: 'blocked', sess: 1, ts: 2 } },
    { op: 'set', col: 'issues', id: 'i_solved', fresh: true, data: { title: 'solved', status: 'solved', ts: 1 } },
    { op: 'set', col: 'issues', id: 'i_active', fresh: true, data: { title: 'active', status: 'active', ts: 2 } },
    { op: 'set', col: 'issues', id: 'i_open', fresh: true, data: { title: 'open', status: 'open', ts: 3 } },
    { op: 'set', col: 'metrics', id: 'm1', fresh: true, data: { scope: 'score', name: 'Calls', goal: '50', value: '42', prev: '40', issued: true, ts: 1 } },
    { op: 'set', col: 'rocks', id: 'rk', fresh: true, data: { scope: 'rocks', title: 'A rock', track: 'on', ts: 1 } },
    { op: 'set', col: 'notes', id: 'n1', fresh: true, data: { scene: 'ids', text: 'a note', ts: 1 } },
    { op: 'set', col: 'ideas', id: 'w1', fresh: true, data: { scene: 'segue:segue', text: 'good news', ts: 1 } },
    { op: 'set', col: 'votes', id: 'i_open_v1', fresh: true, data: { idea: 'i_open', v: 'v1', ts: 1 } },
    { op: 'set', col: 'ratings', id: 'rate_ann', fresh: true, data: { sid: 'rate', v: 9, ts: 1 } }]);
  r = await wb.post('/api/session', { rid: wk.id, a: 'next', record: '# x' }); ok(r.status === 403, 'member cannot end the session');
  r = await wa.post('/api/session', { rid: wk.id, a: 'next', sess: 1, record: '# Weekly record\nhello' }); ok(r.status === 200 && r.j.sess === 2, 'next session ' + JSON.stringify(r.j));
  r = await wa.post('/api/session', { rid: wk.id, a: 'next', sess: 1, record: '# again' }); ok(r.status === 400, 'a double click on the old session is refused');
  r = await wa.post('/api/sync', { rid: wk.id, vs: {}, peer: 'peerAnn001', lastR: 0 });
  ok(r.j.sess === 2, 'sync reports the new session');
  const c = r.j.cols;
  ok(!c.todos.t_done && c.todos.t_miss && c.todos.t_miss.status === '' && c.todos.t_miss.sess === 1, 'done to-dos leave, missed ones stay and are reset');
  ok(!c.issues.i_solved && c.issues.i_active.status === 'open' && c.issues.i_open, 'solved issues leave, active ones reopen');
  ok(c.metrics.m1.prev === '42' && c.metrics.m1.value === '' && !c.metrics.m1.issued, 'scorecard keeps last actual ' + JSON.stringify(c.metrics.m1));
  ok(c.rocks.rk && c.rocks.rk.title === 'A rock', 'rocks carry');
  ok(Object.keys(c.notes || {}).length === 0 && Object.keys(c.ideas || {}).length === 0 && Object.keys(c.votes || {}).length === 0 && Object.keys(c.ratings || {}).length === 0, 'session-only data cleared');
  r = await org.get('/api/admin?a=record&rid=' + wk.id); ok(r.status === 200 && JSON.parse(r.text).records.length === 1, 'record listed');
  r = await org.get('/api/admin?a=record&rid=' + wk.id + '&n=0'); ok(r.status === 200 && /hello/.test(r.text) && /attachment/.test(r.headers.get('content-disposition')), 'record downloads');
  r = await wa.get('/r/' + wk.id); ok(r.text.includes('"sess":2'), 'room page is session 2');
  const nonrec = client(t.base); r = await nonrec.post('/api/session', { rid: q.id, a: 'save', record: 'x' }); ok(r.status === 401, 'session needs a cookie');
  r = await ann.post('/api/session', { rid: q.id, a: 'next', record: 'x' }); ok(r.status === 400, 'a one-off room has no next session');

  // delete
  r = await org.post('/api/admin', { a: 'delete', rid: q.id, confirm: 'nope' }); ok(r.status === 400, 'delete needs the code');
  r = await org.post('/api/admin', { a: 'delete', rid: q.id, confirm: q.code }); ok(r.status === 200, 'deleted');
  ok(!Object.keys(t.store.h).some(k => k.startsWith('lr:r:' + q.id)), 'every key of the room is gone');
  r = await ann.get('/r/' + q.id); ok(r.status === 404, 'deleted room page 404');
  r = await org.post('/api/admin', { a: 'logout' }); r = await org.post('/api/admin', { a: 'list' }); ok(r.status === 401, 'signed out');

  // buildRoom is pure: same meta shape as createRoom, no Redis writes
  {
    const Rooms = require('../api/_rooms');
    const before = JSON.stringify(t.store);
    const built = Rooms.buildRoom({ template: 'l10', title: 'Demo', people: [{ n: 'You', lead: true }] });
    ok(built.meta.tpl === 'l10' && built.meta.agenda.length > 0 && Array.isArray(built.docs) && Rooms.buildRoom({ template: 'quarterly', people: [{ n: 'You' }] }).docs.length > 0, 'buildRoom returns meta and seed docs');
    ok(JSON.stringify(t.store) === before, 'buildRoom does not touch Redis');
  }

  { const fs = require('fs'), path = require('path'), want = JSON.stringify(require('../api/_lib').COLS);
    for (const f of ['src/host-shim.js', 'src/js/00-config.js']) {
      const m = /COLS\s*=\s*(\[[^\]]*\])/.exec(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'));
      ok(m && JSON.stringify(JSON.parse(m[1].replace(/'/g, '"'))) === want, 'COLS in ' + f + ' matches api/_lib.js'); } }

  console.log(fail ? 'FAILED' : 'ALL PASSED', pass + ' ok, ' + fail + ' failed'); t.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
