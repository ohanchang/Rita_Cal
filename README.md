# 🍱 Rita Calorie Tracker (Rita_Cal)

智慧卡路里與 InBody 健康數據追蹤系統，整合 **Google Gemini AI 視覺辨識**、**Mounjaro (GLP-1) 施打日曆追蹤** 與 **Notion API** 資料庫同步。

---

## ✨ 核心功能特色

### 1. 📸 智慧飲食相機與 AI 估算
* **單圖估算**：拍攝食物照片，自動辨識餐點名稱、品項明細與熱量/三大營養素估算。
* **⚖️ 餐前與餐後照片比對分析 (v1.1)**：
  * 同時上傳「餐前照片」與「餐後剩餘照片」。
  * AI 自動比對並計算各食物實際吃掉的百分比（Portion Consumed），精確估算【實際攝取量】。
* **📋 營養標示 OCR 讀取**：上傳食品外包裝標示，自動計算全包裝總熱量與營養素。

### 2. 📊 Notion 雲端資料庫無縫同步
* 飲食、InBody 數據與 Mounjaro 用藥紀錄即時同步寫入 Notion Database。
* 內建 TTL 快取機制 (Zustand + Memory Cache)，提升頁面載入速度與防手抖寫入。

### 3. 📈 InBody 身體組成分析與 AI 輔助辨識 (v1.2 ~ v1.6)
* 支援肌肉量、體脂率、內臟脂肪、基代等數據紀錄與肢體肌肉/體脂熱力圖分析 (`SegmentalDiagram` & `HeatmapBody`)。
* **📝 InBody 輔助文字說明/備註**：在上傳 InBody 報告截圖時，可搭配填寫選填的備註文字，供 AI 優先參照進行高精度解析。
* **📊 凍結首欄歷史表格 (v1.5)**：手機端橫向滾動查看 InBody 歷史數據時，日期欄固定凍結，瀏覽體驗更順暢。
* **🤖 多筆歷史數據交叉 AI 分析 (v1.6)**：AI 不僅讀取當前數據，更能結合近 5 次 InBody 紀錄與用藥數據進行時間軸比對，主動監控骨骼肌重流失狀態。

### 4. 💉 Mounjaro (GLP-1) 互動式日曆追蹤 (v1.4 ~ v1.6.1)
* **📅 互動式打針日曆**：以直觀日曆檢視每月施打紀錄，點擊日期即可快速新增、修改或刪除劑量（2.5mg, 5.0mg, 7.5mg 等）。
* **⚡ 最佳化觸控互動**：重構為標準點擊與中央彈窗（Centered Modal），徹底消除行動裝置上的閃爍與 Ghost Click。
* **🔗 藥物與 InBody 連動**：用藥時間軸自動注入 InBody AI 分析，協助評估 GLP-1 對體重與肌肉量的影響。

---

## 🛠️ 技術棧 (Tech Stack)

* **Framework**: Next.js 16 (App Router, Turbopack)
* **Language**: TypeScript
* **State Management**: Zustand
* **AI Model**: Google Gemini API (Gemini 2.5 Flash / Gemini 2.0 Flash)
* **Database / Backend**: Notion API (`@notionhq/client`)
* **Styling**: Vanilla CSS Variables & Neumorphism UI Design

---

## 🚀 快速開始 (Getting Started)

### 1. 安裝套件
```bash
npm install
```

### 2. 設定環境變數 (`.env.local`)
請建立 `.env.local` 檔案並填入相應 API Keys：
```env
GEMINI_API_KEY=your_gemini_api_key
NOTION_API_KEY=your_notion_api_key
NOTION_DATABASE_ID=your_notion_database_id
```

### 3. 啟動開發伺服器
```bash
npm run dev
```
瀏覽器打開 `http://localhost:3000` 即可開始使用。

---

## 📝 變更紀錄 (Changelog)

詳細優化與版本變更請參閱 [log.md](./log.md)。
