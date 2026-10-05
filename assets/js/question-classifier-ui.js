(function () {
  "use strict";
  const classifier = window.QuestionClassifier;
  const $ = id => document.getElementById(id);
  const panel = $("question-confirmation"), input = $("cards-input");
  const form = $("cards-form");
  const entries = { daily: { topic: "general", name: "今日訊息" }, love: { topic: "love", name: "感情占卜" }, career: { topic: "career", name: "工作／生涯" } };
  let resolved = false;
  let draft = null, confirmed = null, question = "", manual = false, proceed = null;
  const clone = value => value ? JSON.parse(JSON.stringify(value)) : null;
  for (const [selectId, definitions] of [["question-topic", classifier.config.topics], ["question-intent", classifier.config.intents]]) {
    for (const [key, value] of Object.entries(definitions)) {
      const option = document.createElement("option"); option.value = key; option.textContent = value.name; $(selectId).append(option);
    }
  }
  function render() {
    const view = classifier.describe(draft, manual);
    $("question-heading").textContent = view.heading;
    $("question-label").textContent = view.label;
    $("question-sentence").textContent = view.sentence;
    $("question-time").textContent = draft.timeContext === "general" ? "" : `時間：${view.time}`;
    const entry = entries[form.elements.mode.value];
    const conflict = !manual && !resolved && entry.topic !== "general" && draft.primaryTopic !== "general" && entry.topic !== draft.primaryTopic;
    $("question-conflict").hidden = !conflict;
    $("question-keep-entry").hidden = !conflict;
    $("question-start").textContent = conflict ? `改用${classifier.config.topics[draft.primaryTopic].name}` : "開始占卜";
    if (conflict) {
      $("question-heading").textContent = "你的問題看起來比較像：";
      $("question-conflict").textContent = `目前選擇的是：${entry.name}。要改用系統辨識的方向嗎？`;
      $("question-keep-entry").textContent = `維持${entry.name}`;
    }
  }
  function reset() {
    draft = null; confirmed = null; manual = false; question = ""; proceed = null;
    resolved = false;
    panel.hidden = true; $("question-adjustments").hidden = true;
  }
  input.addEventListener("input", reset);
  form.addEventListener("change", event => { if (event.target.name === "mode") reset(); });
  window.addEventListener("popstate", reset);
  $("question-adjust").addEventListener("click", () => {
    $("question-topic").value = draft.primaryTopic;
    $("question-intent").value = draft.intent;
    $("question-adjustments").hidden = false;
    $("question-topic").focus();
  });
  function change() {
    manual = true; confirmed = null;
    draft = { ...draft, primaryTopic: $("question-topic").value, secondaryTopic: null, intent: $("question-intent").value };
    render();
  }
  $("question-topic").addEventListener("change", change);
  $("question-intent").addEventListener("change", change);
  function confirm(keepEntry = false) {
    if (!draft || !proceed || input.value.trim() !== question) { reset(); return; }
    if (keepEntry) {
      draft = { ...draft, primaryTopic: entries[form.elements.mode.value].topic, secondaryTopic: null };
      manual = true;
    }
    resolved = true;
    confirmed = { ...clone(draft), source: manual ? "manual" : "rules" };
    panel.hidden = true;
    const callback = proceed; proceed = null;
    callback();
  }
  $("question-start").addEventListener("click", () => confirm());
  $("question-keep-entry").addEventListener("click", () => confirm(true));
  window.AstroQuestionContext = Object.freeze({
    // Returns a copy: consumers cannot mutate the confirmed classification. No question text is exported.
    getConfirmed: () => clone(confirmed),
    reset,
    request(questionText, callback) {
      const text = questionText.trim();
      // Empty optional questions retain the original one-click draw flow.
      if (!text) { reset(); callback(); return; }
      if (text !== question || !draft) {
        reset(); question = text; draft = classifier.classify(text);
      }
      proceed = callback;
      render(); panel.hidden = false;
      $("question-heading").focus({ preventScroll: true });
      panel.scrollIntoView({ behavior: "auto", block: "nearest" });
    }
  });
}());
