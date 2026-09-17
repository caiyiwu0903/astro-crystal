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
  function limitQuestion(value) {
    const text = String(value || "").replace(/[\r\n\t]+/g, " ");
    const chars = typeof Intl.Segmenter === "function"
      ? Array.from(new Intl.Segmenter("zh", { granularity: "grapheme" }).segment(text), part => part.segment)
      : Array.from(text);
    return chars.slice(0, 50).join("");
  }
  // Match an explicitly mentioned subject, without claiming to know feelings or outcomes.
  const topics = {
    career: [
      [/換工作|轉職|離職|跳槽/, "轉換工作的選擇", "你想離開的原因，與新工作需要具備的條件", "先挑一個職缺，核對工作內容與你重視的條件"],
      [/面試|求職|找工作|履歷/, "尋找工作機會", "你能提供的能力，以及還想向對方確認的資訊", "準備一個具體經驗，並寫下一個想在面試中確認的問題"],
      [/同事|主管|老闆|團隊/, "工作中的人際互動", "對方明確提出的要求，與你自己推測的期待", "挑一件具體工作，用事實與可行安排和對方核對"],
      [/升遷|加薪|薪水|待遇/, "工作回饋與期待", "已累積的貢獻，與尚未談清楚的評估標準", "整理一項可具體說明的成果，確認討論回饋的時機"],
      [/創業|接案|方向|生涯/, "接下來的工作方向", "想嘗試的方向，與目前可投入的時間和資源", "安排一個成本可承受的小實驗，再用實際經驗評估"]
    ],
    love: [
      [/分手|復合|前任/, "關係的去留與重新靠近", "你懷念的部分，與相處中仍需要改變的問題", "寫下重新相處需要具備的條件，尊重彼此是否願意的回應"],
      [/告白|主動|暗戀|喜歡的人|拒絕/, "表達好感與靠近的步調", "你想表達的心意，與對方實際展現的意願", "從一次不施壓的聊天或邀約開始，依對方回應調整距離"],
      [/吵架|冷戰|溝通|爭執/, "關係中的溝通", "事情實際發生的經過，與你希望被理解的需要", "選雙方願意談的時候，用一個具體情境說明自己的感受"],
      [/結婚|承諾|未來|遠距/, "關係的方向與約定", "你期待的生活，與雙方已經談過的共識", "提出一項你在意的生活安排，聽聽彼此能接受的做法"],
      [/單身|脫單|遇到|桃花/, "認識新關係的可能", "你喜歡的相處方式，與願意投入認識彼此的空間", "選一個自己也享受的活動，給自然交流留一點機會"]
    ],
    daily: [
      [/累|壓力|忙|休息/, "今天的負荷與節奏", "今天必要的事，與可以延後或協商的安排", "先調整一項非必要的待辦，留一段能喘口氣的時間"],
      [/選擇|決定|猶豫|要不要/, "眼前的選擇", "你最在意的條件，與仍缺少的資訊", "選一個最需要確認的條件，先取得資訊再做決定"],
      [/朋友|家人|相處|溝通/, "日常的人際相處", "你希望被理解的部分，與對方實際表達的意思", "用一個不帶指責的問題，確認彼此是否理解一致"],
      [/學習|考試|讀書/, "學習的安排", "目前卡住的環節，與已經掌握的部分", "把目標縮成一個今天能練習的小題目"]
    ]
  };
  const defaults = {
    daily: [null, "你今天提出的這件事", "此刻已知的事實，與你還想釐清的部分", "寫下一個今天能確認的小問題，不急著一次處理全部"],
    love: [null, "你提出的關係問題", "自己的期待，與互動中能觀察到的回應", "先說清楚一項自己的需要，也留空間聽對方的想法"],
    career: [null, "你提出的工作問題", "想達成的目標，與目前可調整的條件", "挑一個能取得實際資訊的步驟，幫助自己評估"]
  };
  function interpret(selection, question = "") {
    const cards = resolve(selection);
    if (!cards) throw new Error("Invalid card selection");
    const [what, how, where] = cards;
    const mode = data.modes[selection.mode];
    const reading = {
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
    const asked = limitQuestion(question).trim();
    if (asked) {
      const [, subject, distinction, step] = topics[selection.mode].find(row => row[0].test(asked)) || defaults[selection.mode];
      reading.paragraphs = [
        `你問：「${asked}」面對${subject}，${what.name}提供的切入點是${what.focus}。搭配${how.name}，可以試著${how.approach}；先分清${distinction}，再看看哪一部分最需要你的照顧。`,
        `把${subject}放進${where.name}所指向的${where[selection.mode]}來看，可以留意：當你嘗試「${how.theme}」時，是否更容易看清${distinction}？這不是替你的問題預設答案，而是協助你找到可觀察、可核對的線索。`,
        `針對${subject}，下一步可以${step}。再用${what.name}的提醒——${what.action}——檢查這一步是否符合自己的需要。以「${how.theme}」的步調嘗試，依實際情況調整，不必急著得到完整答案。`
      ];
      reading.question = `面對${subject}，${where.question}`;
    }
    reading.asked = asked;
    return reading;
  }
  function url(selection, base) {
    if (!resolve(selection)) throw new Error("Invalid card selection");
    const result = new URL(base);
    result.search = new URLSearchParams(Object.fromEntries(["mode", "what", "how", "where"].map(key => [key, selection[key]]))).toString();
    result.hash = "";
    return result.href;
  }
  function text(selection, base, question = "") {
    const result = interpret(selection, question);
    return ["放心占星牌卡｜" + result.mode, result.cards.map(card => card.name).join(" × "), result.title,
      ...(result.asked ? ["我的問題：" + result.asked] : []), ...result.paragraphs, "放心提醒：" + result.reminder, "自我提問：" + result.question, url(selection, base)].join("\n\n");
  }
  window.AstroCardsEngine = Object.freeze({ readQuery, draw, interpret, url, text, limitQuestion });
}());
