/* Daily stand-up: write updates, roll to the next day, today becomes yesterday. */
const harness = require('./harness'), client = require('./client');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/npm-tools/node_modules/playwright'); }
let pass = 0, failn = 0; const ok = (c, m) => { if (c) pass++; else { failn++; console.log('FAIL', m); } };
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const t = await harness.start({ mail: false });
  const org = client(t.base); await org.post('/api/admin', { a: 'login', passcode: 'admin-delta-42' });
  const r = await org.post('/api/admin', { a: 'create', template: 'standup', title: 'Daily', start: '09:00', tz: 'America/Chicago', people: [{ n: 'Ann Lee', lead: true }, { n: 'Bo Diaz' }] });
  const room = r.j.room; const browser = await pw.chromium.launch();
  const mk = async link => { const c = await harness.ctx(browser, { viewport: { width: 1360, height: 1000 } }); const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); await p.goto(link); await p.waitForSelector('#agenda .sess'); return p; };
  const ann = await mk(room.people[0].link), bo = await mk(room.people[1].link);
  await ann.fill('#up-Ann_Lee-today', 'Ship the quote tool'); await bo.fill('#up-Bo_Diaz-today', 'Fix the invoice export'); await bo.fill('#up-Bo_Diaz-blockers', 'Waiting on the API key');
  await wait(3000);
  ok(await ann.inputValue('#up-Bo_Diaz-today') === 'Fix the invoice export', 'Ann sees Bo\'s card');
  ok(/Blocked/.test(await ann.locator('.pcard').nth(1).innerText()), 'blocked chip');
  await ann.click('#nextBtn'); await wait(300); await ann.click('#nextBtn'); await ann.waitForLoadState('load'); await wait(3500); await ann.waitForSelector('#up-Ann_Lee-today');
  ok(await ann.inputValue('#up-Ann_Lee-yesterday') === 'Ship the quote tool', 'today became yesterday: ' + await ann.inputValue('#up-Ann_Lee-yesterday'));
  ok(await ann.inputValue('#up-Ann_Lee-today') === '', 'today is empty');
  ok(await ann.inputValue('#up-Bo_Diaz-blockers') === '', 'blockers cleared');
  ok(!ann.errs.length && !bo.errs.length, 'no errors ' + ann.errs.concat(bo.errs).join('|'));
  await browser.close(); t.close(); console.log(failn ? failn + ' FAILED' : 'ALL OK', pass, 'ok'); process.exit(failn ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
