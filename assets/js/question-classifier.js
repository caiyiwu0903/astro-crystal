/* Local-only classification. No network, storage, randomness or card interpretation. */
(function () {
  "use strict";
  const words = (weight, text) => text.split("／").map(keyword => ({ keyword, weight }));
  const topics = {
    love: { name: "感情關係", icon: "💕", sentence: "你似乎想釐清感情中的感受與互動。", keywords: [...words(3, "感情／曖昧／伴侶／前任／復合／分手／喜歡／男友／女友／老公／老婆／對象／婚姻"), ...words(1, "愛／關係")] },
    career: { name: "工作生涯", icon: "💼", sentence: "你似乎想整理工作與生涯上的考量。", keywords: [...words(3, "工作／職涯／公司／主管／老闆／離職／轉職／升遷／面試／創業／職業／薪水"), ...words(2, "同事")] },
    money: { name: "金錢資源", icon: "💰", sentence: "你似乎想釐清金錢與資源的安排。", keywords: words(3, "金錢／財運／收入／支出／存款／投資／賺錢／財務／花錢／負債") },
    relationship: { name: "人際關係", icon: "🤝", sentence: "你似乎想理解與身邊人的相處。", keywords: [...words(3, "朋友／家人／父母／媽媽／爸爸／小孩／人際／相處／吵架／合作"), ...words(2, "同事")] },
    self: { name: "自我探索", icon: "🌱", sentence: "你似乎想更了解自己的需要與方向。", keywords: words(2, "自己／人生／方向／迷惘／卡住／害怕／焦慮／選擇／目標／成長／狀態") },
    general: { name: "一般指引", icon: "✨", sentence: "這個問題比較開放，我們可以用一般指引的方式來看看。", keywords: [] }
  };
  const topicAdditions = {
    career: "上班／辭職／換工作／換職／找工作／職場／薪資／加薪",
    money: "欠錢／借錢／還錢／沒錢／存錢／賠錢／賺多少／欠我的錢／存不到錢",
    love: "有意思／有沒有意思／交往／在一起／告白／劈腿／出軌／已讀不回／冷淡／心意",
    relationship: "閨蜜／親友／婆婆／岳父／岳母／親戚",
    self: "不知道要什麼／沒方向／很累／撐不下去／低潮"
  };
  for (const [topic, text] of Object.entries(topicAdditions)) topics[topic].keywords.push(...words(topic === "self" ? 2 : 3, text));
  // Priority is explicit: other person's thoughts and choices outrank broad time/state words.
  const intents = {
    other: { name: "對方想法", icon: "💭", priority: 6, sentence: "你想探索對方可能的想法；牌卡無法確認他人的內心，可以從實際互動來理解。", keywords: words(3, "他怎麼想／她怎麼想／對方怎麼想／他對我／她對我／對方對我／喜不喜歡我") },
    decision: { name: "選擇", icon: "🧭", priority: 5, sentence: "你似乎正在衡量選擇，想看清自己在意的條件。", keywords: words(3, "該不該／要不要／適不適合／是否／選哪個／繼續還是／留下還是") },
    reason: { name: "原因", icon: "🔎", priority: 4, sentence: "你似乎想理解事情背後的原因。", keywords: words(3, "為什麼／原因／怎麼會／為何") },
    action: { name: "下一步", icon: "👣", priority: 3, sentence: "你似乎想找到可以嘗試的下一步。", keywords: words(3, "怎麼辦／怎麼做／如何／改善／調整／下一步") },
    direction: { name: "未來發展", icon: "🌤️", priority: 2, sentence: "你似乎想探索接下來可能的發展方向。", keywords: words(3, "接下來／之後／未來／發展／會怎樣／走向") },
    state: { name: "目前狀態", icon: "◎", priority: 1, sentence: "你似乎想整理目前的情況與感受。", keywords: words(3, "現在／目前／最近／狀態／怎麼了") },
    general: { name: "一般指引", icon: "✨", priority: 0, sentence: "", keywords: [] }
  };
  const intentAdditions = {
    other: "有沒有意思／什麼感覺／什麼意思／心意／喜歡我嗎",
    decision: "適合嗎／可以嗎／該走嗎／該留嗎／該換嗎／該接受嗎／適合換嗎",
    reason: "怎麼回事／怎麼這樣",
    action: "該怎麼辦／能怎麼做",
    direction: "會不會／還有機會嗎／結果會怎樣／有沒有可能／有可能嗎／可能嗎／有沒有機會／有機會嗎／能不能在一起／會不會在一起／可能在一起"
  };
  for (const [intent, text] of Object.entries(intentAdditions)) intents[intent].keywords.push(...words(3, text));
  const times = {
    today: { name: "今天", priority: 5, keywords: words(1, "今天／今日") },
    week: { name: "本週", priority: 4, keywords: words(1, "這週／本週／這星期") },
    month: { name: "本月", priority: 3, keywords: words(1, "這個月／本月") },
    future: { name: "未來", priority: 2, keywords: words(1, "未來／接下來／之後／往後") },
    current: { name: "近期", priority: 1, keywords: words(1, "最近／近期／目前／現在／這陣子") },
    general: { name: "未指定時間", priority: 0, keywords: [] }
  };
  const config = {
    topics, intents, times,
    // One strongest bonus per topic; repeating or overlapping phrases does not stack.
    focusRules: [
      { topic: "career", bonus: 4, phrases: ["換工作", "換職", "找工作", "辭職", "離職", "轉職", "加薪"] },
      { topic: "money", bonus: 4, phrases: ["欠我的錢", "欠錢", "借錢", "還錢", "沒錢", "存錢", "存不到錢", "賠錢", "賺多少"] },
      { topic: "love", bonus: 4, phrases: ["告白", "交往", "復合", "分手", "喜歡我嗎", "對我有意思", "對我有沒有意思", "喜歡主管", "只把我當朋友", "只是朋友", "當朋友", "可能在一起", "有沒有可能在一起", "能不能在一起", "會不會在一起", "有機會在一起", "我們算什麼", "我們是什麼關係"] }
    ],
    // Equal total scores prefer focus bonuses; unresolved ties retain this stable fallback.
    topicOrder: ["love", "career", "money", "relationship", "self"],
    // Normalize partner names before matching so 男朋友 does not also match 朋友.
    aliases: { "男朋友": "男友", "女朋友": "女友" },
    exclusions: ["可愛", "愛好"],
    confirmations: { "career:decision": "你似乎正在衡量工作上的選擇，想釐清什麼更適合自己。" },
    heading: "🔮 我理解你想問的是",
    manualHeading: "你選擇的問題方向",
    openHeading: "先用一般指引探索",
    openSentence: topics.general.sentence
  };
  function normalize(question) {
    let text = String(question || "").normalize("NFKC").replace(/\s+/g, "").toLowerCase();
    for (const [from, to] of Object.entries(config.aliases)) text = text.split(from).join(to);
    for (const term of config.exclusions) text = text.split(term).join(" ");
    return text;
  }
  function score(text, entries) {
    const matches = entries.flatMap(({ keyword, weight }) => {
      const start = text.indexOf(keyword);
      return start < 0 ? [] : [{ start, end: start + keyword.length, weight, keyword }];
    }).sort((a, b) => b.keyword.length - a.keyword.length);
    const accepted = [];
    for (const match of matches) {
      if (!accepted.some(item => match.start < item.end && match.end > item.start)) accepted.push(match);
    }
    // Repeating a word does not inflate its score.
    return accepted.reduce((sum, item) => sum + item.weight, 0);
  }
  function priorityMatch(text, definitions) {
    return Object.keys(definitions).filter(key => score(text, definitions[key].keywords) > 0)
      .sort((a, b) => definitions[b].priority - definitions[a].priority)[0] || "general";
  }
  function classify(question) {
    const text = normalize(question);
    const scores = Object.fromEntries(config.topicOrder.map(key => [key, score(text, topics[key].keywords)]));
    const focus = Object.fromEntries(config.topicOrder.map(key => [key, 0]));
    for (const rule of config.focusRules) {
      if (rule.phrases.some(phrase => text.includes(phrase))) focus[rule.topic] = Math.max(focus[rule.topic], rule.bonus);
    }
    for (const topic of config.topicOrder) scores[topic] += focus[topic];
    const ranked = config.topicOrder.filter(key => scores[key] > 0)
      .sort((a, b) => scores[b] - scores[a] || focus[b] - focus[a]);
    return { primaryTopic: ranked[0] || "general", secondaryTopic: ranked[1] || null,
      intent: priorityMatch(text, intents), timeContext: priorityMatch(text, times), scores };
  }
  function describe(value, manual = false) {
    const topic = topics[value.primaryTopic] || topics.general;
    const intent = intents[value.intent] || intents.general;
    return {
      heading: manual ? config.manualHeading : value.primaryTopic === "general" ? config.openHeading : config.heading,
      label: `${topic.icon} ${topic.name} × ${intent.icon} ${intent.name}`,
      sentence: value.primaryTopic === "general" ? config.openSentence : manual
        ? `以你選擇的「${topic.name}・${intent.name}」保留這次問題方向。`
        : config.confirmations[`${value.primaryTopic}:${value.intent}`] || (topic.sentence + intent.sentence),
      time: times[value.timeContext]?.name || times.general.name
    };
  }
  (typeof window === "undefined" ? globalThis : window).QuestionClassifier = Object.freeze({ config, classify, describe });
}());
