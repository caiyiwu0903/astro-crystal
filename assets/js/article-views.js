(() => {
  const config = window.ASTRO_SUPABASE;
  const viewElements = [...document.querySelectorAll("[data-article-view]")];

  if (!config?.url || !config?.publishableKey || viewElements.length === 0) return;

  const requestCount = async (slug, increment) => {
    const response = await fetch(
      `${config.url}/rest/v1/rpc/${increment ? "increment_article_view" : "get_article_view_count"}`,
      {
        method: "POST",
        headers: {
          apikey: config.publishableKey,
          Authorization: `Bearer ${config.publishableKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ p_slug: slug })
      }
    );

    if (!response.ok) throw new Error("Unable to load article views");
    return Number(await response.json());
  };

  const formatCount = (count) => new Intl.NumberFormat("zh-TW").format(count);
  const currentSlug = document.body.dataset.articleSlug;

  const updateView = async (element) => {
    const slug = element.dataset.articleView;
    let increment = slug === currentSlug;
    let sessionKey = "";

    if (increment) {
      sessionKey = `astro-crystal:viewed:${slug}`;
      try {
        increment = sessionStorage.getItem(sessionKey) !== "1";
      } catch {
        // Privacy settings may disable session storage; the counter still works.
      }
    }

    try {
      const count = await requestCount(slug, increment);
      if (increment && sessionKey) {
        try {
          sessionStorage.setItem(sessionKey, "1");
        } catch {
          // The count has succeeded even if storage is unavailable.
        }
      }
      element.textContent = formatCount(count);
      element.closest("[data-article-view-stat]")?.removeAttribute("hidden");
    } catch {
      // Keep the article readable if analytics is temporarily unavailable.
    }
  };

  viewElements.forEach(updateView);
})();
