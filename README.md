# 放心占星相談所形象網站

放心占星相談所的第一版官方形象網站，內容包含：

- 品牌與老師介紹
- 古典占星專業解盤師養成班
- 星盤諮詢服務
- 預約方式、服務規則與隱私聲明

## 網站技術

純 HTML、CSS 與 JavaScript 製作，不需要安裝套件或建置程序，適合直接部署到 Cloudflare Pages。

## Cloudflare Pages 部署設定

- Framework preset：None
- Build command：留空
- Build output directory：`/`

部署完成後，請將正式網址補入各頁的 canonical、Open Graph 網址與 `sitemap.xml`，並向 Google Search Console 提交網站。

## 內容更新

主要頁面：`index.html`、`course.html`、`consultation.html`、`about.html`。

樣式位於 `assets/css/styles.css`，互動功能位於 `assets/js/main.js`，圖片位於 `assets/images/`。

