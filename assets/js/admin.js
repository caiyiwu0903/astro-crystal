(() => {
  "use strict";

  const config = window.ASTRO_SUPABASE;
  if (!config || !window.supabase) return;

  const client = window.supabase.createClient(config.url, config.publishableKey);
  const loginPanel = document.querySelector("[data-admin-login]");
  const dashboard = document.querySelector("[data-admin-dashboard]");
  const loginForm = document.querySelector("[data-admin-login-form]");
  const loginStatus = document.querySelector("[data-admin-login-status]");
  const list = document.querySelector("[data-admin-list]");
  const filterButtons = [...document.querySelectorAll("[data-admin-filter]")];
  let currentType = "consultation";

  const setLoginStatus = (message, state = "") => {
    loginStatus.textContent = message;
    loginStatus.dataset.state = state;
  };

  const valueRow = (label, value) => {
    if (value === null || value === undefined || value === "") return null;
    const row = document.createElement("div");
    row.className = "admin-record__row";
    const term = document.createElement("strong");
    term.textContent = label;
    const detail = document.createElement("span");
    detail.textContent = String(value);
    row.append(term, detail);
    return row;
  };

  const labelFor = {
    line: "LINE",
    instagram: "Instagram",
    facebook: "Facebook",
    email: "Email",
    online: "線上 Google Meet",
    in_person: "台北實體",
    online_group: "線上課程",
    taipei_group: "台北實體小班",
    in_person_one_to_one: "實體一對一",
    online_one_to_one: "線上一對一",
    recorded: "完整錄播課程"
  };

  const statusOptions = {
    consultation: ["pending", "contacted", "confirmed", "completed", "cancelled"],
    course: ["pending", "contacted", "confirmed", "enrolled", "cancelled"]
  };

  const statusLabels = {
    pending: "待聯絡",
    contacted: "已聯絡",
    confirmed: "已確認",
    completed: "已完成",
    enrolled: "已入學",
    cancelled: "已取消"
  };

  const saveRecord = async (table, id, status, internalNotes, button) => {
    button.disabled = true;
    button.textContent = "儲存中…";
    const { error } = await client
      .from(table)
      .update({ status, internal_notes: internalNotes || null })
      .eq("id", id);
    button.disabled = false;
    button.textContent = error ? "儲存失敗，請重試" : "已儲存";
    button.dataset.state = error ? "error" : "success";
    window.setTimeout(() => {
      button.textContent = "儲存狀態與備註";
      button.dataset.state = "";
    }, 1800);
  };

  const renderRecord = (record, type) => {
    const article = document.createElement("article");
    article.className = "admin-record";
    const heading = document.createElement("div");
    heading.className = "admin-record__heading";
    const title = document.createElement("h3");
    title.textContent = record.full_name;
    const time = document.createElement("time");
    time.dateTime = record.created_at;
    time.textContent = new Intl.DateTimeFormat("zh-TW", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(record.created_at));
    heading.append(title, time);
    article.append(heading);

    const rows = type === "consultation"
      ? [
          valueRow("聯絡方式", `${labelFor[record.contact_channel] || record.contact_channel}｜${record.contact_value}`),
          valueRow("諮詢形式", labelFor[record.consultation_mode] || record.consultation_mode),
          valueRow("出生日期", record.birth_date),
          valueRow("出生時間", record.birth_time ? `${record.birth_time.slice(0, 5)}${record.birth_time_is_exact ? "（準確）" : "（不確定）"}` : "未提供"),
          valueRow("出生地點", record.birth_place),
          valueRow("想詢問的問題", record.question),
          valueRow("可諮詢日期", record.preferred_dates)
        ]
      : [
          valueRow("聯絡方式", `${labelFor[record.contact_channel] || record.contact_channel}｜${record.contact_value}`),
          valueRow("占星背景", record.astrology_background),
          valueRow("希望形式", labelFor[record.preferred_format] || record.preferred_format),
          valueRow("可上課日期", record.available_dates),
          valueRow("其他說明", record.message)
        ];
    rows.filter(Boolean).forEach((row) => article.append(row));

    const controls = document.createElement("div");
    controls.className = "admin-record__controls";
    const statusLabel = document.createElement("label");
    statusLabel.textContent = "處理狀態";
    const status = document.createElement("select");
    statusOptions[type].forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = statusLabels[value];
      option.selected = value === record.status;
      status.append(option);
    });
    statusLabel.append(status);

    const notesLabel = document.createElement("label");
    notesLabel.textContent = "內部備註（訪客看不到）";
    const notes = document.createElement("textarea");
    notes.rows = 3;
    notes.value = record.internal_notes || "";
    notesLabel.append(notes);

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.className = "button button--primary button--small";
    saveButton.textContent = "儲存狀態與備註";
    const table = type === "consultation" ? "consultation_bookings" : "course_applications";
    saveButton.addEventListener("click", () => saveRecord(table, record.id, status.value, notes.value.trim(), saveButton));
    controls.append(statusLabel, notesLabel, saveButton);
    article.append(controls);
    return article;
  };

  const loadRecords = async (type) => {
    currentType = type;
    filterButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.adminFilter === type));
    });
    list.textContent = "載入中…";
    const table = type === "consultation" ? "consultation_bookings" : "course_applications";
    const { data, error } = await client.from(table).select("*").order("created_at", { ascending: false });
    list.textContent = "";
    if (error) {
      list.textContent = "無法讀取資料，請確認登入 Email 與網路連線。";
      return;
    }
    if (!data.length) {
      list.textContent = "目前尚無資料。";
      return;
    }
    data.forEach((record) => list.append(renderRecord(record, type)));
  };

  const showSession = async (session) => {
    const email = session?.user?.email?.toLowerCase();
    const isAdmin = email === config.adminEmail.toLowerCase();
    loginPanel.hidden = Boolean(isAdmin);
    dashboard.hidden = !isAdmin;
    if (session && !isAdmin) {
      await client.auth.signOut();
      setLoginStatus("此帳號沒有管理權限。", "error");
      return;
    }
    if (isAdmin) loadRecords(currentType);
  };

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = loginForm.querySelector("button[type='submit']");
    button.disabled = true;
    setLoginStatus("寄送登入連結中…");
    const { error } = await client.auth.signInWithOtp({
      email: config.adminEmail,
      options: { emailRedirectTo: window.location.href.split("#")[0] }
    });
    button.disabled = false;
    setLoginStatus(
      error ? "無法寄送登入信，請稍後再試。" : `登入連結已寄到 ${config.adminEmail}，請開啟信件完成登入。`,
      error ? "error" : "success"
    );
  });

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => loadRecords(button.dataset.adminFilter));
  });

  document.querySelector("[data-admin-refresh]").addEventListener("click", () => loadRecords(currentType));
  document.querySelector("[data-admin-signout]").addEventListener("click", async () => {
    await client.auth.signOut();
    window.location.reload();
  });

  client.auth.getSession().then(({ data }) => showSession(data.session));
  client.auth.onAuthStateChange((_event, session) => showSession(session));
})();
