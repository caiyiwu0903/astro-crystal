(function () {
  "use strict";
  const engine = window.AstroCardsEngine;
  const form = document.querySelector("#cards-form");
  const result = document.querySelector("#cards-result");
  const status = document.querySelector("#cards-status");
  const shareStatus = document.querySelector("#cards-share-status");
  const manual = document.querySelector("#cards-manual");
  const manualText = document.querySelector("#cards-manual-text");
  let selection = null;
  let revision = 0;
  const roles = ["WHAT · 什麼能量", "HOW · 如何表現", "WHERE · 人生領域"];
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }
  function render() {
    revision += 1;
    const reading = engine.interpret(selection);
    const spread = document.querySelector("#cards-spread");
    spread.replaceChildren();
    reading.cards.forEach((card, index) => {
      const article = element("article", "astro-card");
      const face = element("div", "astro-card__face");
      const symbol = element("span", "astro-card__symbol", card.symbol + "\uFE0E");
      symbol.setAttribute("aria-hidden", "true");
      face.append(symbol);
      if (card.card_image_url) {
        const img = element("img", "astro-card__image");
        img.alt = "";
        img.addEventListener("error", () => img.remove(), { once: true });
        img.src = card.card_image_url;
        face.append(img);
      }
      face.append(element("h3", "astro-card__name", card.name), element("span", "astro-card__theme", card.theme));
      article.append(face, element("p", "astro-card__role", roles[index]));
      spread.append(article);
    });
    document.querySelector("#cards-result-mode").textContent = reading.mode;
    document.querySelector("#cards-title").textContent = reading.title;
    document.querySelector("#cards-paragraphs").replaceChildren(...reading.paragraphs.map(text => element("p", "", text)));
    document.querySelector("#cards-reminder").textContent = reading.reminder;
    document.querySelector("#cards-question").textContent = reading.question;
    manual.hidden = true;
    shareStatus.textContent = "";
    result.hidden = false;
    document.querySelector("#cards-draw").textContent = "再抽一組";
  }
  function updateUrl() {
    try { history.replaceState(null, "", engine.url(selection, location.href)); }
    catch { status.textContent = "此環境無法更新網址；仍可使用下方按鈕複製固定牌組網址。"; }
  }
  function restore() {
    const parsed = engine.readQuery(location.search);
    form.elements.mode.value = parsed.mode;
    selection = parsed.selection;
    status.textContent = parsed.invalid ? "這個連結的牌組資料不完整或無效，請重新抽一組牌。" : "";
    manual.hidden = true;
    shareStatus.textContent = "";
    if (selection) render();
    else { result.hidden = true; revision += 1; document.querySelector("#cards-draw").textContent = "抽一組牌"; }
  }
  form.addEventListener("submit", event => {
    event.preventDefault();
    selection = engine.draw(form.elements.mode.value);
    status.textContent = "已抽出三張牌，可以慢慢閱讀此刻的訊息。";
    render();
    updateUrl();
    result.focus({ preventScroll: true });
    result.scrollIntoView({ behavior: "auto", block: "start" });
  });
  form.addEventListener("change", () => {
    status.textContent = selection ? "已切換模式，保留同一組牌，從不同角度閱讀。" : "";
    if (selection) { selection = { ...selection, mode: form.elements.mode.value }; render(); updateUrl(); }
  });
  async function copy(text, success) {
    const current = revision;
    try {
      if (!navigator.clipboard || !window.isSecureContext) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(text);
      if (current === revision) { shareStatus.textContent = success; manual.hidden = true; }
      return;
    } catch { /* Try the user-gesture fallback, then expose selectable text. */ }
    if (current !== revision) return;
    manual.hidden = false;
    manualText.value = text;
    manualText.focus({ preventScroll: true });
    manualText.select();
    manualText.setSelectionRange(0, text.length);
    let copied = false;
    try { copied = document.execCommand("copy"); } catch { /* Manual copy remains available. */ }
    if (copied) { manual.hidden = true; shareStatus.textContent = success; }
    else shareStatus.textContent = "自動複製無法使用，請長按或選取下方文字複製。";
  }
  document.querySelector("#cards-copy").addEventListener("click", () => {
    if (selection) copy(engine.text(selection, location.href), "已複製完整結果與牌組網址。");
  });
  document.querySelector("#cards-copy-url").addEventListener("click", () => {
    if (selection) copy(engine.url(selection, location.href), "已複製固定牌組網址。");
  });
  document.querySelector("#cards-share").addEventListener("click", async () => {
    if (!selection) return;
    const current = revision;
    const url = engine.url(selection, location.href);
    const payload = { title: "放心占星牌卡", text: engine.interpret(selection).title, url };
    try {
      if (!navigator.share || (navigator.canShare && !navigator.canShare(payload))) throw new Error("Share unavailable");
      await navigator.share(payload);
      if (current === revision) shareStatus.textContent = "已開啟分享。";
    } catch (error) {
      if (current !== revision) return;
      if (error.name === "AbortError") { shareStatus.textContent = "已取消分享。"; return; }
      await copy(url, "已複製固定牌組網址，可以貼到 LINE 分享。");
    }
  });
  window.addEventListener("popstate", restore);
  restore();
}());
