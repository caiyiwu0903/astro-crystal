(() => {
  "use strict";

  const config = window.ASTRO_SUPABASE;
  if (!config || !window.supabase) return;

  const client = window.supabase.createClient(config.url, config.publishableKey);
  const tabs = [...document.querySelectorAll("[data-booking-tab]")];
  const panels = [...document.querySelectorAll("[data-booking-panel]")];
  const queryType = new URLSearchParams(window.location.search).get("type");

  const setActiveType = (type) => {
    const activeType = type === "course" ? "course" : "consultation";
    tabs.forEach((tab) => {
      const isActive = tab.dataset.bookingTab === activeType;
      tab.setAttribute("aria-selected", String(isActive));
      tab.tabIndex = isActive ? 0 : -1;
    });
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.bookingPanel !== activeType;
    });
    const url = new URL(window.location.href);
    url.searchParams.set("type", activeType);
    window.history.replaceState({}, "", url);
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => setActiveType(tab.dataset.bookingTab));
  });
  setActiveType(queryType);

  const clean = (formData, name) => String(formData.get(name) || "").trim();

  const setStatus = (form, message, state = "") => {
    const status = form.querySelector("[data-form-status]");
    status.textContent = message;
    status.dataset.state = state;
  };

  const submitForm = async (form) => {
    const button = form.querySelector("button[type='submit']");
    const data = new FormData(form);

    if (clean(data, "website")) return;
    if (Number(data.get("form_started_at")) > Date.now() - 1500) {
      setStatus(form, "請稍候一秒再送出表單。", "error");
      return;
    }

    button.disabled = true;
    button.dataset.originalText = button.textContent;
    button.textContent = "安全送出中…";
    setStatus(form, "", "");

    try {
      let table;
      let record;

      if (form.dataset.formType === "consultation") {
        table = "consultation_bookings";
        record = {
          full_name: clean(data, "full_name"),
          contact_channel: clean(data, "contact_channel"),
          contact_value: clean(data, "contact_value"),
          consultation_mode: clean(data, "consultation_mode"),
          birth_date: clean(data, "birth_date") || null,
          birth_time: clean(data, "birth_time") || null,
          birth_time_is_exact: data.get("birth_time_is_exact") === "true",
          birth_place: clean(data, "birth_place") || null,
          question: clean(data, "question"),
          preferred_dates: clean(data, "preferred_dates"),
          consent: data.get("consent") === "on"
        };
      } else {
        table = "course_applications";
        record = {
          full_name: clean(data, "full_name"),
          contact_channel: clean(data, "contact_channel"),
          contact_value: clean(data, "contact_value"),
          astrology_background: clean(data, "astrology_background"),
          preferred_format: clean(data, "preferred_format"),
          available_dates: clean(data, "available_dates"),
          message: clean(data, "message") || null,
          consent: data.get("consent") === "on"
        };
      }

      const { error } = await client.from(table).insert(record);
      if (error) throw error;

      form.reset();
      form.querySelector("[name='form_started_at']").value = String(Date.now());
      setStatus(
        form,
        "已安全送出！星心老師將透過你填寫的聯絡方式回覆。送出表單不代表預約或報名成立，仍須確認時間與付款。",
        "success"
      );
      form.querySelector("[data-form-status]").focus();
    } catch (error) {
      console.error("Booking submission failed", error);
      setStatus(form, "目前無法送出，請稍後再試，或改用 LINE 聯絡星心老師。", "error");
    } finally {
      button.disabled = false;
      button.textContent = button.dataset.originalText;
    }
  };

  document.querySelectorAll("[data-booking-form]").forEach((form) => {
    form.querySelector("[name='form_started_at']").value = String(Date.now());
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (form.reportValidity()) submitForm(form);
    });
  });
})();
