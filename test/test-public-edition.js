'use strict';
/* Keep this distribution limited to meeting rooms, including when unrelated flags are set. */
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const H = require('./harness'), client = require('./client');
const root = path.join(__dirname, '..');

(async () => {
  const endpoints = fs.readdirSync(path.join(root, 'api')).filter(n => !n.startsWith('_')).sort();
  assert.deepEqual(endpoints, ['admin.js', 'health.js', 'join.js', 'page.js', 'pulse.js', 'session.js', 'sync.js', 'write.js']);
  const helpers = fs.readdirSync(path.join(root, 'api')).filter(n => n.startsWith('_')).sort();
  assert.deepEqual(helpers, ['_lib.js', '_mail.js', '_rooms.js', '_templates']);
  const forbidden = /\b(?:SAAS_MODE|SITE_ONLY|AGENT_ENABLED|AGENT_API_KEY|STRIPE_SECRET_KEY|OPS_ENABLED)\b|\/api\/(?:agent|ops|auth|billing|stripe|waitlist)|require\(['"]\.\/_?(?:agent|auth|workspace|team|ops|stripe|billing|usage|model|extract)/;
  function scan(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const f = path.join(dir, entry.name);
      if (entry.isDirectory()) scan(f);
      else if (/\.(?:js|html|css|json|py)$/.test(entry.name)) assert(!forbidden.test(fs.readFileSync(f, 'utf8')), 'Unexpected product capability: ' + path.relative(root, f));
    }
  }
  for (const d of ['api', 'src', 'parts']) scan(path.join(root, d));
  const pkg = require('../package.json');
  assert(!pkg.dependencies || Object.keys(pkg.dependencies).length === 0, 'No service SDKs required');
  const config = require('../vercel.json');
  assert(!config.crons, 'No scheduled background jobs');
  assert.deepEqual(config.rewrites.map(r => r.source), ['/', '/r/:rid', '/robots.txt']);

  // Old commercial flags cannot change this edition's behavior.
  Object.assign(process.env, { SAAS_MODE: '1', SITE_ONLY: '1', AGENT_ENABLED: '1', OPS_ENABLED: '1' });
  const t = await H.start({ mail: false });
  try {
    const org = client(t.base);
    assert.equal((await org.post('/api/admin', { a: 'login', passcode: 'admin-delta-42' })).status, 200);
    const meta = (await org.post('/api/admin', { a: 'templates' })).j;
    assert.equal(meta.templates.length, 7);
    assert(!('agent' in meta) && !('workspace' in meta));
    const consolePage = await org.get('/');
    assert(consolePage.text.includes('Your meeting rooms'));
    assert(!/docsPanel|scribeBtn|billingBtn|teamBtn|supportBtn/.test(consolePage.text));
    for (const route of ['/api/agent/record', '/api/ops', '/api/auth', '/api/billing/checkout', '/api/stripe/webhook', '/api/waitlist', '/signup', '/app/plan', '/ops', '/demo']) {
      assert.equal((await org.get(route)).status, 404, route);
    }
    for (const action of ['docs', 'docadd', 'docdel', 'notepost', 'team', 'teaminvite', 'export']) {
      assert.equal((await org.post('/api/admin', { a: action })).status, 400, action);
    }
    const made = await org.post('/api/admin', { a: 'create', template: 'l10', title: 'Public edition test', org: 'Example Organization', people: [{ n: 'Organizer', lead: true }, { n: 'Participant' }] });
    assert.equal(made.status, 200);
    const attendee = client(t.base);
    const personal = new URL(made.j.room.people[0].link);
    assert.equal((await attendee.get(personal.pathname + personal.search)).status, 302);
    const room = await attendee.get(personal.pathname);
    assert.equal(room.status, 200);
    assert(!/scribeBtn|\/api\/agent|\/api\/ops/.test(room.text));
    assert.equal((await attendee.post('/api/admin', { a: 'list' })).status, 401);
    // Permission changes apply to an attendee who already has a signed cookie.
    await org.post('/api/admin', { a: 'person', rid: made.j.room.id, idx: 1, op: 'lead', lead: true });
    await org.post('/api/admin', { a: 'person', rid: made.j.room.id, idx: 0, op: 'lead', lead: false });
    assert.equal((await attendee.post('/api/session', { rid: made.j.room.id, a: 'next', sess: 1 })).status, 403);
    assert.equal((await attendee.post('/api/write', { rid: made.j.room.id, ops: [{ col: 'live', id: 'state', op: 'set', data: { scene: 'scorecard' } }] })).status, 403);
    assert((await attendee.get(personal.pathname)).text.includes('"role":"member"'));
    const health = JSON.parse((await org.get('/api/health')).text);
    assert.deepEqual(Object.keys(health).sort(), ['adminPasscodeSet', 'emailConfigured', 'page', 'redis', 'redisEnv', 'sessionSecretSet']);
    assert.equal(health.redis, 'ok');
    assert.equal(health.page, 'ok');
  } finally { t.close(); }

  // Exercise the actual local adapter, not just the test harness's routing.
  const server = require('../tools/dev-server').createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  try {
    assert((await (await fetch(base)).text()).includes('Organizer sign-in'));
    assert.equal((await fetch(base + '/api/billing/checkout')).status, 404);
    assert.equal((await fetch(base + '/api/admin', { method: 'POST', body: '{bad' })).status, 400);
    assert.equal((await fetch(base + '/robots.txt')).headers.get('referrer-policy'), 'no-referrer');
  } finally { await new Promise(resolve => server.close(resolve)); }
  console.log('public edition: allowed files, removed capabilities, flag isolation, organizer/attendee access, health, and local server passed');
})().catch(e => { console.error(e); process.exit(1); });
