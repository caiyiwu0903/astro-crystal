// Run with: node tests/astro-cards-engine.cjs (no dependencies).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const context = vm.createContext({ window: {}, URL, URLSearchParams });
for (const file of ['data', 'engine']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets/js/astro-cards-' + file + '.js'), 'utf8'), context);
const { AstroCardsData: data, AstroCardsEngine: engine } = context.window;
for (const type of ['what', 'how', 'where']) {
  assert.equal(data[type].length, 12);
  assert.equal(new Set(data[type].map(card => card.id)).size, 12);
  for (const card of data[type]) {
    assert.equal(card.card_image_key, card.id);
    assert.equal(typeof card.card_image_url, 'string');
    for (const [key, value] of Object.entries(card)) if (key !== 'card_image_url') assert.ok(value);
  }
}
let count = 0;
for (const mode of Object.keys(data.modes)) {
  for (const what of data.what) for (const how of data.how) for (const where of data.where) {
    const selection = { mode, what: what.id, how: how.id, where: where.id };
    const reading = engine.interpret(selection);
    assert.equal(reading.cards.length, 3);
    assert.equal(reading.paragraphs.length, 3);
    const url = engine.url(selection, 'https://example.com/astro-cards.html?unrelated=1#old');
    assert.equal(new URL(url).hash, '');
    assert.equal(new URL(url).searchParams.has('unrelated'), false);
    assert.deepEqual(engine.readQuery(new URL(url).search).selection, vm.runInContext('(' + JSON.stringify(selection) + ')', context));
    assert.equal(JSON.stringify(engine.interpret(engine.readQuery(new URL(url).search).selection)), JSON.stringify(reading));
    const text = engine.text(selection, url);
    assert.ok(text.includes(url));
    assert.doesNotMatch(text, /undefined|null|一定|注定|必然|第三者|疾病|死亡|懷孕|財富保證/);
    count++;
  }
  assert.equal(engine.draw(mode, () => 0).what, 'P01');
  assert.equal(engine.draw(mode, () => 0.99999).where, 'H12');
}
for (const query of ['?what=P01', '?mode=love&what=P99&how=S01&where=H01', '?mode=__proto__', '?mode=constructor', '?mode=daily&mode=love', '?mode=love&what=S01&how=P01&where=H01', '?mode=love&what=P01&how=S01&where=H01&where=H02']) {
  assert.equal(engine.readQuery(query).invalid, true, query);
  assert.equal(engine.readQuery(query).selection, null, query);
}
assert.equal(engine.readQuery('').invalid, false);
assert.equal(engine.readQuery('?mode=love').mode, 'love');
assert.equal(engine.readQuery('?mode=love').invalid, false);
assert.throws(() => engine.interpret({ mode: 'love' }));
assert.equal(engine.suggestMode('我該換工作嗎？', 'love'), 'career');
assert.equal(engine.suggestMode('我喜歡同事，該告白嗎？', 'career'), 'love');
assert.equal(engine.suggestMode('我喜歡同事，該告白嗎？', 'love'), null);
assert.equal(engine.suggestMode('我想轉職，也想和男友結婚', 'daily'), null);
assert.equal(engine.suggestMode('我該如何選擇？', 'career'), null);
assert.equal(engine.suggestMode('', 'love'), null);
assert.equal(engine.suggestMode('我該換工作嗎？', 'career'), null);
const sample = { mode: 'career', what: 'P07', how: 'S01', where: 'H10' };
const personal = engine.interpret(sample, '我想換工作但怕不適應');
assert.ok(personal.paragraphs.every(p => p.includes('轉換工作的選擇')));
assert.notEqual(personal.paragraphs[1], engine.interpret(sample, '如何和主管溝通').paragraphs[1]);
assert.notEqual(personal.paragraphs[1], engine.interpret({ ...sample, mode: 'love' }, '我想主動告白').paragraphs[1]);
assert.equal(engine.limitQuestion('字'.repeat(60)).length, 50);
assert.equal(Array.from(engine.limitQuestion('😀'.repeat(51))).length, 50);
assert.equal(engine.interpret(sample, '  ').asked, '');
assert.ok(engine.text(sample, 'https://example.com/', '我想換工作').includes('我的問題：我想換工作'));
assert.equal(new URL(engine.url({ ...sample, question: 'private' }, 'https://example.com/?question=private')).searchParams.has('question'), false);
console.log(`PASS: ${count} readings (1,728 combinations × 3 modes), stable URL round trips, data completeness and invalid input handling.`);
