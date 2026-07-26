"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { isDemoMode } from "@/lib/demo-mode";
import { MOCK_FOOD_RECORDS } from "@/lib/mock-data";
import { SCALE_REFERENCES } from "@/lib/types";
import exifr from "exifr";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getBase64Size(base64: string): number {
  const raw = base64.includes(",") ? base64.split(",")[1] : base64;
  return Math.round((raw.length * 3) / 4);
}

async function compressImage(dataUrl: string, maxDim: number = 1600, quality: number = 0.7): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.src = dataUrl;
  });
}

export default function ScanPage() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [afterImagePreview, setAfterImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [useOriginal, setUseOriginal] = useState(false);
  const [selectedScale, setSelectedScale] = useState("none");
  const [hintText, setHintText] = useState("");
  const [exifDate, setExifDate] = useState("");
  const [exifMealType, setExifMealType] = useState("");
  const [scanMode, setScanMode] = useState<"food" | "before_after" | "nutrition_label">("food");
  const [beforeSizeInfo, setBeforeSizeInfo] = useState<{ original: number; compressed: number } | null>(null);
  const [afterSizeInfo, setAfterSizeInfo] = useState<{ original: number; compressed: number } | null>(null);

  const beforeFileInputRef = useRef<HTMLInputElement>(null);
  const afterFileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const originalBeforeDataUrl = useRef<string | null>(null);
  const originalAfterDataUrl = useRef<string | null>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("請上傳圖片檔案");
      return;
    }

    setError("");

    if (type === 'before') {
      try {
        const exifData = await exifr.parse(file, ["DateTimeOriginal"]);
        if (exifData && exifData.DateTimeOriginal) {
          const dateObj = new Date(exifData.DateTimeOriginal);
          if (!isNaN(dateObj.getTime())) {
            const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const dateStr = dateObj.toLocaleDateString("sv-SE", { timeZone: userTimezone });
            setExifDate(dateStr);

            const hour = dateObj.getHours();
            let mealType = "午餐";
            if (hour >= 5 && hour < 11) mealType = "早餐";
            else if (hour >= 11 && hour < 14) mealType = "午餐";
            else if (hour >= 14 && hour < 17) mealType = "點心";
            else if (hour >= 17 && hour < 21) mealType = "晚餐";
            else mealType = "宵夜";

            setExifMealType(mealType);
          }
        } else {
          setExifDate("");
          setExifMealType("");
        }
      } catch (e) {
        console.warn("EXIF 解析失敗或照片無資訊", e);
        setExifDate("");
        setExifMealType("");
      }
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      const originalSize = getBase64Size(dataUrl);

      if (type === 'before') {
        originalBeforeDataUrl.current = dataUrl;
        if (useOriginal) {
          setImagePreview(dataUrl);
          setBeforeSizeInfo({ original: originalSize, compressed: originalSize });
        } else {
          const compressed = await compressImage(dataUrl);
          const compressedSize = getBase64Size(compressed);
          setImagePreview(compressed);
          setBeforeSizeInfo({ original: originalSize, compressed: compressedSize });
        }
      } else {
        originalAfterDataUrl.current = dataUrl;
        if (useOriginal) {
          setAfterImagePreview(dataUrl);
          setAfterSizeInfo({ original: originalSize, compressed: originalSize });
        } else {
          const compressed = await compressImage(dataUrl);
          const compressedSize = getBase64Size(compressed);
          setAfterImagePreview(compressed);
          setAfterSizeInfo({ original: originalSize, compressed: compressedSize });
        }
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleToggleOriginal(nextValue: boolean) {
    setUseOriginal(nextValue);
    
    if (originalBeforeDataUrl.current) {
      const originalSize = getBase64Size(originalBeforeDataUrl.current);
      if (nextValue) {
        setImagePreview(originalBeforeDataUrl.current);
        setBeforeSizeInfo({ original: originalSize, compressed: originalSize });
      } else {
        const compressed = await compressImage(originalBeforeDataUrl.current);
        const compressedSize = getBase64Size(compressed);
        setImagePreview(compressed);
        setBeforeSizeInfo({ original: originalSize, compressed: compressedSize });
      }
    }

    if (originalAfterDataUrl.current) {
      const originalSize = getBase64Size(originalAfterDataUrl.current);
      if (nextValue) {
        setAfterImagePreview(originalAfterDataUrl.current);
        setAfterSizeInfo({ original: originalSize, compressed: originalSize });
      } else {
        const compressed = await compressImage(originalAfterDataUrl.current);
        const compressedSize = getBase64Size(compressed);
        setAfterImagePreview(compressed);
        setAfterSizeInfo({ original: originalSize, compressed: compressedSize });
      }
    }
  }

  async function handleAnalyze() {
    if (!imagePreview) return;
    if (scanMode === "before_after" && !afterImagePreview) {
      setError("請提供餐後照片以進行比對");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const hintString = hintText.trim();
      if (isDemoMode()) {
        await new Promise((r) => setTimeout(r, 1500));
        let mock;
        if (scanMode === "before_after") {
          mock = {
            id: 'mock-before-after',
            foodName: hintString || '吃剩1/3的漢堡套餐',
            items: [
              { name: '起司牛肉漢堡', calories: 350, protein: 18, carbs: 32, fat: 16, fiber: 2, portion: '原一個吃掉70%約140g', confidence: '中' },
              { name: '炸薯條', calories: 150, protein: 2, carbs: 20, fat: 8, fiber: 2, portion: '原一整份吃掉約一半', confidence: '中' },
            ],
            totalCalories: 500,
            totalProtein: 20,
            totalCarbs: 52,
            totalFat: 24,
            totalFiber: 4,
            mealType: exifMealType || '午餐',
            source: '餐廳',
            restaurantName: '',
            date: exifDate || new Date().toISOString().split('T')[0],
            note: '【餐前/餐後雙圖比對分析】\n餐前估計：起司牛肉漢堡 (500 kcal)，炸薯條 (300 kcal)。\n餐後剩餘：漢堡剩餘約 30%，薯條剩餘約 50%。\n實際攝取：起司牛肉漢堡 (350 kcal, 吃掉 70%)，炸薯條 (150 kcal, 吃掉 50%)。實際攝取熱量比例約為整份的 62.5%。',
            overallConfidence: '中',
            createdAt: new Date().toISOString(),
          };
        } else {
          mock = { ...MOCK_FOOD_RECORDS[Math.floor(Math.random() * MOCK_FOOD_RECORDS.length)] };
          if (hintString) {
            mock.foodName = hintString;
          }
          mock.overallConfidence = "高";
        }
        sessionStorage.setItem("foodData", JSON.stringify(mock));
        router.push("/scan/confirm");
        return;
      }

      const scaleRef = SCALE_REFERENCES.find((s) => s.id === selectedScale);
      const scaleHint = scaleRef?.sizeHint || "";

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bodyData: any = {
        image: imagePreview,
        mimeType: "image/jpeg",
        scaleHint: scaleHint,
        hintText: hintString,
        exifDate,
        exifMealType,
        scanMode
      };

      if (scanMode === "before_after") {
        bodyData.afterImage = afterImagePreview;
        bodyData.afterMimeType = "image/jpeg";
      }

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData),
      });

      const json = await res.json();
      if (!json.success) {
        setError(json.error || "分析失敗");
        return;
      }

      const foodDataWithMode = {
        ...json.data,
        scanMode: scanMode
      };
      sessionStorage.setItem("foodData", JSON.stringify(foodDataWithMode));
      router.push("/scan/confirm");
    } catch (err) {
      setError("分析過程發生錯誤");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">📸 拍照辨識</h1>
      </div>

      {/* 掃描模式切換 */}
      <div style={{ display: "flex", gap: "var(--spacing-xs)", marginBottom: "var(--spacing-md)" }}>
        <button
          className={`btn btn-sm ${scanMode === "food" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => { setScanMode("food"); setError(""); }}
          style={{ flex: 1, padding: "0.4rem 0.3rem", fontSize: "0.75rem", whiteSpace: "nowrap" }}
        >
          🍔 單圖估算
        </button>
        <button
          className={`btn btn-sm ${scanMode === "before_after" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => { setScanMode("before_after"); setError(""); }}
          style={{ flex: 1, padding: "0.4rem 0.3rem", fontSize: "0.75rem", whiteSpace: "nowrap" }}
        >
          ⚖️ 餐前/餐後比對
        </button>
        <button
          className={`btn btn-sm ${scanMode === "nutrition_label" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => { setScanMode("nutrition_label"); setError(""); }}
          style={{ flex: 1, padding: "0.4rem 0.3rem", fontSize: "0.75rem", whiteSpace: "nowrap" }}
        >
          📋 營養標示 OCR
        </button>
      </div>

      {/* 上傳區域 */}
      {scanMode === "before_after" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--spacing-md)", marginBottom: "var(--spacing-md)" }}>
          {/* 餐前照片 */}
          <div
            className="card"
            style={{
              textAlign: "center",
              padding: "var(--spacing-md)",
              cursor: "pointer",
              border: imagePreview ? "2px solid var(--color-primary)" : "2px dashed var(--border-color)",
              transition: "all var(--transition-base)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              minHeight: "180px",
            }}
            onClick={() => beforeFileInputRef.current?.click()}
          >
            {imagePreview ? (
              <div>
                <img
                  src={imagePreview}
                  alt="餐前預覽"
                  style={{
                    maxWidth: "100%",
                    maxHeight: "140px",
                    borderRadius: "var(--radius-sm)",
                    objectFit: "contain",
                    margin: "0 auto",
                  }}
                />
                <div style={{ marginTop: "var(--spacing-sm)", fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                  📸 餐前 (點擊更換)
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: "2rem", marginBottom: "var(--spacing-xs)" }}>🥗</div>
                <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                  餐前照片
                </div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "4px" }}>
                  完整食物狀態
                </div>
              </div>
            )}
          </div>

          {/* 餐後照片 */}
          <div
            className="card"
            style={{
              textAlign: "center",
              padding: "var(--spacing-md)",
              cursor: "pointer",
              border: afterImagePreview ? "2px solid var(--color-primary)" : "2px dashed var(--border-color)",
              transition: "all var(--transition-base)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              minHeight: "180px",
            }}
            onClick={() => afterFileInputRef.current?.click()}
          >
            {afterImagePreview ? (
              <div>
                <img
                  src={afterImagePreview}
                  alt="餐後預覽"
                  style={{
                    maxWidth: "100%",
                    maxHeight: "140px",
                    borderRadius: "var(--radius-sm)",
                    objectFit: "contain",
                    margin: "0 auto",
                  }}
                />
                <div style={{ marginTop: "var(--spacing-sm)", fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                  🍽️ 餐後 (點擊更換)
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: "2rem", marginBottom: "var(--spacing-xs)" }}>🦴</div>
                <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                  餐後照片
                </div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "4px" }}>
                  吃完後剩餘狀態
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div
          className="card"
          style={{
            textAlign: "center",
            padding: "var(--spacing-2xl)",
            marginBottom: "var(--spacing-md)",
            cursor: "pointer",
            border: imagePreview ? "2px solid var(--color-primary)" : "2px dashed var(--border-color)",
            transition: "all var(--transition-base)",
          }}
          onClick={() => beforeFileInputRef.current?.click()}
        >
          {imagePreview ? (
            <div>
              <img
                src={imagePreview}
                alt="食物預覽"
                style={{
                  maxWidth: "100%",
                  maxHeight: "300px",
                  borderRadius: "var(--radius-md)",
                  objectFit: "contain",
                  margin: "0 auto",
                }}
              />
              <div style={{ marginTop: "var(--spacing-md)", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                點擊更換圖片
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: "3rem", marginBottom: "var(--spacing-md)" }}>🍱</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "var(--spacing-sm)" }}>
                {scanMode === "nutrition_label" ? "上傳營養標示照片" : "拍照或選擇食物照片"}
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                支援 JPG, PNG, HEIC 格式
              </div>
            </div>
          )}
        </div>
      )}

      {/* #12 — EXIF 偵測反饋 */}
      {exifDate && (
        <div style={{
          background: "rgba(108, 99, 255, 0.08)",
          borderRadius: "var(--radius-sm)",
          padding: "var(--spacing-sm) var(--spacing-md)",
          marginBottom: "var(--spacing-md)",
          fontSize: "0.8rem",
          color: "var(--color-primary)",
          display: "flex",
          alignItems: "center",
          gap: "var(--spacing-sm)",
        }}>
          📅 偵測到拍攝時間: {exifDate} → {exifMealType}
        </div>
      )}

      <input
        ref={beforeFileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleFileSelect(e, 'before')}
        style={{ display: "none" }}
      />
      <input
        ref={afterFileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleFileSelect(e, 'after')}
        style={{ display: "none" }}
      />

      {/* 壓縮選項 */}
      <div className="card" style={{ marginBottom: "var(--spacing-md)", padding: "var(--spacing-md)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>📷 圖片品質</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
              {useOriginal ? "原圖上傳（品質最佳但較慢）" : "壓縮模式（節省流量）"}
            </div>
          </div>
          <button
            className={`btn btn-sm ${useOriginal ? "btn-primary" : "btn-secondary"}`}
            onClick={() => handleToggleOriginal(!useOriginal)}
            style={{ padding: "0.3rem 0.8rem", fontSize: "0.8rem" }}
          >
            {useOriginal ? "🖼️ 原圖" : "📦 壓縮"}
          </button>
        </div>

        {(beforeSizeInfo || afterSizeInfo) && (
          <div style={{
            display: "flex", flexDirection: "column", gap: "var(--spacing-xs)",
            marginTop: "var(--spacing-sm)", padding: "var(--spacing-xs) var(--spacing-sm)",
            background: "var(--color-bg-input)", borderRadius: "var(--radius-sm)", fontSize: "0.8rem",
          }}>
            {beforeSizeInfo && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "var(--text-muted)" }}>
                  餐前照片: 原圖 {formatFileSize(beforeSizeInfo.original)}
                </span>
                {!useOriginal && beforeSizeInfo.original !== beforeSizeInfo.compressed && (
                  <span style={{ color: "var(--color-primary)", fontWeight: 600 }}>
                    → 壓縮後 {formatFileSize(beforeSizeInfo.compressed)}
                  </span>
                )}
              </div>
            )}
            {afterSizeInfo && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "var(--text-muted)" }}>
                  餐後照片: 原圖 {formatFileSize(afterSizeInfo.original)}
                </span>
                {!useOriginal && afterSizeInfo.original !== afterSizeInfo.compressed && (
                  <span style={{ color: "var(--color-primary)", fontWeight: 600 }}>
                    → 壓縮後 {formatFileSize(afterSizeInfo.compressed)}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 比例尺選項 */}
      <div className="card" style={{ marginBottom: "var(--spacing-lg)", padding: "var(--spacing-md)" }}>
        <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "var(--spacing-sm)" }}>
          📏 比例尺（選填）
        </div>
        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "var(--spacing-sm)" }}>
          如果照片中放了參考物，選擇對應的比例尺可提高份量估算精確度
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--spacing-xs)" }}>
          {SCALE_REFERENCES.map((scale) => (
            <button
              key={scale.id}
              className={`btn btn-sm ${selectedScale === scale.id ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setSelectedScale(scale.id)}
              style={{ fontSize: "0.75rem", padding: "0.3rem 0.6rem" }}
            >
              {scale.name}
            </button>
          ))}
        </div>
      </div>

      {/* 輔助文字輸入 (選填) */}
      <div className="card" style={{ marginBottom: "var(--spacing-lg)", padding: "var(--spacing-md)" }}>
        <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "var(--spacing-sm)" }}>
          💬 輔助提示文字（選填）
        </div>
        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "var(--spacing-sm)" }}>
          幫助 AI 更精確判斷，例如輸入「麥當勞大麥克套餐」、「餐前吃剩一半」
        </div>
        <input
          type="text"
          className="input"
          placeholder="例如：麥當勞大麥克套餐"
          value={hintText}
          onChange={(e) => setHintText(e.target.value)}
        />
      </div>

      {/* 錯誤提示 */}
      {error && (
        <div style={{
          background: "rgba(255, 107, 107, 0.1)",
          border: "1px solid rgba(255, 107, 107, 0.3)",
          borderRadius: "var(--radius-md)",
          padding: "var(--spacing-md)",
          marginBottom: "var(--spacing-lg)",
          color: "var(--color-danger)",
          fontSize: "0.9rem",
        }}>
          ❌ {error}
        </div>
      )}

      {/* 分析按鈕 */}
      <button
        className="btn btn-primary btn-lg"
        style={{ width: "100%", marginBottom: "var(--spacing-md)" }}
        onClick={handleAnalyze}
        disabled={!imagePreview || (scanMode === "before_after" && !afterImagePreview) || loading}
      >
        {loading ? (
          <>
            <span className="spinner" style={{ width: "18px", height: "18px" }} />
            AI 分析比對中...
          </>
        ) : (
          "🤖 開始 AI 辨識食物"
        )}
      </button>

      {loading && (
        <div style={{ textAlign: "center", fontSize: "0.85rem", color: "var(--text-muted)", animation: "pulse 2s ease infinite" }}>
          正在分析食物並比對餐前/餐後份量，通常需要 4-10 秒...
        </div>
      )}
    </div>
  );
}
