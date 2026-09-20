(function () {
  'use strict';
  const core = window.AstroSingleCore;
  const $ = id => document.getElementById(id);
  const form = $('single-form'), input = $('single-input'), result = $('single-result');
  const submit = $('single-submit'), status = $('single-status');
  const endpoint = window.AstroSingleEndpoint || '/api/astro-single';
  let service = null, followup = null, stage = 'question', controller = null, run = 0;

  function limit() {
    input.value = core.characters(input.value).slice(0, 50).join('');
    $('single-count').textContent = `${core.characters(input.value).length} / 50 字`;
    input.setCustomValidity('');
  }
  input.addEventListener('input', event => { if (!event.isComposing) limit(); });
  input.addEventListener('compositionend', limit);
  function busy(value) {
    form.setAttribute('aria-busy', String(value));
    form.querySelectorAll('button, input, textarea').forEach(control => { control.disabled = value; });
    submit.disabled = value || !service;
  }
  function reset() {
    run++;
    controller?.abort();
    stage = 'question'; followup = null;
    busy(false); input.readOnly = false;
    $('single-followup').hidden = true;
    $('single-options').replaceChildren();
    $('single-skip').hidden = true;
    result.hidden = true; form.hidden = false;
    submit.textContent = '繼續'; status.textContent = '';
  }
  function experience(value) {
    if (value === 'three' && stage === 'loading') reset();
    $('cards-three-panel').hidden = value === 'single';
    $('single-panel').hidden = value !== 'single';
    document.querySelector(`input[name="experience"][value="${value}"]`).checked = true;
    if (value === 'single' && service === null) loadService();
  }
  document.querySelectorAll('[name="experience"]').forEach(radio => radio.addEventListener('change', () => experience(radio.value)));
  window.addEventListener('popstate', () => { if (new URLSearchParams(location.search).has('what')) experience('three'); });
  async function loadService() {
    try {
      const response = await fetch(endpoint, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
      const data = await response.json();
      if (!response.ok || !['demo', 'ai'].includes(data.mode)) throw new Error();
      service = data.mode;
      $('single-service').textContent = service === 'demo' ? '本機示範・未呼叫 AI。先體驗提問、追問與抽牌流程。' : 'AI 單題解讀・問題只用於本次回覆，本網站不儲存問答。';
      $('single-consent-label').hidden = service !== 'ai';
      $('single-consent').required = service === 'ai';
      submit.disabled = false;
    } catch { $('single-service').textContent = '單題解讀服務尚未連線，請稍後重新整理。三張牌指引仍可使用。'; }
  }
  function showFollowup(item) {
    followup = item; stage = 'followup'; input.readOnly = true;
    $('single-followup-prompt').textContent = item.prompt;
    const options = $('single-options'); options.replaceChildren();
    item.options.forEach(([id, text]) => {
      const label = document.createElement('label'), radio = document.createElement('input'), span = document.createElement('span');
      radio.type = 'radio'; radio.name = 'single-choice'; radio.value = id;
      span.textContent = text; label.append(radio, span); options.append(label);
    });
    $('single-followup').hidden = false; $('single-skip').hidden = false;
    submit.textContent = '抽一張牌';
    options.querySelector('input').focus();
  }
  function render(data, question, focus) {
    if (!['demo', 'ai'].includes(data.source) || !core.deck().some(card => card.id === data.card?.id) || ['understanding', 'perspective', 'action', 'reminder'].some(key => typeof data.reading?.[key] !== 'string')) throw new Error('回覆格式有誤，請稍後再試。');
    const card = core.deck().find(card => card.id === data.card.id);
    const frame = document.createElement('div'), face = document.createElement('div');
    frame.className = 'astro-card'; face.className = 'astro-card__face';
    [['symbol', card.symbol], ['name', card.name], ['theme', card.theme]].forEach(([name, text]) => {
      const span = document.createElement('span'); span.className = `astro-card__${name}`; span.textContent = text; face.append(span);
    });
    frame.append(face); $('single-card').replaceChildren(frame);
    $('single-source').textContent = data.source === 'demo' ? '本機示範・未呼叫 AI' : 'AI 單題解讀';
    $('single-asked').textContent = `你想問：${question}`;
    $('single-focus').textContent = focus ? `這次先看：${focus.label}` : '';
    $('single-focus').hidden = !focus;
    $('single-reading').replaceChildren();
    [['understanding', '先聽見你的問題'], ['perspective', '這張牌帶來的角度'], ['action', '可以試試的一小步']].forEach(([key, title]) => {
      const heading = document.createElement('h4'), paragraph = document.createElement('p');
      heading.textContent = title; paragraph.textContent = data.reading[key]; $('single-reading').append(heading, paragraph);
    });
    $('single-reminder').textContent = data.reading.reminder;
    result.hidden = false; form.hidden = true; stage = 'result'; status.textContent = '';
    result.focus();
    if (data.source === 'ai') document.dispatchEvent(new Event('astro-cards:drawn'));
  }
  async function draw(skip = false) {
    if (!service || stage === 'loading') return;
    const question = core.normalize(input.value);
    const choiceId = skip || !followup ? null : form.querySelector('[name="single-choice"]:checked')?.value || null;
    if (followup && !skip && !choiceId) { status.textContent = '選一個想先探索的方向，或按「略過」。'; return; }
    const followupId = choiceId ? followup.id : null;
    const focus = core.selection(question, followupId, choiceId);
    stage = 'loading'; busy(true); status.textContent = '讓問題沉澱一下，正在為你抽牌與整理回覆…';
    const current = ++run; controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetch(endpoint, { method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, followupId, choiceId, consent: $('single-consent').checked }) });
      const data = await response.json();
      if (current !== run) return;
      if (!response.ok) throw new Error(data.error || '暫時無法完成解讀，請稍後再試。');
      render(data, question, focus);
    } catch (error) {
      if (current !== run) return;
      stage = followup ? 'followup' : 'question';
      status.textContent = error.name === 'AbortError' ? '等待時間較長，請稍後再試。' : error.message;
      submit.textContent = '重新抽牌並解讀';
    } finally { clearTimeout(timeout); if (current === run) busy(false); }
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (stage === 'loading') return;
    limit();
    if (!core.normalize(input.value)) { input.setCustomValidity('請先寫下一個問題。'); input.reportValidity(); return; }
    status.textContent = '';
    if (stage === 'question') {
      const item = core.followupFor(input.value);
      if (item) { showFollowup(item); return; }
    }
    draw();
  });
  $('single-skip').addEventListener('click', () => { if (form.reportValidity()) draw(true); });
  $('single-edit').addEventListener('click', () => { reset(); input.focus(); });
  $('single-reset').addEventListener('click', () => { reset(); input.value = ''; limit(); $('single-consent').checked = false; input.focus(); });
  if (location.hash === '#single' && !new URLSearchParams(location.search).has('what')) experience('single');
}());
