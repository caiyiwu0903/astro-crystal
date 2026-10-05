const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const sandbox = vm.createContext({ window: {}, URL, URLSearchParams });
for (const name of ['astro-cards-data', 'astro-cards-engine', 'question-classifier', 'astro-cards-context']) {
  vm.runInContext(fs.readFileSync(`assets/js/${name}.js`, 'utf8'), sandbox);
}
const { AstroCardsEngine: engine, AstroCardsContext: layer, QuestionClassifier: classifier, AstroCardsData: data } = sandbox.window;
const sample = { mode: 'daily', what: 'P07', how: 'S04', where: 'H07' };
const cases = [
  ['他還喜歡我嗎？', 'love', 'other'], ['我該不該離職？', 'career', 'decision'],
  ['最近一直存不到錢怎麼辦？', 'money', 'action'], ['我跟媽媽為什麼一直吵架？', 'relationship', 'reason'],
  ['我最近不知道人生要往哪裡走', 'self', 'state']
];
for (const [question, topic, intent] of cases) {
  const context = classifier.classify(question);
  assert.equal(context.primaryTopic, topic); assert.equal(context.intent, intent);
  const result = layer.interpret(sample, question, context);
  assert.deepEqual(result.reading.paragraphs, engine.interpret(sample).paragraphs);
  assert.equal(result.sections[0].title, layer.topics[topic].title);
  assert.equal(result.sections[1].title, layer.intents[intent].title);
  assert.ok(layer.text(sample, 'https://example.com/', question, context).includes(result.sections[1].text));
}
for (const topic of [...Object.keys(layer.topics), 'general']) for (const intent of [...Object.keys(layer.intents), 'general']) {
  const context = { primaryTopic: topic, intent, timeContext: 'today' };
  const result = layer.interpret(sample, '問題', context);
  assert.deepEqual(result.reading.paragraphs, engine.interpret(sample).paragraphs);
  assert.equal(result.sections.length, Number(topic !== 'general') + Number(intent !== 'general'));
  assert.deepEqual(result, layer.interpret(sample, '問題', { ...context, timeContext: 'future' }));
  assert.doesNotMatch(result.sections.map(section => section.text).join(''), /一定|注定|必然|他其實還愛你|他現在很想你/);
}
for (const mode of Object.keys(data.modes)) for (const what of data.what) for (const how of data.how) for (const where of data.where) {
  const selection = { mode, what: what.id, how: how.id, where: where.id };
  const original = engine.interpret(selection);
  assert.deepEqual(layer.interpret(selection).reading, original);
  const result = layer.interpret(selection, '問題', { primaryTopic: 'career', intent: 'decision' });
  assert.deepEqual(result.reading.paragraphs, original.paragraphs);
  assert.equal(result.reading.reminder, original.reminder);
  assert.equal(result.reading.question, original.question);
}
assert.deepEqual(layer.interpret(sample, '', { primaryTopic: 'love', intent: 'other' }).reading, engine.interpret(sample));
assert.equal(layer.text(sample, 'https://example.com/'), engine.text(sample, 'https://example.com/'));
console.log('PASS: requested cases, 42 topic/intent combinations, unchanged 5184 core/no-question readings, time ignored, safe lenses and copied text.');
