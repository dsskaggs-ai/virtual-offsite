/* Quarterly room: Priorities voting and approval order, targets seeds, Critical Numbers, summary, export. */
const harness = require('./harness'), client = require('./client');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/npm-tools/node_modules/playwright'); }
let pass = 0, failn = 0; const ok = (c, m) => { if (c) pass++; else { failn++; console.log('FAIL', m); } };
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const t = await harness.start({ mail: false });
  const org = client(t.base); await org.post('/api/admin', { a: 'login', passcode: 'admin-delta-42' });
  const r = await org.post('/api/admin', { a: 'create', template: 'quarterly', title: 'Q1', dates: ['2027-01-12'], start: '08:30', tz: 'America/Chicago', people: [{ n: 'Ann Lee', lead: true }, { n: 'Bo Diaz' }] });
  const room = r.j.room; const browser = await pw.chromium.launch();
  const mk = async link => { const c = await harness.ctx(browser, { viewport: { width: 1360, height: 1000 } }); const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|ERR_NAME|ERR_INTERNET/.test(m.text())) p.errs.push(m.text()); }); await p.goto(link); await p.waitForSelector('#agenda .sess'); return p; };
  const ann = await mk(room.people[0].link), bo = await mk(room.people[1].link);
  const go = async (p, title) => { await p.locator('#agenda .sess', { hasText: title }).first().click(); await wait(300); };
  await go(ann, 'Choose the company priorities');
  for (const n of ['Launch parts portal', 'Hire service manager', 'Cut cycle time']) { await ann.fill('[id^="rock-new-"]', n); await ann.press('[id^="rock-new-"]', 'Enter'); await wait(250); }
  ok(await ann.locator('article.rock').count() === 3, 'three rocks');
  await go(bo, 'Choose the company priorities'); await wait(2600);
  ok(await bo.locator('article.rock').count() === 3, 'Bo sees three rocks');
  // approve the last one; it should move to the top
  const lastA = ann.locator('article.rock').nth(2);
  await lastA.locator('select[id$="-ownerAdd"]').selectOption({ label: 'Ann Lee' });
  for (const k of ['finish', 'leading', 'source', 'tradeoff']) await lastA.locator('input[id$="-' + k + '"]').fill('x ' + k);
  await bo.locator('article.rock').nth(2).locator('button.vote').click(); await wait(2600);
  ok(/\+1 1/.test(await ann.locator('article.rock').nth(2).locator('button.vote').innerText()), 'vote from Bo reaches Ann');
  const last = ann.locator('article.rock').nth(2); await last.locator('button:text-is("Approve")').click(); await wait(400);
  const order = await ann.locator('article.rock input.rt, article.rock input[id$="-title"]').evaluateAll(els => els.map(e => ({ v: e.value, o: +getComputedStyle(e.closest('article')).order })));
  const sorted = order.slice().sort((a, b) => a.o - b.o).map(x => x.v);
  ok(sorted[0] === 'Cut cycle time', 'approved rock sits first: ' + sorted.join(' > '));
  await ann.locator('article.rock').nth(1).locator('button:text-is("Reject")').click(); await wait(400);
  const o2 = await ann.locator('article.rock').evaluateAll(els => els.map(e => ({ v: e.querySelector('input[id$="-title"]').value, o: +getComputedStyle(e).order })));
  const s2 = o2.sort((a, b) => a.o - b.o).map(x => x.v); ok(s2[s2.length - 1] === 'Hire service manager', 'rejected rock sits last: ' + s2.join(' > '));
  // critical numbers
  await go(ann, 'Choose two Critical Numbers'); await wait(300);
  ok(await ann.locator('main, #stage').first().innerText().then(x => /lead|lag/i.test(x)), 'critical numbers scene mentions lead and lag');
  // summary scene
  await go(ann, 'Read back'); await wait(400);
  const body = await ann.locator('#stage').innerText(); ok(/Cut cycle time/.test(body), 'summary lists the approved rock');
  ok(!/Hire service manager/.test(body.split('Priorities')[1] || ''), 'summary skips the rejected rock') ;
  // export record
  const md = await ann.evaluate(() => buildRecord()); ok(/Cut cycle time/.test(md) && !/undefined/.test(md), 'record text has rock and no undefined');
  [ann, bo].forEach((p, i) => ok(!p.errs.length, 'no page errors ' + i + ' ' + p.errs.slice(0, 3).join(' | ')));
  await ann.screenshot({ path: (process.env.SHOTS || '/tmp') + '/quarterly-summary.png', fullPage: false });
  await browser.close(); t.close();
  console.log(failn ? failn + ' FAILED' : 'ALL OK', pass, 'ok'); process.exit(failn ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
