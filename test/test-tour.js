/* First-visit tours: the organizer console, the facilitator's room, and a participant's room.
   Uses plain browser contexts, so nothing is pre-marked as seen. */
const harness = require('./harness'), client = require('./client');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/npm-tools/node_modules/playwright'); }
let pass = 0, failn = 0; const ok = (c, m) => { if (c) pass++; else { failn++; console.log('FAIL', m); } };
const wait = ms => new Promise(r => setTimeout(r, ms));
const inView = async (p, sel) => p.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1; }, sel);
async function walk(p) { // click Next to the end, return the step titles
  const titles = [];
  for (let i = 0; i < 20; i++) {
    await p.waitForSelector('.tour-card'); await wait(120);
    titles.push(await p.innerText('.tour-h'));
    if (!(await inView(p, '.tour-card'))) titles.push('OFFSCREEN:' + titles[titles.length - 1]);
    const last = (await p.innerText('.tour-actions .pri')) === 'Done';
    await p.click('.tour-actions .pri'); if (last) break;
  }
  return titles;
}
(async () => {
  for (const viewportCase of [0]) {
    const t = await harness.start({ mail: false });
    const org = client(t.base); await org.post('/api/admin', { a: 'login', passcode: 'admin-delta-42' });
    const r = await org.post('/api/admin', { a: 'create', template: 'l10', title: 'Weekly', dates: ['2027-01-12'], start: '08:30', tz: 'America/Chicago', people: [{ n: 'Ann Lee', lead: true }, { n: 'Bo Diaz' }] });
    const room = r.j.room; const browser = await pw.chromium.launch();
    const open = async (link, vp) => { const c = await browser.newContext({ viewport: vp || { width: 1360, height: 900 } }); const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); await p.goto(link); return p; };
    const tag = '';

    // facilitator
    let p = await open(room.people[0].link);
    await p.waitForSelector('.tour-card', { timeout: 8000 }); ok(true, tag + 'facilitator tour appears by itself');
    ok(/Welcome to Weekly/.test(await p.innerText('.tour-h')), tag + 'welcome names the room');
    ok(await p.locator('.tour-hole').evaluate(e => e.style.display) === 'none', tag + 'welcome has no spotlight');
    await p.keyboard.press('ArrowRight'); await wait(300);
    ok(/The agenda/.test(await p.innerText('.tour-h')), tag + 'arrow key moves on');
    const hb = await p.locator('.tour-hole').boundingBox(), ab = await p.locator('#agenda').boundingBox();
    ok(hb.x <= ab.x + 1 && hb.y <= ab.y + 1 && hb.x + hb.width >= ab.x + ab.width - 1 && hb.y + hb.height >= ab.y + ab.height - 1 && hb.width < ab.width + 12, tag + 'spotlight sits on the agenda');
    await p.keyboard.press('Shift+Tab'); ok(await p.evaluate(() => !!document.activeElement.closest('.tour-card')), tag + 'focus stays in the card');
    let blocked = false; await p.click('#bigBtn', { timeout: 800, trial: true }).catch(() => { blocked = true; }); ok(blocked, tag + 'page behind is blocked while the tour runs');
    await p.keyboard.press('ArrowLeft'); await wait(200); ok(/Welcome/.test(await p.innerText('.tour-h')), tag + 'back works');
    const titles = await walk(p);
    ok(titles.includes('Leading the room') && titles.includes('Room code and next session') && titles.includes('The decision log'), tag + 'facilitator steps: ' + titles.join(' | '));
    ok(!titles.some(x => /OFFSCREEN/.test(x)), tag + 'card stays on screen: ' + titles.filter(x => /OFFSCREEN/.test(x)).join(','));
    ok(!(await p.locator('.tour').count()), tag + 'tour closes after Done');
    ok(await p.evaluate(() => document.getElementById('app').dataset.pane) === 'stage', tag + 'pane restored');
    await p.reload(); await wait(2500); ok(!(await p.locator('.tour').count()), tag + 'does not show again');
    await p.click('#helpBtn'); await p.waitForSelector('.tour-card'); ok(true, tag + 'Tutorial button replays it');
    await p.keyboard.press('Escape'); await wait(200); ok(!(await p.locator('.tour').count()), tag + 'Escape closes');
    ok(await p.locator('#bigBtn').click({ timeout: 800 }).then(() => true, () => false), tag + 'page works again');
    ok(!p.errs.length, tag + 'no page errors ' + p.errs.join('|'));
    await p.context().close();

    // participant
    p = await open(room.people[1].link); await p.waitForSelector('.tour-card', { timeout: 8000 });
    const mt = await walk(p);
    ok(mt.includes('Following the presenter') && !mt.some(x => /Room code|Next session/.test(x)) && !mt.includes('Leading the room'), tag + 'participant steps: ' + mt.join(' | '));
    ok(!mt.some(x => /OFFSCREEN/.test(x)), tag + 'participant card on screen');
    await p.context().close();

    // phone width: agenda and log live in other panes
    p = await open(room.people[1].link, { width: 390, height: 780 }); await p.waitForSelector('.tour-card', { timeout: 8000 });
    const pt = []; for (let i = 0; i < 20; i++) { await wait(150); pt.push(await p.innerText('.tour-h')); if (!(await inView(p, '.tour-card'))) pt.push('OFFSCREEN:' + pt[pt.length - 1]); const sel = await p.evaluate(() => { const h = document.querySelector('.tour-hole'); return h && h.style.display !== 'none' ? Math.round(h.getBoundingClientRect().width) : 0; }); if (pt[pt.length - 1] === 'The agenda') ok(sel > 100, tag + 'phone: agenda pane opened and spotlighted (' + sel + 'px)'); const last = (await p.innerText('.tour-actions .pri')) === 'Done'; await p.click('.tour-actions .pri'); if (last) break; }
    ok(!pt.some(x => /OFFSCREEN/.test(x)), tag + 'phone card stays on screen: ' + pt.filter(x => /OFFSCREEN/.test(x)).join(','));
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), tag + 'phone: no sideways scroll');
    await p.context().close();

    // console
    const c = await browser.newContext({ viewport: { width: 1200, height: 900 } }); p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
    await p.goto(t.base + '/'); await p.fill('#p', 'admin-delta-42'); await p.click('#b');
    await p.waitForSelector('.tour-card', { timeout: 8000 }); ok(/Welcome to Virtual Offsite/.test(await p.innerText('.tour-h')), tag + 'console tour appears on first sign-in');
    const ct = await walk(p);
    ok(ct.length === 5 && ct.includes('Start here') && ct.includes('How people join'), tag + 'console steps: ' + ct.join(' | '));
    ok(!ct.some(x => /OFFSCREEN/.test(x)), tag + 'console card on screen');
    await p.click('#helpBtn'); await p.waitForSelector('.tour-card'); for (let i = 0; i < 4; i++) await p.click('.tour-actions .pri');
    ok(/personal link/.test(await p.innerText('.tour-b')), 'join step explains personal links');
    await p.keyboard.press('Escape');
    await p.reload(); await wait(1800); ok(!(await p.locator('.tour').count()), tag + 'console tour does not repeat');
    await p.click('text=Set up a new meeting'); await p.waitForSelector('text=Pick a template'); ok(true, tag + 'console usable after the tour');
    ok(!p.errs.length, tag + 'console no errors ' + p.errs.join('|'));
    await p.screenshot({ path: (process.env.SHOTS || '/tmp') + '/tour-done.png' });
    await browser.close(); t.close();
  }
  console.log(failn ? failn + ' FAILED' : 'ALL OK', pass, 'ok'); process.exit(failn ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
