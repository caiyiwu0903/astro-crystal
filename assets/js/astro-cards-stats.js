(function () {
  "use strict";
  const output = document.querySelector("#cards-participant-count");
  const config = window.ASTRO_SUPABASE;
  if (!output || !config?.url || !config?.publishableKey) return;
  let displayed = 0;
  const pendingDraws = [];
  let sending = false;
  function show(count) {
    if (!Number.isSafeInteger(count) || count < 1588) throw new Error("Invalid count");
    displayed = Math.max(displayed, count);
    output.textContent = new Intl.NumberFormat("zh-TW").format(displayed);
  }
  async function request(method, body = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(`${config.url}/rest/v1/rpc/${method}`, {
        method: "POST", signal: controller.signal,
        headers: { apikey: config.publishableKey, Authorization: `Bearer ${config.publishableKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!response.ok) throw new Error("Count unavailable");
      const count = await response.json();
      show(count);
    } finally { clearTimeout(timeout); }
  }
  async function flushDraws() {
    if (sending) return;
    sending = true;
    try {
      while (pendingDraws.length) {
        // The existing RPC deduplicates deliveries, now by draw rather than browser.
        const body = { p_visitor_id: pendingDraws[0] };
        try { await request("record_astro_card_participant", body); }
        catch { await request("record_astro_card_participant", body); }
        pendingDraws.shift();
      }
    } catch { /* Retain the same draw ID for a retry on the next draw or reconnection. */ }
    finally { sending = false; }
  }
  document.addEventListener("astro-cards:drawn", () => {
    pendingDraws.push(crypto.randomUUID());
    flushDraws();
  });
  window.addEventListener("online", flushDraws);
  request("get_astro_card_participant_count").catch(() => {
    if (!displayed) output.textContent = "暫時無法讀取";
  });
}());
