# 開發變更紀錄 (log.md)

此檔案記錄本次 Food Calories Tracker 專案所有針對 UI 視覺品質、資料讀取流暢性與延伸功能的優化歷程。

## 🛠️ 變更項目詳解

### 1. 拍照分析後的備註欄位不足與歷史回溯
* **檔案**：`src/app/scan/confirm/page.tsx` & `src/app/history/page.tsx`
* **優化做法**：
  * 將確認頁面文字區域改設為 `min-height: 160px`。
  * 讓記錄編輯器整合 `note` 字串接口。

### 2. InBody 排版間隙與底部截斷修正
* **檔案**：`src/components/InBodyVisuals.tsx`
* **優化做法**：
  * 將下方左右腿數據區從緊貼邊緣移開至中央（`16px` 空間）。
  * 升高至 `bottom: 12px`，終止容器裁剪重疊。

### 3. 彈窗滑動阻力移除
* **檔案**：`src/components/InBodyModal.tsx`
* **優化做法**：
  * 放棄全螢幕 `min-height` 特效，還原流暢捲動。

### 4. 「常用餐點」重組與刪除指令
* **檔案**：`src/app/search/page.tsx` & `confirm/page.tsx`
* **優化做法**：
  * 取消舊版「我的最愛」，置換成包含 ✕ 按鈕的靈活標籤結構。

---

## 💡 關於「常用餐點」存儲架構建議與反饋

**建議維持本地存儲原因：**
1. **Vercel 部署限制**：Node 執行階段之物理檔案無法保存跨階段數據。
2. **回應敏捷性**：避免 Notion API 在初始化時造成的負載阻塞。

---

## 🚀 v0.9 綜合品質優化（2026-05-01）

基於實機（iPhone 15 Pro Max）使用回饋與完整源碼審查，進行 10 項改進。

### 1. Next.js 16 viewport 元標籤修正
* **檔案**：`src/app/layout.tsx`
* **做法**：將棄用的 `metadata.viewport` 分離為 `export const viewport: Viewport`，消除 build 警告，確保 iPhone 正確禁止雙指縮放。

### 2. Notion API TTL 快取策略
* **檔案**：`src/lib/store.ts`、`src/lib/useRecords.ts`
* **做法**：在 Zustand Store 加入 `recordsLoadedAt` 時間戳與 `isRecordsCacheValid()` 方法（TTL 30 秒）。`useRecords` 改為快取未失效時直接使用本地資料，不重複請求 Notion，大幅提升頁面切換速度。

### 3. 品項明細 JSON 安全截斷
* **檔案**：`src/lib/notion.ts`
* **做法**：新增 `serializeItems()` 函式，先壓縮非核心欄位（confidence、portion），若仍超 2000 字元則逐一移除末尾品項，確保儲存的 JSON 永遠合法可解析，杜絕靜默資料損壞。

### 4. SVG filter ID 衝突修正
* **檔案**：`src/components/InBodyVisuals.tsx`
* **做法**：`HeatmapBody` 新增 `filterId` prop，`SegmentalDiagram` 基於 `label` 生成唯一 ID（如 `heatGlow-----`），解決同頁兩個分析圖共用 filter 的 DOM ID 衝突。

### 5. Dark Mode FloatingCard 白底修正
* **檔案**：`src/components/InBodyVisuals.tsx`
* **做法**：將 `background: "rgba(255,255,255,0.7)"` 改為 `background: "var(--color-bg-card)"`，Dark Mode 下卡片背景正確跟隨主題色。

### 6. 底部導覽列精簡（7→6 項）
* **檔案**：`src/components/BottomNav.tsx`、`src/app/page.tsx`
* **做法**：從底部導覽列移除「設定」，改在首頁右上角加入 ⚙️ 圓形捷徑按鈕，每個 nav 項目觸控熱區更寬敞。

### 7. Zustand Store 型別強化與功能補全
* **檔案**：`src/lib/store.ts`
* **做法**：以具體的 `FavoriteItem` interface 取代 `any[]`；新增 `updateFoodOptimistic()` action（之前只有 add/remove，缺少 update）；移除所有 `any` 型別。

### 8. useRecords 與 Zustand 架構統一
* **檔案**：`src/lib/useRecords.ts`
* **做法**：`useRecords()` 完全基於 `useAppStore` 運作，暴露 `updateFoodOptimistic` 等 optimistic helpers，架構不再雙軌分離。

### 9. EXIF 時區動態偵測
* **檔案**：`src/app/scan/page.tsx`
* **做法**：改用 `Intl.DateTimeFormat().resolvedOptions().timeZone` 取得使用者的系統時區，取代硬編碼 `Asia/Taipei`。

### 10. 歷史記錄營養素數值可編輯
* **檔案**：`src/app/history/page.tsx`
* **做法**：在歷史編輯 Modal 中新增熱量、蛋白質、碳水、脂肪、膳食纖維五個數字輸入欄，儲存時同步更新至 Notion，解決 AI 估算錯誤無法手動校正的問題。

---

## 🚀 v1.1 餐前與餐後照片比對估算實際攝取量 (2026-07-19)

為了解決使用者「不會整份吃完，依照單張照片估算卡路里過高」的痛點，新增「餐前與餐後照片比對分析」功能。

### 1. 雙圖比對核心辨識機制 (Before & After Comparison)
* **檔案**：`src/lib/gemini.ts`
* **做法**：
  * 新增 `buildBeforeAfterFoodPrompt()` 方法，建立專屬 Prompt。引導 AI 比對餐前照片與餐後剩餘照片，精估每種食物「實際吃掉的百分比 (portion consumed)」。
  * 估算的卡路里、蛋白質、碳水、脂肪、膳食纖維皆為【實際攝取量】，並將雙圖比對細節與未食用完的食物狀態寫入 `note` 備註中。
  * `analyzeFood` 擴展支援 `scanMode: "before_after"` 與 `afterImageBase64` 參數，自動走 Fallback 策略進行多模型與多 API Key 的呼叫嘗試。

### 2. 雙圖拍照上傳與 UI 優化 (Neumorphism UI Adjustments)
* **檔案**：`src/app/scan/page.tsx`
* **做法**：
  * 新增「單張照片」與「餐前/餐後比對」分頁式切換 (Tabs)。
  * 重構圖片上傳區域，支援雙區獨立選擇（餐前與餐後剩餘照片），並提供精美的雙圖預覽框。
  * 強化載入/分析中狀態，在單圖及雙圖模式下提供優雅的動態載入提示。
  * 串接 `/api/analyze` 路由將餐前/餐後照片同時轉為 base64 送往後端。

### 3. 確認頁面雙圖辨識提示與儲存優化
* **檔案**：`src/app/scan/confirm/page.tsx`
* **做法**：
  * 透過 `sessionStorage` 傳遞 `scanMode` 參數。
  * 在 `/scan/confirm` 頁面頂端加入專屬提示 Banner，明確提醒使用者「已使用餐前與餐後照片比對分析，以下數值為實際攝取量」。
