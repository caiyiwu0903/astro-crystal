// Use an external Playwright installation and the local server on port 4173.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:4173/astro-cards.html?mode=career&what=P07&how=S01&where=H10');
    const input = page.locator('#cards-input');
    await input.fill('字'.repeat(51));
    assert.equal((await input.inputValue()).length, 50);
    await input.fill('我想換工作但怕不適應');
    await page.locator('#cards-update').click();
    const reading = await page.locator('#cards-paragraphs').textContent();
    assert.ok(reading.includes('轉換工作的選擇'));
    assert.ok(!page.url().includes('question'));
    assert.deepEqual(await page.locator('#cards-spread h3').allTextContents(), ['土星', '牡羊', '第十宮']);
    await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.copied = text; } } }); });
    await page.locator('#cards-copy').click();
    assert.ok((await page.evaluate(() => window.copied)).includes('我的問題：我想換工作但怕不適應'));
    await page.locator('#cards-copy-url').click();
    assert.ok(!(await page.evaluate(() => window.copied)).includes('換工作'));
    await input.fill('<img src=x onerror=alert(1)>');
    await page.locator('#cards-update').click();
    assert.equal(await page.locator('#cards-paragraphs img').count(), 0);
    await input.fill('');
    await page.locator('#cards-update').click();
    assert.equal(await page.locator('#cards-asked').isVisible(), false);
    await input.fill('我想換工作');
    await page.locator('#cards-draw').click();
    assert.ok((await page.locator('#cards-asked').textContent()).includes('換工作'));
    await page.reload();
    assert.equal(await input.inputValue(), '');
    assert.equal(await page.locator('#cards-asked').isVisible(), false);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.deepEqual(errors, []);
    console.log('PASS: question limit, contextual reading, stable cards, copy privacy, safe text, reset and mobile layout.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
