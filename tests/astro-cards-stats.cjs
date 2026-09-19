const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 375, height: 812 }, reducedMotion: 'reduce' });
    let count = 1588, fail = false;
    const ids = new Set(), payloads = [];
    await context.route('**/rest/v1/rpc/*astro_card*', async route => {
      const body = route.request().postDataJSON();
      if (route.request().url().endsWith('record_astro_card_participant')) {
        payloads.push(body);
        if (!ids.has(body.p_visitor_id)) { ids.add(body.p_visitor_id); count++; }
      }
      if (fail) { await route.fulfill({ status: 503, body: '{}' }); return; }
      await route.fulfill({ json: count });
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const start = 'http://127.0.0.1:4173/astro-cards.html?mode=career&what=P07&how=S01&where=H10';
    await page.goto(start);
    await page.waitForFunction(() => document.querySelector('#cards-participant-count').textContent === '1,588');
    assert.equal(payloads.length, 0); // A restored share URL is not a draw.
    await page.locator('#cards-input').fill('私人問題');
    await page.locator('#cards-draw').click();
    await page.waitForFunction(() => document.querySelector('#cards-participant-count').textContent === '1,589');
    await page.locator('#cards-draw').click();
    await page.waitForFunction(() => document.querySelector('#cards-form').getAttribute('aria-busy') === 'false');
    assert.equal(payloads.length, 1);
    assert.deepEqual(Object.keys(payloads[0]), ['p_visitor_id']);
    await page.reload();
    await page.locator('#cards-draw').click();
    await page.waitForFunction(() => document.querySelector('#cards-form').getAttribute('aria-busy') === 'false');
    await page.waitForFunction(() => document.querySelector('#cards-participant-count').textContent === '1,589');
    assert.equal(ids.size, 1);
    // The next response fails after acceptance; retry must reuse the identifier.
    await page.evaluate(() => localStorage.clear());
    fail = true;
    await page.reload();
    await page.waitForFunction(() => document.querySelector('#cards-participant-count').textContent === '暫時無法讀取');
    await page.locator('#cards-draw').click();
    await page.waitForFunction(() => document.querySelector('#cards-form').getAttribute('aria-busy') === 'false');
    assert.equal(await page.locator('#cards-spread article').count(), 3);
    // Await the failed request before the next draw, without touching production.
    await page.waitForTimeout(100);
    fail = false;
    await page.locator('#cards-draw').click();
    await page.waitForFunction(() => document.querySelector('#cards-participant-count').textContent === '1,590');
    assert.equal(ids.size, 2);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.deepEqual(errors, []);
    await context.close();
    console.log('PASS: initial read, draw-only event, stable browser ID, deduplication, privacy, retry and mobile layout (mock backend).');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
