const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:4173/astro-cards.html?mode=love');
    await page.locator('#cards-input').fill('我該換工作嗎？');
    await page.locator('#cards-draw').click();
    assert.equal(await page.locator('#cards-mode-hint').isVisible(), true);
    assert.equal(await page.locator('#cards-result').isVisible(), false);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.locator('#cards-mode-keep').click();
    assert.equal(new URL(page.url()).searchParams.get('mode'), 'love');
    await page.locator('#cards-draw').click();
    assert.equal(await page.locator('#cards-mode-hint').isVisible(), false);
    await page.locator('#cards-input').fill('我想轉職');
    await page.locator('#cards-draw').click();
    await page.locator('#cards-mode-switch').click();
    assert.equal(new URL(page.url()).searchParams.get('mode'), 'career');
    assert.equal(await page.locator('input[value="career"]').isChecked(), true);
    assert.ok((await page.locator('#cards-asked').textContent()).includes('轉職'));
    await page.locator('#cards-input').fill('我喜歡同事，該告白嗎？');
    await page.locator('#cards-draw').click();
    assert.ok((await page.locator('#cards-mode-switch').textContent()).includes('感情占卜'));
    await page.locator('#cards-input').fill('我該如何選擇？');
    assert.equal(await page.locator('#cards-mode-hint').isVisible(), false);
    await page.locator('#cards-draw').click();
    assert.equal(await page.locator('#cards-mode-hint').isVisible(), false);
    assert.equal(new URL(page.url()).searchParams.get('mode'), 'career');
    assert.deepEqual(errors, []);
    console.log('PASS: mismatch prompt, keep/switch, no repeated nag, edits reset, ambiguous input and mobile layout.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
