/* Small local reading lenses; the card engine and its meanings remain untouched. */
(function () {
  "use strict";
  const engine = window.AstroCardsEngine;
  const topics = {
    love: { title: "💕 放回你的感情問題", text: theme => `把「${theme}」放回彼此的期待、界線與相處意願，留意雙方實際如何回應。` },
    career: { title: "💼 放回你的工作問題", text: theme => `從「${theme}」檢視工作條件、責任與可用資源，區分眼前的不適與長期重視的需求。` },
    money: { title: "💰 放回你的金錢問題", text: theme => `以「${theme}」整理收支與資源安排，先核對實際數字及必要支出，不以牌面推測收益。` },
    relationship: { title: "🤝 放回你的人際問題", text: theme => `透過「${theme}」看彼此的分工、表達與界線，從一次具體互動核對需要，暫緩歸責。` },
    self: { title: "🌱 放回你的自我探索", text: theme => `用「${theme}」辨認自己的需要與可承受的步調，先留意生活裡讓你有力量或消耗的部分。` }
  };
  const intents = {
    state: { title: "現在最值得看見的是什麼？", text: (what, how) => `留意「${what.theme}」在近期如何呈現；以「${how.theme}」為觀察角度，寫下一件已發生的事與自己的感受。` },
    reason: { title: "是什麼造成現在的局面？", text: what => `沿著「${what.theme}」回看反覆出現的情境，區分外在條件與自己的反應；這是待核對的線索，不是已確定的原因。` },
    decision: { title: "做決定前，最需要衡量什麼？", text: what => `將「${what.theme}」列為衡量條件，比較各選項的付出、界線與可調整空間，先補齊一項關鍵資訊。` },
    action: { title: "現在可以先做什麼？", text: what => `可以先${what.action}，把它縮成一個可完成的小步驟，做過後再依實際回饋調整。` },
    other: { title: "從實際互動中，可以觀察對方什麼狀態？", text: what => `這組牌提醒你觀察「${what.theme}」如何出現在對話與行動中，例如約定是否落實、界線是否受到尊重；這些訊號無法直接證明對方的心意。` },
    direction: { title: "如果目前模式延續，可能往哪裡發展？", text: (what, how) => `如果目前模式持續，接下來值得留意「${what.theme}」是否獲得照顧；可用「${how.theme}」嘗試調整，發展仍取決於實際選擇與互動。` }
  };
  function interpret(selection, question = "", context = null) {
    const asked = engine.limitQuestion(question).trim();
    if (!asked || !context) return { reading: engine.interpret(selection, question), coreTitle: "", sections: [] };
    const reading = { ...engine.interpret(selection), asked };
    const [what, how, where] = reading.cards;
    const sections = [];
    if (Object.hasOwn(topics, context.primaryTopic)) {
      const lens = topics[context.primaryTopic];
      sections.push({ title: lens.title, text: lens.text(where.theme) });
    }
    if (Object.hasOwn(intents, context.intent)) {
      const lens = intents[context.intent];
      sections.push({ title: lens.title, text: lens.text(what, how) });
    }
    return { reading, coreTitle: "🔮 這組牌的核心訊息", sections };
  }
  function text(selection, base, question = "", context = null) {
    if (!engine.limitQuestion(question).trim() || !context) return engine.text(selection, base, question);
    const { reading, coreTitle, sections } = interpret(selection, question, context);
    return ["放心占星牌卡｜" + reading.mode, reading.cards.map(card => card.name).join(" × "), reading.title,
      "我的問題：" + reading.asked, coreTitle, ...reading.paragraphs,
      ...sections.flatMap(section => [section.title, section.text]), "放心提醒：" + reading.reminder,
      "自我提問：" + reading.question, engine.url(selection, base)].join("\n\n");
  }
  window.AstroCardsContext = Object.freeze({ topics, intents, interpret, text });
}());
