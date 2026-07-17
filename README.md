# 放心占星相談所形象網站

放心占星相談所的第一版官方形象網站，內容包含：

- 品牌與老師介紹
- 古典占星專業解盤師養成班
- 星盤諮詢服務
- 線上諮詢預約與課程報名
- 私密管理者登入與預約管理
- 服務規則與隱私聲明

## 網站技術

純 HTML、CSS 與 JavaScript 製作，不需要安裝套件或建置程序；前台部署於 GitHub Pages，表單與管理資料使用 Supabase。

## GitHub Pages

- 正式網站：<https://caiyiwu0903.github.io/astro-crystal/>
- 預約表單：`booking.html`
- 管理頁：`admin.html`（僅指定管理者 Email 可登入）

## Supabase 安全設計

- `consultation_bookings`：星盤諮詢預約
- `course_applications`：課程報名
- 兩表皆啟用 Row Level Security
- 未登入訪客只能新增資料，不能讀取、修改或刪除
- 僅 `caiyiwu0903@gmail.com` 登入後可管理資料
- 網頁只使用 Publishable key，絕不放入 Secret key

資料庫版本檔位於 `supabase/migrations/`。

## 內容更新

主要頁面：`index.html`、`course.html`、`consultation.html`、`about.html`、`booking.html`。

樣式位於 `assets/css/styles.css`，互動功能位於 `assets/js/`，圖片位於 `assets/images/`。
