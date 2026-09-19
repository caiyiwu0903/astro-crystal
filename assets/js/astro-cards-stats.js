(function () {
  "use strict";
  const output = document.querySelector("#cards-participant-count");
  const config = window.ASTRO_SUPABASE;
  if (!output || !config?.url || !config?.publishableKey) return;
  let displayed = 0;
  let recorded = false;
  let pending = false;
  const storageKey = "astro-crystal:cards:visitor:v1";
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
  function visitorId() {
    try {
      let id = localStorage.getItem(storageKey);
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id || "")) {
        id = crypto.randomUUID();
        localStorage.setItem(storageKey, id);
      }
      return id;
    } catch { return null; } // Do not inflate the estimate when persistent storage is unavailable.
  }
  document.addEventListener("astro-cards:drawn", async () => {
    if (recorded || pending) return;
    pending = true;
    try {
      const id = navigator.locks
        ? await navigator.locks.request(storageKey, visitorId)
        : visitorId();
      if (!id) return;
      await request("record_astro_card_participant", { p_visitor_id: id });
      recorded = true;
    } catch { /* Same identifier makes the next draw a safe retry after uncertain network delivery. */ }
    finally { pending = false; }
  });
  request("get_astro_card_participant_count").catch(() => {
    if (!displayed) output.textContent = "暫時無法讀取";
  });
}());
