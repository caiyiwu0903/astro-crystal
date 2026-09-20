/* Shared by the browser and server. No question storage or network requests. */
(function () {
  "use strict";
  const followups = [
    { id: "leave", group: "career", pattern: /離職|轉職|換工作|跳槽/, clear: /已(?:經)?(?:有|拿到|收到).*(?:offer|錄取|工作|邀請)|因為.+(?:離職|轉職)|擔心薪水|薪水降低/i,
      prompt: "關於換工作，你最想釐清什麼？", options: [
        ["tired", "太累了，要不要繼續", "分辨必要責任與過量負擔，找一項能調整的工作安排"],
        ["direction", "不知道下一步方向", "盤點已累積的能力，選一個方向做小規模探索"],
        ["offer", "已有新機會，難以選擇", "比較新舊工作的實際條件，找出仍需確認的資訊"] ] },
    { id: "job", group: "career", pattern: /求職|面試|找工作|履歷/, clear: /面試.*(?:自我介紹|薪水|薪資)|履歷.*(?:經歷|作品)/,
      prompt: "找工作的過程，哪一部分最讓你卡住？", options: [
        ["fit", "不知道適合什麼", "從喜歡且能持續投入的任務辨認合適方向"],
        ["show", "不知道怎麼展現自己", "準備一個具體經驗，說清楚自己的做法與貢獻"],
        ["wait", "等待結果，心裡不安", "區分可以跟進的資訊與暫時無法控制的結果"] ] },
    { id: "work-people", group: "career", pattern: /主管|同事|老闆|工作人際/, clear: /(?:主管|同事|老闆).*(?:分工|加班|界線|誤會)/,
      prompt: "這段工作互動，你最想改善什麼？", options: [
        ["talk", "把話說清楚", "用一個具體情境核對彼此理解"],
        ["boundary", "分工與界線", "列出自己能承擔的範圍，再協商分工"],
        ["conflict", "面對衝突的方式", "先整理事實與需要，再選合適的時機討論"] ] },
    { id: "direction", group: "career", pattern: /職涯|生涯|工作方向|創業|接案/, clear: /(?:創業|接案).*(?:資金|時間|報價|客戶)/,
      prompt: "你現在比較需要哪一種支持？", options: [
        ["want", "看清自己想要什麼", "先列出三個自己重視的工作條件"],
        ["start", "踏出嘗試的第一步", "選一個成本可承受的小實驗"],
        ["review", "判斷目前方向是否合適", "用近期實際經驗檢查投入與回饋是否相稱"] ] },
    { id: "reconnect", group: "love", pattern: /復合|前任|重新聯繫/, clear: /(?:前任|復合).*(?:拒絕|不想聯絡|封鎖)/,
      prompt: "關於重新聯繫，你最在意什麼？", options: [
        ["why", "為什麼想再靠近", "區分懷念的感受與現在想建立的相處方式"],
        ["change", "以前的問題是否有改變", "回到可觀察的互動，辨認哪些事情真的不同"],
        ["respect", "如何尊重彼此的界線", "先確認對方是否願意聯繫，保留拒絕的空間"] ] },
    { id: "leaving-love", group: "love", pattern: /分手|關係去留|要不要繼續.*(?:關係|感情)/, clear: /(?:分手|關係).*(?:暴力|威脅|安全)/,
      prompt: "面對這段關係，你最想先整理什麼？", options: [
        ["hope", "自己還在期待什麼", "分清自己期待的關係與目前實際的相處"],
        ["change", "哪些問題需要改變", "挑一個具體問題，辨認雙方是否願意調整"],
        ["express", "怎麼表達自己的決定", "用清楚而尊重的話說明自己的需要與決定"] ] },
    { id: "crush", group: "love", pattern: /告白|暗戀|喜歡(?:上|的)?(?:他|她|同事|主管|朋友|一個人)|好感/, clear: /(?:告白|喜歡).*(?:怕被拒絕|擔心被拒絕|怎麼開口|已被拒絕)/,
      prompt: "關於這份喜歡，你最想理解哪一部分？", options: [
        ["closer", "自己是否想更靠近", "辨認喜歡的感受，以及自己期待的相處方式"],
        ["express", "如何自然表達好感", "從一次不施壓的聊天或邀約開始"],
        ["uncertain", "怎麼面對不確定的回應", "留意對方實際回應，讓彼此都保有選擇"] ] },
    { id: "couple", group: "love", pattern: /伴侶|男友|女友|男朋友|女朋友|冷戰|感情|吵架|結婚|婚姻/, clear: /(?:伴侶|男友|女友).*(?:家務|金錢|遠距|約定)/,
      prompt: "你希望這次對話帶來什麼？", options: [
        ["heard", "讓自己的感受被理解", "用自己的感受和需要描述一個具體情境"],
        ["understand", "更了解彼此的需要", "用開放問題聽聽對方的想法，不替對方下結論"],
        ["agreement", "談清楚一件具體事情", "挑一件可以協商的生活安排，確認雙方的意願"] ] },
    { id: "new-love", group: "love", pattern: /單身|脫單|新對象|桃花/, clear: /單身.*(?:很自在|不想戀愛)/,
      prompt: "對於新的關係，你想探索什麼？", options: [
        ["style", "自己期待的相處方式", "列出讓自己自在的互動與需要的界線"],
        ["meet", "如何增加認識人的機會", "選一個自己喜歡的活動，留一點自然交流的空間"],
        ["trust", "如何慢慢建立信任", "觀察小事上的尊重與一致性，依舒服的步調靠近"] ] },
    { id: "pressure", group: "daily", pattern: /壓力|疲憊|很累|太累|忙不過來/, clear: /因為.+(?:壓力|疲憊)|(?:壓力|太累).*(?:睡眠|加班|休息)/,
      prompt: "此刻你最需要的是什麼？", options: [
        ["priority", "排出事情的先後", "分出必要、可延後與可協商的事情"],
        ["rest", "減輕負擔、留點休息", "先減少一項非必要安排，留一段能喘口氣的時間"],
        ["worry", "釐清讓自己掛心的事", "寫下一件最掛心的事，區分事實與猜測"] ] },
    { id: "people", group: "daily", pattern: /家人|朋友|父母|媽媽|爸爸|友情/, clear: /(?:家人|朋友).*(?:借錢|拒絕|界線)/,
      prompt: "這段相處，你最想照顧哪個部分？", options: [
        ["needs", "表達自己的需要", "用一個具體例子說明希望獲得的支持"],
        ["distance", "保留舒服的距離", "辨認自己能接受的互動頻率與界線"],
        ["repair", "修復一次不愉快的互動", "先說明自己的感受，也留空間理解對方"] ] },
    { id: "choice", group: "daily", pattern: /選擇|決定|猶豫|要不要/, clear: /(?:決定|選擇).*(?:薪水|交通|時間|費用)/,
      prompt: "讓你難以決定的，主要是哪一部分？", options: [
        ["values", "不清楚自己重視什麼", "列出最不能妥協的一個條件"],
        ["information", "資訊還不夠", "先確認一項最可能影響決定的資訊"],
        ["cost", "擔心選擇後的代價", "寫下可承受的代價，以及能保留的調整空間"] ] }
  ];
  function characters(text) {
    return typeof Intl.Segmenter === "function"
      ? Array.from(new Intl.Segmenter("zh", { granularity: "grapheme" }).segment(text), part => part.segment)
      : Array.from(text);
  }
  function normalize(text) { return String(text || "").normalize("NFC").replace(/[\r\n\t]+/g, " ").trim(); }
  function followupFor(question) {
    const q = normalize(question);
    const matches = followups.filter(item => item.pattern.test(q));
    let love = matches.find(item => item.group === "love");
    // A colleague can be a romantic interest; a work decision mixed with romance is ambiguous.
    const career = matches.find(item => item.group === "career" && (item.id !== "work-people" || !love));
    if (love && career) return null;
    const match = love || career || matches[0];
    return match && !match.clear.test(q) ? match : null;
  }
  function selection(question, followupId, choiceId) {
    if (followupId === null && choiceId === null) return null;
    const item = followupFor(question);
    const option = item && item.id === followupId && item.options.find(row => row[0] === choiceId);
    if (!option) throw new Error("Invalid follow-up choice");
    return { id: item.id, label: option[1], direction: option[2] };
  }
  function deck() {
    const data = globalThis.AstroCardsData;
    return [...data.what.map(c => ({ ...c, category: "星體／交點" })), ...data.how.map(c => ({ ...c, category: "星座" })), ...data.where.map(c => ({ ...c, category: "宮位" }))];
  }
  function meaning(card) { return card.focus || card.approach || card.daily; }
  function example(question, focus, card) {
    return {
      understanding: focus ? `你選擇先看「${focus.label}」。可以從自己最需要釐清的一小部分開始，不必急著解決整件事。` : `把「${question}」留在心裡，先想想此刻最希望看清楚的是什麼。`,
      perspective: `${card.name}帶來「${card.theme}」的角度，邀請你留意${meaning(card)}。回想一個最近的具體情境，看看它和你的問題有什麼連結。`,
      action: focus ? `可以先${focus.direction}，再依實際感受調整下一步。` : `先寫下一件已知的事，以及一個仍需確認的問題。${(card.action || card.reminder || card.question).replace(/[。？?]+$/, '')}。`,
      reminder: "這是一個整理自己的角度，你保有選擇與調整的空間。"
    };
  }
  globalThis.AstroSingleCore = Object.freeze({ followups, characters, normalize, followupFor, selection, deck, meaning, example });
}());
