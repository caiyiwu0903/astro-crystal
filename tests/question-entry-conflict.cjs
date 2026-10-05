const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 375, height: 812 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => { window.AstroCardsPreview = { disableStatistics: true }; });
    await page.route('**/*', route => route.request().url().startsWith('http://127.0.0.1:4173/') ? route.continue() : route.abort());
    const love = '他明明每天找我聊天，但又說只把我當朋友，我們有沒有可能在一起？';
    const cases = [
      ['A-system', 'career', love, true, 'love', 'direction', false],
      ['A-keep', 'career', love, true, 'career', 'direction', true],
      ['B', 'love', love, false, 'love', 'direction', false],
      ['C', 'career', '我最近工作很累，要不要離職？', false, 'career', 'decision', false],
      ['D', 'career', '男朋友最近想換工作，他適合換嗎？', false, 'career', 'decision', false],
      ['E', 'daily', '我們有沒有可能在一起？', false, 'love', 'direction', false]
    ];
    for (const [name, mode, question, conflict, topic, intent, keep] of cases) {
      await page.goto(`http://127.0.0.1:4173/astro-cards.html?mode=${mode}`);
      await page.locator('#cards-input').fill(question);
      await page.locator('#cards-draw').click();
      assert.equal(await page.locator('#question-conflict').isVisible(), conflict, name);
      assert.equal(await page.locator(`input[name="mode"][value="${mode}"]`).isChecked(), true);
      assert.ok(await page.locator('#cards-result').isHidden());
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.locator(keep ? '#question-keep-entry' : '#question-start').click();
      await page.waitForFunction(() => document.querySelector('#cards-form').getAttribute('aria-busy') === 'false');
      const result = await page.evaluate(() => AstroQuestionContext.getConfirmed());
      assert.equal(result.primaryTopic, topic, name); assert.equal(result.intent, intent, name);
      await page.locator('#cards-draw').click();
      assert.ok(await page.locator('#question-conflict').isHidden(), 'remember choice');
      console.log(`PASS ${name}: ${topic} + ${intent}`);
    }
    await page.goto('http://127.0.0.1:4173/astro-cards.html?mode=career');
    await page.locator('#cards-draw').click();
    await page.waitForFunction(() => document.querySelector('#cards-form').getAttribute('aria-busy') === 'false');
    assert.ok(await page.locator('#question-confirmation').isHidden());
    assert.equal(await page.evaluate(() => AstroQuestionContext.getConfirmed()), null);
    assert.equal(await page.locator('#cards-spread article').count(), 3);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
