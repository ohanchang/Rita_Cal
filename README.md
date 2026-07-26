# 🍱 Rita Calorie Tracker (Rita_Cal)

智慧卡路里與 InBody 健康數據追蹤系統，整合 **Google Gemini AI 視覺辨識** 與 **Notion API** 資料庫同步。

---

## ✨ 核心功能特色

### 1. 📸 智慧飲食相機與 AI 估算
* **單圖估算**：拍攝食物照片，自動辨識餐點名稱、品項明細與熱量/三大營養素估算。
* **⚖️ 餐前與餐後照片比對分析 (v1.1 新功能)**：
  * 同時上傳「餐前照片」與「餐後剩餘照片」。
  * AI 自動比對並計算各食物實際吃掉的百分比（Portion Consumed），精確估算【實際攝取量】。
* **📋 營養標示 OCR 讀取**：上傳食品外包裝標示，自動計算全包裝總熱量與營養素。

### 2. 📊 Notion 雲端資料庫無縫同步
* 飲食與 InBody 數據即時同步寫入 Notion Database。
* 內建 TTL 快取機制 (Zustand + Memory Cache)，提升頁面載入速度與防手抖寫入。

### 3. 📈 InBody 身體組成分析與 AI 輔助辨識 (v1.2 新功能)
* 支援肌肉量、體脂率、內臟脂肪、基代等數據紀錄與肢體肌肉/體脂熱力圖分析。
* **📝 InBody 輔助文字說明/備註 (v1.2)**：在上傳 InBody 報告截圖時，可搭配填寫選填的備註文字（如日期、身高或特異水腫備註），供 AI 優先參照進行高精度解析。
* **🏷️ 全站版本號標示 (v1.2)**：所有主頁面頂端 Header 與設定頁均整合 `v1.2` 標籤，便於確認最新版本狀態。

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
