(function () {
  "use strict";
  const classifier = window.QuestionClassifier;
  const $ = id => document.getElementById(id);
  const panel = $("question-confirmation"), input = $("cards-input");
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
  }
  function reset() {
    draft = null; confirmed = null; manual = false; question = ""; proceed = null;
    panel.hidden = true; $("question-adjustments").hidden = true;
  }
  input.addEventListener("input", reset);
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
  $("question-start").addEventListener("click", () => {
    if (!draft || !proceed || input.value.trim() !== question) { reset(); return; }
    confirmed = { ...clone(draft), source: manual ? "manual" : "rules" };
    panel.hidden = true;
    const callback = proceed; proceed = null;
    callback();
  });
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
