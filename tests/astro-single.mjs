import assert from 'node:assert/strict';
import { createHandler, drawCard } from '../server/astro-single.mjs';
const core = globalThis.AstroSingleCore;
assert.equal(core.deck().length, 36);
assert.equal(new Set(core.deck().map(card => card.id)).size, 36);
assert.equal(core.followupFor('想換工作，不知道怎麼決定').id, 'leave');
assert.equal(core.followupFor('我喜歡同事，要怎麼更靠近？').id, 'crush');
assert.equal(core.followupFor('離職也想分手，怎麼辦？'), null);
assert.equal(core.followupFor('面試的自我介紹怎麼準備？'), null);
assert.equal(core.characters('👨‍👩‍👧‍👦').length, 1);
assert.throws(() => core.selection('想換工作', 'leave', 'bogus'));
for (const item of core.followups) for (const option of item.options) assert.equal(option.length, 3);
for (const card of core.deck()) assert.ok(Object.values(core.example('如何安排今天？', null, card)).every(Boolean));
const drawn = drawCard();
assert.ok(core.deck().some(card => card.id === drawn.id));
const request = (body, origin = 'http://localhost:4174') => new Request('http://localhost/api/astro-single', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify(body) });
const handler = createHandler({ origins: ['http://localhost:4174'] });
let response = await handler(request({ question: '想換工作', followupId: 'leave', choiceId: 'direction' }));
assert.equal(response.status, 200);
assert.equal((await response.json()).source, 'demo');
for (const body of [{ question: '' }, { question: '字'.repeat(51) }, { question: 'hello', card: 'P01' }, { question: '想換工作', followupId: 'leave', choiceId: 'bad' }, { question: 'x'.repeat(5000) }]) {
  assert.equal((await handler(request(body))).status, 400);
}
assert.equal((await handler(request({ question: '今天如何？' }, 'https://other.example'))).status, 403);
let sent;
const ai = createHandler({ demo: false, apiKey: 'test-not-a-key', model: 'test-model', origins: ['http://localhost:4174'],
  fetchImpl: async (url, options) => {
    sent = JSON.parse(options.body);
    return Response.json({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify(core.example('想換工作', null, core.deck()[0])) }] }] });
  } });
assert.equal((await ai(request({ question: '想換工作' }))).status, 400);
response = await ai(request({ question: '想換工作', consent: true }));
assert.equal((await response.json()).source, 'ai');
assert.equal(sent.store, false);
assert.equal(sent.text.format.strict, true);
assert.equal(JSON.parse(sent.input).question, '想換工作');
assert.equal((await createHandler({ demo: false, origins: ['http://localhost:4174'] })(request({ question: '你好' }))).status, 503);
for (const value of [{ status: 'incomplete' }, { status: 'completed', output: [{ content: [{ type: 'output_text', text: '{}' }] }] }]) {
  const fail = createHandler({ demo: false, apiKey: 'test', model: 'test', origins: ['http://localhost:4174'], fetchImpl: async () => Response.json(value) });
  assert.equal((await fail(request({ question: '今天如何？', consent: true }))).status, 502);
}
const limited = createHandler({ origins: ['http://localhost:4174'] });
for (let i = 0; i < 10; i++) assert.equal((await limited(request({ question: '今天如何？' }))).status, 200);
assert.equal((await limited(request({ question: '今天如何？' }))).status, 429);
console.log('PASS: 36 cards, follow-up rules, grapheme counting, validation, consent, demo, mocked OpenAI, failures and preview rate limit. No live AI calls.');
