(function () {
  "use strict";
  const data = window.AstroCardsData;
  const validMode = mode => Object.hasOwn(data.modes, mode);
  function resolve(selection) {
    if (!selection || !validMode(selection.mode)) return null;
    const cards = ["what", "how", "where"].map(key => data[key].find(card => card.id === selection[key]));
    return cards.every(Boolean) ? cards : null;
  }
  function readQuery(search) {
    const params = new URLSearchParams(search);
    const mode = validMode(params.get("mode")) ? params.get("mode") : "daily";
    const selection = Object.fromEntries(["mode", "what", "how", "where"].map(key => [key, params.get(key)]));
    const hasCards = ["what", "how", "where"].some(key => params.has(key));
    const duplicate = ["mode", "what", "how", "where"].some(key => params.getAll(key).length > 1);
    const valid = !duplicate && resolve(selection);
    return { mode, selection: valid ? selection : null,
      invalid: duplicate || (hasCards && !valid) || (params.has("mode") && !validMode(params.get("mode"))) };
  }
  function draw(mode, random = Math.random) {
    if (!validMode(mode)) throw new Error("Unknown mode");
    return Object.assign({ mode }, Object.fromEntries(["what", "how", "where"].map(key => [key, data[key][Math.floor(random() * data[key].length)].id])));
  }
  function interpret(selection) {
    const cards = resolve(selection);
    if (!cards) throw new Error("Invalid card selection");
    const [what, how, where] = cards;
    const mode = data.modes[selection.mode];
    return {
      cards, mode: mode.name,
      title: `${how.theme}，在${where.theme}中看見${what.theme}`,
      paragraphs: [
        `${mode.opening}。${what.name}讓焦點回到${what.focus}；搭配${how.name}，你可以試著${how.approach}，看看這樣的方式是否貼近此刻的需要。`,
        `${where.name}把這個練習帶進${where[selection.mode]}。與其急著替情況下結論，不妨留意：當你用「${how.theme}」的方式面對這個領域時，${what.theme}有哪些被照顧到、又有哪些仍需要調整？`,
        `${mode.invitation}${what.action}。從${where.theme}中挑一個具體情境練習，再依實際感受調整步調。你可以只帶走對自己有幫助的部分。`
      ],
      reminder: how.reminder + "。",
      question: where.question
    };
  }
  function url(selection, base) {
    if (!resolve(selection)) throw new Error("Invalid card selection");
    const result = new URL(base);
    result.search = new URLSearchParams(selection).toString();
    result.hash = "";
    return result.href;
  }
  function text(selection, base) {
    const result = interpret(selection);
    return ["放心占星牌卡｜" + result.mode, result.cards.map(card => card.name).join(" × "), result.title,
      ...result.paragraphs, "放心提醒：" + result.reminder, "自我提問：" + result.question, url(selection, base)].join("\n\n");
  }
  window.AstroCardsEngine = Object.freeze({ readQuery, draw, interpret, url, text });
}());
