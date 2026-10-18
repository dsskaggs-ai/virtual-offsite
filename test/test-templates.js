/* Opens every template in a real browser, visits every agenda item, and fails on any page error.
   usage: node test/test-templates.js   (needs playwright and a chromium; see README) */
const harness = require('./harness'), client = require('./client');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/npm-tools/node_modules/playwright'); }
(async () => {
  const t = await harness.start({ mail: false });
  const org = client(t.base);
  await org.post('/api/admin', { a: 'login', passcode: 'admin-delta-42' });
  const tpls = (await org.post('/api/admin', { a: 'templates' })).j.templates.map(x => x.id);
  const browser = await pw.chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
  let bad = 0; const fails = [];
  for (const id of tpls) {
    for (const look of ['field', 'cab', 'spec']) {
      for (const theme of ['light', 'dark']) {
      const r = await org.post('/api/admin', { a: 'create', template: id, title: 'T ' + id, dates: ['2027-01-12', '2027-01-13'], start: '08:30', tz: 'America/Chicago', look, theme, people: [{ n: 'Ann Lee', lead: true }, { n: 'Bo Diaz' }] });
      if (r.status !== 200) { fails.push(id + ' create ' + JSON.stringify(r.j)); bad++; continue; }
      const room = r.j.room;
      const ctx = await harness.ctx(browser, { viewport: { width: 1360, height: 900 } });
      const page = await ctx.newPage(); const errs = [];
      page.on('pageerror', e => errs.push('pageerror ' + e.message)); page.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|ERR_NAME|ERR_INTERNET/.test(m.text())) errs.push('console ' + m.text()); });
      await page.goto(room.people[0].link); await page.waitForSelector('#agenda .sess', { timeout: 10000 }).catch(e => errs.push('no agenda'));
      const n = await page.locator('#agenda .sess').count();
      for (let i = 0; i < n; i++) {
        await page.locator('#agenda .sess').nth(i).click(); await page.waitForTimeout(120);
        const len = await page.evaluate(() => (document.querySelector('#stage') || document.body).innerText.length);
        if (len < 40) errs.push('scene ' + i + ' looks empty (' + len + ')');
        if (i === 0 && look === 'field') await page.screenshot({ path: process.env.SHOTS ? process.env.SHOTS + '/' + id + '-first.png' : '/dev/null' }).catch(() => { });
      }
      if (errs.length) { bad++; fails.push(id + '/' + look + '/' + theme + ' (' + n + ' scenes): ' + [...new Set(errs)].slice(0, 6).join(' | ')); }
      else console.log('ok', id, look, theme, n + ' scenes');
      await ctx.close();
      }
    }
  }
  await browser.close(); t.close();
  fails.forEach(f => console.log('FAIL', f));
  console.log(bad ? bad + ' FAILED' : 'ALL TEMPLATES OK'); process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
