/* Two people in one weekly room, through the real server and a real browser:
   typing, live sync, issues and votes, to-dos, scorecard to issue, rating, save and roll over to the next session. */
const harness = require('./harness'), client = require('./client');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/npm-tools/node_modules/playwright'); }
let pass = 0, failn = 0; const ok = (c, m) => { if (c) pass++; else { failn++; console.log('FAIL', m); } };
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const t = await harness.start({ mail: false });
  const org = client(t.base); await org.post('/api/admin', { a: 'login', passcode: 'admin-delta-42' });
  const r = await org.post('/api/admin', { a: 'create', template: 'l10', title: 'Weekly', dates: ['2027-01-12'], start: '08:30', tz: 'America/Chicago', people: [{ n: 'Ann Lee', lead: true }, { n: 'Bo Diaz' }] });
  const room = r.j.room;
  const browser = await pw.chromium.launch();
  const mk = async (link) => { const ctx = await harness.ctx(browser, { viewport: { width: 1360, height: 900 } }); const p = await ctx.newPage(); p.errs = [];
    p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|ERR_NAME|ERR_INTERNET/.test(m.text())) p.errs.push(m.text()); });
    await p.goto(link); await p.waitForSelector('#agenda .sess'); return p; };
  const ann = await mk(room.people[0].link), bo = await mk(room.people[1].link);
  const scene = async (p, i) => { await p.locator('#agenda .sess').nth(i).click(); await wait(250); };
  // scorecard: Ann adds a measure with a goal and an actual that misses
  await scene(ann, 1);
  await ann.fill('#mt-new-score', 'Orders shipped'); await ann.click('text=Add measure'); await ann.waitForSelector('input[id^="mt-"][id$="-goal"]');
  await ann.fill('input[id^="mt-"][id$="-goal"]', '50'); await ann.fill('input[id^="mt-"][id$="-value"]', '40'); await wait(300);
  await ann.waitForSelector('text=Off track');
  ok(true, 'scorecard row');
  await ann.click('button:has-text("To issues")'); await wait(300);
  // Bo sees it
  await scene(bo, 1); await wait(2600);
  const boVal = await bo.inputValue('input[id^="mt-"][id$="-value"]'); ok(boVal === '40', 'Bo sees Ann\'s actual, got ' + boVal);
  // issues
  await scene(bo, 5); await wait(2600);
  ok(await bo.locator('input.rt[id^="is-"]').count() === 1, 'issue from scorecard shows for Bo');
  await bo.fill('#is-new-issues', 'Carrier delays'); await bo.press('#is-new-issues', 'Enter'); await wait(400);
  ok(await bo.locator('input.rt[id^="is-"]').count() === 2, 'Bo added an issue');
  await scene(ann, 5); await wait(2600);
  ok(await ann.locator('input.rt[id^="is-"]').count() === 2, 'Ann sees both issues');
  const votes = ann.locator('button.vote'); await votes.nth(1).click(); await wait(2600);
  const txtBo = await bo.locator('button.vote').allInnerTexts(); ok(txtBo.some(x => /\+1 1/.test(x)), 'vote reaches Bo ' + txtBo);
  // new to-do in IDS
  await ann.fill('#td-text-new', 'Call the carrier'); await ann.selectOption('#td-who-new', { label: 'Bo Diaz' }); await ann.click('#td-text-new ~ * >> text=Add').catch(async () => { await ann.press('#td-text-new', 'Enter'); });
  await wait(500);
  ok(await ann.locator('input.tdt').count() >= 1, 'to-do added');
  // rating
  await scene(ann, 6); await scene(bo, 6);
  const rate = ann.locator('button[aria-label*="8"]'); if (await rate.count()) { await rate.first().click(); }
  // save record and roll over
  await ann.click('#saveBtn'); await wait(600);
  const list = await org.get('/api/admin?rid=' + room.id + '&list=1'); ok(list.status === 200, 'record list');
  await ann.click('#nextBtn'); await wait(300); await ann.click('#nextBtn');
  await ann.waitForLoadState('load'); await wait(3500); await ann.waitForSelector('#agenda .sess');
  const hdr = await ann.innerText('#brandSub'); ok(/Session 2/.test(hdr), 'session 2 after rollover: ' + hdr);
  await scene(ann, 1); await wait(500);
  ok(await ann.inputValue('input[id^="mt-"][id$="-value"]') === '' , 'actual cleared');
  const prev = await ann.locator('td.ref').first().innerText(); ok(prev === '40', 'last week actual kept: ' + prev);
  await bo.waitForTimeout(2800); const hb = await bo.innerText('#brandSub'); ok(/Session 2/.test(hb), 'Bo moved to session 2: ' + hb);
  [ann, bo].forEach((p, i) => ok(!p.errs.length, 'no page errors ' + i + ' ' + p.errs.slice(0, 3).join(' | ')));
  await ann.screenshot({ path: (process.env.SHOTS || '/tmp') + '/l10-session2.png' });
  await browser.close(); t.close();
  console.log(failn ? failn + ' FAILED' : 'ALL OK', pass, 'ok'); process.exit(failn ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
