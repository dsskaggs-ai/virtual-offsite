/* The organizer console in a real browser: sign in, walk the wizard, create a room, see the links, manage it, open the room as the facilitator. */
const harness = require('./harness');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/npm-tools/node_modules/playwright'); }
let pass = 0, failn = 0; const ok = (c, m) => { if (c) pass++; else { failn++; console.log('FAIL', m); } };
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const t = await harness.start({});
  const browser = await pw.chromium.launch(); const ctx = await harness.ctx(browser, { viewport: { width: 1200, height: 900 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|ERR_NAME|ERR_INTERNET|401/.test(m.text())) errs.push(m.text()); });
  const shots = process.env.SHOTS || '/tmp';
  await p.goto(t.base + '/'); await p.fill('#p', 'wrong'); await p.click('#b'); await p.waitForSelector('#e:not(:empty)'); ok(true, 'bad passcode message');
  await p.fill('#p', 'admin-delta-42'); await p.click('#b'); await p.waitForSelector('text=Set up a new meeting');
  await p.screenshot({ path: shots + '/console-home.png' });
  await p.click('text=Set up a new meeting'); await p.waitForSelector('text=Pick a template');
  ok(await p.locator('.card').count() === 7, 'seven template cards');
  await p.click('button:text-is("Next")'); ok(await p.locator('.err[role=alert]').first().innerText() !== '', 'must pick a template');
  await p.screenshot({ path: shots + '/console-templates.png' });
  await p.locator('.card', { hasText: 'Quarterly' }).first().click(); await p.click('button:text-is("Next")');
  await p.waitForSelector('#f-title'); await p.fill('#f-title', 'Q1 planning'); await p.fill('#f-org', 'Acme'); await p.screenshot({ path: shots + '/console-details.png' });
  await p.click('button:text-is("Next")'); await p.waitForSelector('text=Add break');
  const before = await p.locator('.agi').count();
  await p.locator('.agi').first().locator('button[aria-label="Remove"]').click(); ok(await p.locator('.agi').count() === before - 1, 'remove agenda item');
  await p.fill('input[aria-label="New item title"]', 'Customer visit debrief'); await p.click('text=Add item'); ok(await p.locator('.agi').count() === before, 'add custom item');
  await p.screenshot({ path: shots + '/console-agenda.png' });
  await p.click('button:text-is("Next")'); await p.waitForSelector('#f-people');
  await p.fill('#f-people', 'Ann Lee <ann@example.com>\nbo@example.com; Cy Ng, cy@example.com\nDee'); await p.click('text=Add to the list');
  ok(await p.locator('tbody tr').count() === 4, 'four people parsed: ' + await p.locator('tbody tr').count());
  await p.screenshot({ path: shots + '/console-people.png' });
  await p.click('button:text-is("Next")'); await p.waitForSelector('text=Choose a look'); await p.click('button.look:has-text("Cab")'); await p.check('input[value="dark"]'); await p.screenshot({ path: shots + '/console-look.png' });
  await p.click('button:text-is("Next")'); await p.waitForSelector('text=Review and create'); await p.screenshot({ path: shots + '/console-review.png' });
  await p.click('button:text-is("Create the room")'); await wait(1500); await p.waitForSelector('text=The room is ready');
  await p.screenshot({ path: shots + '/console-created.png' });
  ok(t.mails.length === 3, 'three emails sent (one person has none): ' + t.mails.length);
  ok(await p.locator('.big-code').first().innerText() !== '', 'room code shown');
  const links = await p.locator('table a, table code, table input').count(); ok(links > 0, 'links visible in people table');
  // open the room as Ann using her emailed link
  const alink = t.mails[0].body.html.match(/https?:\/\/[^"'<\s]+\/r\/[^"'<\s]+/)[0].replace(/&amp;/g, '&');
  const rp = await ctx.newPage(); await rp.goto(alink); await rp.waitForSelector('#agenda .sess'); ok(await rp.locator('html').getAttribute('data-look') === 'cab', 'room uses the Cab look');
  ok((await rp.innerText('#agenda')).includes('Customer visit debrief'), 'custom agenda item is in the room');
  ok(!(await rp.innerText('#agenda')).includes('Open and set the ground rules'), 'removed item is gone');
  await rp.close();
  // manage
  await p.click('text=Manage this room'); await p.waitForSelector('text=Delete this room'); await p.screenshot({ path: shots + '/console-manage.png' });
  await p.click('text=Close the room'); await p.waitForSelector('text=Reopen the room'); await p.click('text=Reopen the room'); await p.waitForSelector('text=Close the room');
  await p.click('text=Email everyone again'); await wait(600); ok(t.mails.length === 6, 'resent: ' + t.mails.length);
  await p.click('#homeBtn'); await p.waitForSelector('.room'); ok(await p.locator('.room').count() === 1, 'room listed on home');
  // phone width
  await p.setViewportSize({ width: 390, height: 800 }); await p.screenshot({ path: shots + '/console-phone.png' });
  const sw = await p.evaluate(() => document.documentElement.scrollWidth); ok(sw <= 392, 'no sideways scroll on a phone: ' + sw);
  ok(!errs.length, 'no page errors: ' + errs.join(' | '));
  await browser.close(); t.close();
  console.log(failn ? failn + ' FAILED' : 'ALL OK', pass, 'ok'); process.exit(failn ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
