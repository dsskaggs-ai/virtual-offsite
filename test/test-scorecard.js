/* Scorecard layout: readable in the narrow middle column of the room.
   Long measure names are not cut off, goals show in full, the status pill cycles auto, on, off,
   the better toggle flips the direction, the owner chip shows initials, rows turn into cards when the column is narrow,
   and a 4DX room has a lead or lag toggle. */
const harness = require('./harness'), client = require('./client');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/npm-tools/node_modules/playwright'); }
let pass = 0, failn = 0; const ok = (c, m) => { if (c) pass++; else { failn++; console.log('FAIL', m); } };
const wait = ms => new Promise(r => setTimeout(r, ms));
const MEASURES = [
  ['On-time delivery rate (%) across all branches and routes', '95', '91', 'Ann Lee'],
  ['New customer orders booked', '50', '62', 'Bo Diaz'],
  ['Average days to close a service ticket', '5', '9', 'Cy Ward'],
  ['Cash', '120000', '98000', 'Ann Lee'],
  ['Parts gross margin (%)', '32', '', 'Bo Diaz']
];
(async () => {
  const t = await harness.start({ mail: false });
  const org = client(t.base); await org.post('/api/admin', { a: 'login', passcode: 'admin-delta-42' });
  const people = [{ n: 'Ann Lee', lead: true }, { n: 'Bo Diaz' }, { n: 'Cy Ward' }];
  const mkRoom = async tpl => (await org.post('/api/admin', { a: 'create', template: tpl, title: 'Weekly', dates: ['2027-01-12'], start: '08:30', tz: 'America/Chicago', people })).j.room;
  const browser = await pw.chromium.launch();
  const errs = [];
  const open = async (link, vp, idx) => {
    const ctx = await harness.ctx(browser, { viewport: vp }); const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|ERR_NAME|ERR_INTERNET/.test(m.text())) errs.push(m.text()); });
    await p.goto(link); await p.waitForSelector('#agenda .sess', { state: 'attached' });
    p.scene = async () => {
      if (!(await p.locator('#agenda .sess').nth(idx).isVisible())) { await p.click('.panes [data-pane=agenda]'); await wait(150); }
      await p.locator('#agenda .sess').nth(idx).click(); await wait(300);
      if (await p.locator('.panes [data-pane=stage]').isVisible()) { await p.click('.panes [data-pane=stage]'); await wait(150); }
    };
    await p.scene(); return p;
  };
  const ids = {};
  const rowOf = (p, name) => p.locator('#mt-' + ids[name] + '-name').locator('xpath=ancestor::tr[1]');
  const idOf = async (p, name) => {
    const ids = await p.$$eval('[id^="mt-"][id$="-name"]', els => els.map(e => [e.id, e.value]));
    const f = ids.find(x => x[1] === name); return f ? f[0].replace(/^mt-/, '').replace(/-name$/, '') : null;
  };
  /* text fits: the element is not scrolled or cut, and the value's rendered width fits inside the box */
  const fits = (p, sel) => p.$eval(sel, el => {
    const cs = getComputedStyle(el), c = document.createElement('canvas').getContext('2d'); c.font = cs.font;
    const inner = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const wide = el.tagName === 'TEXTAREA' ? 0 : c.measureText(el.value).width;
    return { sw: el.scrollWidth, cw: el.clientWidth, sh: el.scrollHeight, ch: el.clientHeight, wide, inner, ov: cs.textOverflow, vis: el.getBoundingClientRect().width > 0 };
  });

  /* ---- weekly room at a 1280 laptop ---- */
  const room = await mkRoom('l10');
  const p = await open(room.people[0].link, { width: 1280, height: 800 }, 1);
  for (const m of MEASURES) {
    await p.fill('#mt-new-score', m[0]); await p.press('#mt-new-score', 'Enter'); await wait(300);
    const id = await idOf(p, m[0]); ok(!!id, 'measure added ' + m[0]);
    await p.fill('#mt-' + id + '-goal', m[1]); if (m[2]) await p.fill('#mt-' + id + '-value', m[2]);
    await p.selectOption('#mt-' + id + '-owner', { label: m[3] });
  }
  await p.locator('h1').first().click(); await wait(900);
  for (const m of MEASURES) ids[m[0]] = await idOf(p, m[0]);

  // every name is fully readable
  for (const m of MEASURES) {
    const f = await fits(p, '#mt-' + ids[m[0]] + '-name');
    ok(f.vis && f.sw <= f.cw + 1 && f.sh <= f.ch + 1 && f.wide <= f.inner + 1, 'name fully visible at 1280: ' + m[0] + ' ' + JSON.stringify(f));
    ok(await p.inputValue('#mt-' + ids[m[0]] + '-name') === m[0], 'name value intact ' + m[0]);
  }
  // the long name wraps instead of being cut
  const longH = await p.$eval('#mt-' + ids[MEASURES[0][0]] + '-name', el => el.getBoundingClientRect().width);
  ok(longH > 200, 'long name has room to read, width ' + longH);
  // goals and actuals show in full
  const g50 = '#mt-' + ids['New customer orders booked'] + '-goal';
  ok(await p.inputValue(g50) === '50', 'goal 50 value');
  for (const m of MEASURES) for (const k of ['goal', 'value']) {
    const f = await fits(p, '#mt-' + ids[m[0]] + '-' + k);
    ok(f.sw <= f.cw + 1 && f.wide <= f.inner + 1, k + ' fits for ' + m[0] + ' ' + JSON.stringify(f));
  }
  // card layout in the narrow middle column; header row hidden from sight
  const disp = await rowOf(p, 'Cash').evaluate(el => getComputedStyle(el).display);
  ok(disp === 'grid', 'row is a card (grid) at 1280, got ' + disp);
  const headH = await p.$eval('#mt-new-score', el => { const th = el.closest('.panel').querySelector('thead'); const r = th.getBoundingClientRect(); return r.height; });
  ok(headH <= 1, 'header row hidden in card mode, height ' + headH);
  // status pill: goal 5, actual 9, better when higher -> on track
  const sid = ids['Average days to close a service ticket'];
  const st = '#mt-' + sid + '-status', dir = '#mt-' + sid + '-dir';
  ok(await p.$eval(st, el => el.tagName) === 'BUTTON', 'status is a button');
  ok(/On track/.test(await p.innerText(st)), 'auto status on track: ' + await p.innerText(st));
  ok(/Click to change/.test(await p.getAttribute(st, 'aria-label')) && !/set by hand/.test(await p.getAttribute(st, 'aria-label')), 'auto aria-label ' + await p.getAttribute(st, 'aria-label'));
  // better toggle flips the direction and the status follows
  ok(await p.getAttribute(dir, 'aria-label') === 'Better when higher', 'dir starts higher');
  await p.click(dir); await wait(400);
  ok(await p.getAttribute(dir, 'aria-label') === 'Better when lower', 'dir now lower');
  ok(/Off track/.test(await p.innerText(st)), 'lower is better: 9 against 5 is off track: ' + await p.innerText(st));
  await p.click(dir); await wait(400);
  ok(await p.getAttribute(dir, 'aria-label') === 'Better when higher' && /On track/.test(await p.innerText(st)), 'dir back to higher, on track');
  // cycle auto -> on -> off -> auto
  await p.click(st); await wait(400);
  ok(await p.getAttribute(st, 'data-v') === 'on' && /On track \(set by hand\)/.test(await p.getAttribute(st, 'aria-label')), 'status set to on: ' + await p.getAttribute(st, 'aria-label'));
  await p.click(st); await wait(400);
  ok(await p.getAttribute(st, 'data-v') === 'off' && /Off track \(set by hand\)/.test(await p.getAttribute(st, 'aria-label')), 'status set to off: ' + await p.getAttribute(st, 'aria-label'));
  ok(await rowOf(p, 'Average days to close a service ticket').locator('button:has-text("To issues")').isVisible(), 'To issues shows on an off track row');
  // persists through a reload
  await wait(600); await p.reload(); await p.waitForSelector('#agenda .sess', { state: 'attached' }); await p.scene(); await wait(500);
  ok(await p.getAttribute(st, 'data-v') === 'off' && /set by hand/.test(await p.getAttribute(st, 'aria-label')), 'status override persists after reload');
  await p.click(st); await wait(400);
  ok(await p.getAttribute(st, 'data-v') === '' && /On track/.test(await p.innerText(st)), 'status back to auto: ' + await p.innerText(st));
  // a measure with no actual and no override shows a muted No status pill
  const pm = '#mt-' + ids['Parts gross margin (%)'] + '-status';
  ok(/No status/.test(await p.innerText(pm)) && await p.isVisible(pm), 'no status pill when there is no actual');
  // owner chip shows initials, overlaid select changes it
  const oid = ids['Cash'], osel = '#mt-' + oid + '-owner';
  const chip = rowOf(p, 'Cash').locator('.mt-own .mt-ini');
  ok(await chip.innerText() === 'AL', 'owner chip initials AL: ' + await chip.innerText());
  await p.selectOption(osel, { label: 'Cy Ward' }); await wait(400);
  ok(await chip.innerText() === 'CW', 'owner chip initials after change: ' + await chip.innerText());
  ok(await rowOf(p, 'Cash').locator('.mt-own').getAttribute('title') === 'Cy Ward', 'owner full name in title');
  const ov = await p.$eval(osel, el => { const a = el.getBoundingClientRect(), b = el.parentElement.querySelector('.mt-ini').getBoundingClientRect(); return { op: getComputedStyle(el).opacity, cover: a.left <= b.left + 1 && a.right >= b.right - 1 && a.top <= b.top + 1 && a.bottom >= b.bottom - 1 }; });
  ok(ov.op === '0' && ov.cover, 'owner select is overlaid on the chip ' + JSON.stringify(ov));
  await p.selectOption(osel, { index: 0 }); await wait(400);
  ok(/\+|Owner/.test(await chip.innerText()), 'empty owner chip: ' + await chip.innerText());
  await p.screenshot({ path: '/tmp/scorecard-test-1280.png' });

  /* ---- a wide stage keeps the table ---- */
  const w = await open(room.people[1].link, { width: 1024, height: 800 }, 1); await wait(2600);
  const wd = await rowOf(w, 'Cash').evaluate(el => getComputedStyle(el).display);
  ok(wd === 'table-row', 'wide stage keeps table rows, got ' + wd);
  for (const m of MEASURES) {
    const f = await fits(w, '#mt-' + ids[m[0]] + '-name');
    ok(f.vis && f.sw <= f.cw + 1 && f.sh <= f.ch + 1 && f.wide <= f.inner + 1, 'name fully visible at 1024: ' + m[0] + ' ' + JSON.stringify(f));
    const gf = await fits(w, '#mt-' + ids[m[0]] + '-goal'); ok(gf.wide <= gf.inner + 1, 'goal fits at 1024 ' + m[0]);
  }
  /* ---- large text turns the table into cards sooner ---- */
  await w.click('#bigBtn'); await wait(400);
  const bd = await rowOf(w, 'Cash').evaluate(el => getComputedStyle(el).display);
  for (const m of MEASURES) {
    const f = await fits(w, '#mt-' + ids[m[0]] + '-name');
    ok(f.vis && f.sw <= f.cw + 1 && f.sh <= f.ch + 1 && f.wide <= f.inner + 1, 'name fully visible in large text: ' + m[0]);
    const gf = await fits(w, '#mt-' + ids[m[0]] + '-goal'); ok(gf.wide <= gf.inner + 1, 'goal fits in large text ' + m[0] + ' ' + JSON.stringify(gf));
  }
  ok(bd === 'grid' || bd === 'table-row', 'large text row display ' + bd);
  await w.click('#bigBtn');

  /* ---- 4DX room: lead or lag toggle ---- */
  const room4 = await mkRoom('4dx');
  const q = await open(room4.people[0].link, { width: 1280, height: 800 }, 2);
  await q.fill('#mt-new-board', 'Qualified sales calls made'); await q.press('#mt-new-board', 'Enter'); await wait(400);
  const qid = await idOf(q, 'Qualified sales calls made'), ty = '#mt-' + qid + '-type';
  ok(await q.$eval(ty, el => el.tagName) === 'BUTTON', 'type is a toggle button');
  ok(await q.getAttribute(ty, 'data-v') === '', 'type starts empty');
  await q.click(ty); await wait(400); ok(await q.getAttribute(ty, 'data-v') === 'lead' && await q.innerText(ty) === 'Lead', 'type Lead');
  await q.click(ty); await wait(400); ok(await q.getAttribute(ty, 'data-v') === 'lag' && await q.innerText(ty) === 'Lag', 'type Lag');
  await q.click(ty); await wait(400); ok(await q.getAttribute(ty, 'data-v') === '', 'type back to empty');
  await q.click(ty); await wait(600);
  await q.reload(); await q.waitForSelector('#agenda .sess', { state: 'attached' }); await q.scene(); await wait(500);
  ok(await q.getAttribute(ty, 'data-v') === 'lead', 'type persists after reload');
  const qf = await fits(q, '#mt-' + qid + '-name'); ok(qf.sw <= qf.cw + 1 && qf.sh <= qf.ch + 1, '4dx name visible');
  await q.screenshot({ path: '/tmp/scorecard-test-4dx.png' });

  ok(!errs.length, 'no page errors ' + errs.slice(0, 3).join(' | '));
  await browser.close(); t.close();
  console.log(failn ? failn + ' FAILED' : 'ALL OK', pass, 'ok'); process.exit(failn ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
