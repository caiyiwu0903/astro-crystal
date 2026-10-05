const assert = require('node:assert/strict');
require('../assets/js/question-classifier.js');
const { classify, config, describe } = globalThis.QuestionClassifier;
for (const [topic, item] of Object.entries(config.topics)) for (const { keyword } of item.keywords) {
  assert.ok(classify(keyword).scores[topic] > 0, `${topic}: ${keyword}`);
}
for (const [intent, item] of Object.entries(config.intents)) for (const { keyword } of item.keywords) assert.equal(classify(keyword).intent, intent);
for (const [time, item] of Object.entries(config.times)) for (const { keyword } of item.keywords) assert.equal(classify(keyword).timeContext, time);
assert.deepEqual(classify('???'), { primaryTopic: 'general', secondaryTopic: null, intent: 'general', timeContext: 'general', scores: { love: 0, career: 0, money: 0, relationship: 0, self: 0 } });
assert.equal(classify('目前要不要離職，如何和同事討論').primaryTopic, 'career');
assert.equal(classify('目前要不要離職，如何和同事討論').secondaryTopic, 'relationship');
assert.equal(classify('目前要不要離職，如何和同事討論').intent, 'decision');
assert.equal(classify('如何理解他對我，最近他怎麼想').intent, 'other');
assert.equal(classify('為什麼會這樣，如何改善').intent, 'reason');
assert.equal(classify('如何改善，為什麼會這樣').intent, 'reason');
assert.deepEqual(classify('工作工作工作'), classify('工作'));
assert.equal(classify('男朋友').secondaryTopic, null);
assert.equal(classify('可愛的貓').primaryTopic, 'general');
assert.equal(classify('今天想聊聊未來').timeContext, 'today');
assert.equal(classify('目前接下來怎麼安排').timeContext, 'future');
assert.equal(describe(classify('你好')).sentence, config.openSentence);
assert.equal(describe(classify('工作'), true).heading, config.manualHeading);
const regressionCases = [
  ['他還喜歡我嗎？', 'love', 'other'],
  ['她對我有沒有意思？', 'love', 'other'],
  ['男朋友最近想換工作，他適合換嗎？', 'career', 'decision'],
  ['前任欠我的錢，我要不要跟他要？', 'money', 'decision'],
  ['同事跟我告白，我要不要接受？', 'love', 'decision'],
  ['朋友欠錢不還，我該怎麼辦？', 'money', 'action'],
  ['我為什麼每次上班都很累？', 'career', 'reason'],
  ['最近一直存不到錢怎麼辦？', 'money', 'action'],
  ['我喜歡主管，他對我有意思嗎？', 'love', 'other'],
  ['我最近不知道人生要往哪裡走', 'self', 'state']
];
for (const [question, topic, intent] of regressionCases) {
  const result = classify(question);
  assert.equal(result.primaryTopic, topic, question);
  assert.equal(result.intent, intent, question);
}
const tied = classify('男友、前任與愛，還有換工作');
assert.equal(tied.scores.love, tied.scores.career);
assert.equal(tied.primaryTopic, 'career');
assert.equal(tied.secondaryTopic, 'love');
assert.equal(classify('男友與工作').primaryTopic, 'love');
assert.deepEqual(classify('換工作換工作'), classify('換工作'));
assert.equal(classify('零錢包').primaryTopic, 'general');
console.log('PASS: existing rules, 10 v1.1 regression cases, focus tie-break, stable fallback, repeat handling and broad-word guard.');
