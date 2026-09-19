// Requires an externally installed Playwright; no npm/build changes to this site.
// Serve the repo on http://127.0.0.1:4173, then node tests/astro-cards-browser.cjs.
const { chromium, webkit } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.CARDS_TEST_URL || 'http://127.0.0.1:4173';
const errors = [];
async function run(type, options, name) {
  const browser = await type.launch(options);
  try {
    for (const width of [375, 390, 414, 430, 960, 1024, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: width < 500, hasTouch: width < 500 });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(name + ': ' + error.message));
      page.on('console', msg => { if (msg.type() === 'error') errors.push(name + ': ' + msg.text()); });
      await page.goto(base + '/astro-cards.html');
      assert.equal(await page.locator('#cards-result').isVisible(), false);
      await page.locator('#cards-draw').click();
      await page.waitForFunction(() => document.querySelector('#cards-form').getAttribute('aria-busy') !== 'true');
      assert.equal(await page.locator('#cards-spread article').count(), 3);
      for (const mode of ['love', 'career', 'daily']) {
        await page.locator(`input[value="${mode}"] + span`).click();
        await page.waitForURL(url => url.searchParams.get('mode') === mode);
        assert.equal(new URL(page.url()).searchParams.get('mode'), mode);
        assert.ok(await page.locator('#cards-title').textContent());
      }
      const url = page.url();
      const reading = await page.locator('.astro-cards__reading').textContent();
      await page.reload();
      assert.equal(await page.locator('.astro-cards__reading').textContent(), reading);
      assert.equal(page.url(), url);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), name + ' overflow ' + width);
      if (width <= 960) {
        await page.locator('.nav__toggle').click();
        assert.equal(await page.locator('.nav__toggle').getAttribute('aria-expanded'), 'true');
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        await page.locator('.nav__toggle').click();
      }
      // Clipboard and native sharing are controlled stubs; OS share sheets require a real device.
      await page.evaluate(() => {
        window.copied = '';
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.copied = text; } } });
      });
      await page.locator('#cards-copy').click();
      assert.ok((await page.evaluate(() => window.copied)).includes('放心提醒：'));
      await page.locator('#cards-copy-url').click();
      assert.equal(await page.evaluate(() => window.copied), url);
      await page.evaluate(() => { Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }); });
      await page.locator('#cards-share').click();
      assert.equal(await page.evaluate(() => window.copied), url);
      await page.evaluate(() => {
        Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
        Object.defineProperty(navigator, 'share', { configurable: true, value: async payload => { window.shared = payload; } });
      });
      await page.locator('#cards-share').click();
      assert.equal(await page.evaluate(() => window.shared.url), url);
      await page.evaluate(() => { Object.defineProperty(navigator, 'share', { configurable: true, value: async () => { throw new DOMException('cancel', 'AbortError'); } }); });
      await page.locator('#cards-share').click();
      assert.equal(await page.locator('#cards-share-status').textContent(), '已取消分享。');
      await page.evaluate(() => {
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('denied'); } } });
        document.execCommand = () => false;
      });
      await page.locator('#cards-copy-url').click();
      assert.equal(await page.locator('#cards-manual-text').inputValue(), url);
      assert.equal(await page.locator('#cards-manual').isVisible(), true);
      await page.goto(base + '/astro-cards.html?mode=love&what=P04&how=S06&where=H07');
      assert.deepEqual(await page.locator('#cards-spread h3').allTextContents(), ['金星', '處女', '第七宮']);
      if (width === 390) {
        fs.mkdirSync('tmp/astro-cards-qa', { recursive: true });
        await page.screenshot({ path: `tmp/astro-cards-qa/${name}-390.png`, fullPage: true });
      }
      await page.goto(base + '/astro-cards.html?mode=love&what=P99&how=S06&where=H07');
      assert.equal(await page.locator('#cards-result').isVisible(), false);
      assert.ok((await page.locator('#cards-status').textContent()).includes('無效'));
      await page.goto(base + '/index.html');
      assert.equal(await page.locator('a[href="astro-cards.html"]').count(), 2);
      assert.ok((await page.locator('h1').textContent()).includes('讀懂你的人生地圖'));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await context.close();
    }
  } finally { await browser.close(); }
  console.log(`PASS ${name}: 7 viewport widths, modes, draw, URL replay, nav, share/copy fallbacks, invalid URL, homepage.`);
}
(async () => {
  await run(chromium, { channel: 'chrome', headless: true }, 'chromium');
  if (process.env.CARDS_TEST_WEBKIT === '1') await run(webkit, { headless: true }, 'webkit');
  assert.deepEqual(errors, []);
  console.log('PASS: no JavaScript or console errors.');
})().catch(error => { console.error(error); process.exitCode = 1; });
