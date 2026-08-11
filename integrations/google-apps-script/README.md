# Google Sheets booking sync

`Code.gs` receives Supabase database webhooks for new rows in
`consultation_bookings` and `course_applications`, then appends each submission
to the corresponding tab in the Google Sheet:

- `星盤諮詢預約`
- `課程報名`

The script does not send notification emails.

## One-time setup

1. Open the target Google Sheet.
2. Choose **Extensions → Apps Script**.
3. Replace the editor contents with `Code.gs` and save.
4. In **Project Settings → Script Properties**, add `WEBHOOK_TOKEN` with a long,
   random value. Do not commit this value.
5. Deploy as a web app:
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Copy the deployed `/exec` URL.
7. In Supabase, create database webhooks for `INSERT` events on both tables and
   use this URL format:

   `https://script.google.com/macros/s/DEPLOYMENT_ID/exec?token=WEBHOOK_TOKEN`

The token and deployment URL must remain outside the repository.

## Verification

Submit one test consultation and one test course application from the website.
Confirm that exactly one row appears in each Google Sheet tab and that the
`資料來源` cell contains the Supabase record ID.
