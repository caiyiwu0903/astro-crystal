const SPREADSHEET_ID = "1ITyMusCHtmx-EeZB5CLFlGhlgwbOE4fu7Dd2-bULlYs";
const CONSULTATION_SHEET = "星盤諮詢預約";
const COURSE_SHEET = "課程報名";
const ALLOWED_TABLES = ["consultation_bookings", "course_applications"];

function doGet() {
  return jsonResponse_({ ok: true, service: "astro-crystal-booking-sheet-sync" });
}

function doPost(e) {
  const lock = LockService.getScriptLock();

  try {
    const expectedToken = PropertiesService.getScriptProperties().getProperty("WEBHOOK_TOKEN");
    const suppliedToken = String((e && e.parameter && e.parameter.token) || "");
    if (!expectedToken || suppliedToken !== expectedToken) {
      return jsonResponse_({ ok: false, error: "unauthorized" });
    }

    const payload = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const table = String(payload.table || "");
    const record = payload.record || {};

    if (payload.type !== "INSERT" || !ALLOWED_TABLES.includes(table) || !record.id) {
      return jsonResponse_({ ok: false, error: "invalid_payload" });
    }

    const cache = CacheService.getScriptCache();
    const cacheKey = `booking-sheet-${record.id}`;
    if (cache.get(cacheKey)) {
      return jsonResponse_({ ok: true, duplicate: true });
    }

    lock.waitLock(10000);
    appendBooking_(table, record);
    cache.put(cacheKey, "saved", 21600);

    return jsonResponse_({ ok: true });
  } catch (error) {
    console.error(error);
    return jsonResponse_({ ok: false, error: "internal_error" });
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function appendBooking_(table, record) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const submittedAt = record.created_at ? new Date(record.created_at) : new Date();
  const source = `網站表單｜資料編號：${record.id}`;

  if (table === "consultation_bookings") {
    const sheet = requireSheet_(spreadsheet, CONSULTATION_SHEET);
    sheet.appendRow([
      submittedAt,
      safe_(record.full_name),
      safe_(record.contact_channel),
      safe_(record.contact_value),
      safe_(record.consultation_mode),
      safe_(record.birth_date),
      safe_(record.birth_time),
      record.birth_time_is_exact ? "是" : "否",
      safe_(record.birth_place),
      safe_(record.question),
      safe_(record.preferred_dates),
      record.consent ? "是" : "否",
      source,
      "待處理",
      ""
    ]);
    return;
  }

  const sheet = requireSheet_(spreadsheet, COURSE_SHEET);
  sheet.appendRow([
    submittedAt,
    safe_(record.full_name),
    safe_(record.contact_channel),
    safe_(record.contact_value),
    safe_(record.astrology_background),
    safe_(record.preferred_format),
    safe_(record.available_dates),
    safe_(record.message),
    record.consent ? "是" : "否",
    source,
    "待處理",
    ""
  ]);
}

function requireSheet_(spreadsheet, name) {
  const sheet = spreadsheet.getSheetByName(name);
  if (!sheet) throw new Error(`Missing sheet: ${name}`);
  return sheet;
}

function safe_(value) {
  if (value == null) return "";
  const text = String(value);
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function jsonResponse_(body) {
  return ContentService.createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}
