# 問題本地辨識

本階段只分類，不生成解讀；不呼叫 API、不新增資料庫或套件。既有 `astro-cards-engine.js`、`astro-cards-data.js` 完全不修改。

## 檔案與流程

- `assets/js/question-classifier.js`：獨立純函式 `QuestionClassifier.classify(question)`。關鍵字、權重、領域／意圖／時間名稱、圖示、確認句都放在 `config`。
- `assets/js/question-classifier-ui.js`：確認／人工修正與當頁記憶體管理。
- `astro-cards.js`：原本表單送出前加入 `AstroQuestionContext.request(question, drawCards)`，確認後才走原抽牌程序。取代原來只涵蓋三種模式的切換提示；分類不自動切換模式，也不送入牌義引擎。
- 問題文字仍由既有 textarea 和 `activeQuestion` 保存，沒有新增持久化儲存。空白選填問題保留直接抽牌。
- 先前 AI 單题原型不再從 HTML 載入或提供入口。其歷史檔案仍保留，但本頁完全不使用；舊 `astro-single-browser.cjs` 是該原型專用測試，不適用於目前 UI。

## 規則

領域每個不同關鍵字加權一次，不因重複輸入加分，同領域重疊字詞優先長詞。共享詞「同事」會同時加職涯與人際分數。零分不列入前兩名；全部零分為 general，secondaryTopic 為 null。平手按 topicOrder 穩定排序，使用者可修正。男朋友／女朋友正規化，避免同時被當成一般朋友。

意圖固定優先順序：對方想法 > 選擇 > 原因 > 下一步 > 未來發展 > 目前狀態。時間優先順序：今天 > 本週 > 本月 > 未來 > 近期。這些都是可修改的規則，並非語意模型；不承諾理解否定、反諷或所有語境。

## 分類結果

`window.AstroQuestionContext.getConfirmed()` 回傳獨立副本：

```js
{ primaryTopic: 'career', secondaryTopic: 'relationship', intent: 'decision',
  timeContext: 'current', scores: { love: 0, career: 5, money: 0, relationship: 2, self: 0 }, source: 'rules' }
```

確認前為 null。人工選擇 source 為 manual，secondaryTopic 清空；scores 保留原規則分數供診斷，不能用它覆蓋人工領域。相同問題重抽仍保留人工選擇。修改問題／重整／歷史導覽會清除，沒有 localStorage、sessionStorage、cookie 或 URL 保存；不提供跨頁／跨重整保存。

## 驗證

`node tests/question-classifier.cjs`、`node tests/astro-cards-engine.cjs`。

瀏覽器測試：本機靜態伺服器 4173，外部 Playwright 環境下執行 `node tests/question-classifier-browser.cjs`。可用 `CARDS_TEST_WEBKIT=1` 切換 WebKit。測試隔離正式統計，驗證不發出任何 AI 請求。

本專案無 package.json，沒有既有 lint/typecheck/build 指令；採用 `node --check` 語法檢查與現有網站驗證工具。不新增建置程序。

2026-09-29 驗證：分類單元測試、5,184 組既有解讀、Chrome 新流程、原問題／複製測試、抽牌過場，以及原瀏覽器 7 種視窗寬度測試均通過。網站資源連結、文字與結構化資料檢查通過。WebKit 因目前環境缺少 javascriptcore.dll / webcore.dll / webkit2.dll 無法啟動，本次不宣稱已完成 Safari 實機驗證。未部署。
