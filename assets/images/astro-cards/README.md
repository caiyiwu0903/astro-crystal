# 牌卡圖片

36 張牌保留穩定的 `card_image_key`（P01–P12、S01–S12、H01–H12）。
圖片完成後放在本目錄，於 `assets/js/astro-cards-data.js` 的對應牌卡設定
`card_image_url`，例如 `assets/images/astro-cards/P01.webp`。
空字串或載入失敗會使用原有 CSS 示意牌；牌名與關鍵字仍以文字呈現。
建議圖片比例為 3:4，不要把必要文字僅放進圖片。
