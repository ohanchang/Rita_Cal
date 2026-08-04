"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { InBodyData, InBodyRecord, MounjaroRecord, APP_VERSION } from "@/lib/types";
import toast from "react-hot-toast";
import InBodyHistoryTable from "@/components/InBodyHistoryTable";
import { fv, SegmentalDiagram, barPercent } from "@/components/InBodyVisuals";
import MounjaroCalendar from "@/components/MounjaroCalendar";

/** Compress image for upload */
async function compressImage(dataUrl: string, maxDim = 1200, quality = 0.7): Promise<string> {
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
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.src = dataUrl;
  });
}

export default function InBodyPage() {
  const [images, setImages] = useState<{ dataUrl: string; mimeType: string }[]>([]);
  const [hintText, setHintText] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<InBodyData | null>(null);
  const [records, setRecords] = useState<InBodyRecord[]>([]);
  const [mRecords, setMRecords] = useState<MounjaroRecord[]>([]);
  const [mSaving, setMSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/inbody")
      .then(r => r.json())
      .then(json => { if (json.success && json.data.length > 0) setRecords(json.data); })
      .catch(() => {});
      
    fetch("/api/mounjaro")
      .then(r => r.json())
      .then(json => { if (json.success && json.data.length > 0) setMRecords(json.data); })
      .catch(() => {});
  }, []);

  async function handleMounjaroRecord(dose: number) {
    setMSaving(true);
    try {
      const date = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Taipei" });
      const res = await fetch("/api/mounjaro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, dose })
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`已記錄今日施打 ${dose}mg`);
        setMRecords([{ id: json.data.id, date, dose, createdAt: new Date().toISOString() }, ...mRecords].sort((a, b) => b.date.localeCompare(a.date)));
      } else {
        toast.error(json.error || "紀錄失敗");
      }
    } catch (e) {
      toast.error("紀錄過程發生錯誤");
    } finally {
      setMSaving(false);
    }
  }

  async function handleDeleteMounjaroRecord(id: string) {
    setMSaving(true);
    try {
      const res = await fetch(`/api/mounjaro?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("已刪除紀錄");
        setMRecords(mRecords.filter(r => r.id !== id));
      } else {
        toast.error(json.error || "刪除失敗");
      }
    } catch (e) {
      toast.error("刪除過程發生錯誤");
    } finally {
      setMSaving(false);
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const imageFiles = Array.from(files).filter(f => f.type.startsWith("image/"));
    if (imageFiles.length === 0) { toast.error("請選擇圖片檔案"); return; }
    const newImages: { dataUrl: string; mimeType: string }[] = [];
    for (const file of imageFiles) {
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target?.result as string);
        reader.readAsDataURL(file);
      });
      const compressed = await compressImage(dataUrl);
      newImages.push({ dataUrl: compressed, mimeType: "image/jpeg" });
    }
    setImages((prev) => [...prev, ...newImages]);
    e.target.value = "";
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleAnalyze() {
    if (images.length === 0) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/inbody", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: images.map(img => ({ base64: img.dataUrl, mimeType: img.mimeType })),
          hintText: hintText.trim(),
        }),
      });
      if (!res.ok) { toast.error(`伺服器錯誤 (${res.status})`); return; }
      const json = await res.json();
      if (!json.success) { toast.error(json.error || "分析失敗"); return; }
      setResult(json.data);
    } catch (err) {
      toast.error(`分析錯誤: ${err instanceof Error ? err.message : "未知"}`);
    } finally { setLoading(false); }
  }

  async function handleSave() {
    if (!result) return;
    setSaving(true);
    try {
      const saveRes = await fetch("/api/inbody", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result),
      });
      const saveJson = await saveRes.json();
      if (!saveJson.success) { toast.error(saveJson.error || "儲存失敗"); return; }
      try {
        const analysisRes = await fetch("/api/diet-analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ period: "7days" }),
        });
        const analysisJson = await analysisRes.json();
        if (analysisJson.success) localStorage.setItem("diet-analysis-7days", JSON.stringify(analysisJson.data));
      } catch { /* skip */ }
      toast.success("已成功儲存 InBody 更新");
      router.push("/stats");
    } catch { toast.error("儲存過程發生錯誤"); }
    finally { setSaving(false); }
  }

  // The data to display: either fresh AI result or latest from Notion
  const latestRecord = records.length > 0 ? records[0] : null;
  const displayData: InBodyData | null = result || latestRecord;
  const warnings = result?.warnings || [];

  return (
    <div className="page-container">
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-xs)" }}>
          <h1 className="page-title">🏋️ InBody 分析</h1>
          <span className="badge" style={{ background: "rgba(0, 184, 148, 0.15)", color: "var(--color-success)", fontSize: "0.75rem", padding: "2px 8px", borderRadius: "var(--radius-full)" }}>
            {APP_VERSION}
          </span>
        </div>
      </div>

      {/* 猛健樂日曆追蹤區塊 */}
      <MounjaroCalendar
        records={mRecords}
        onAddRecord={(date, dose) => {
          // The old handler used today's date, we modify it to accept date from calendar
          setMSaving(true);
          fetch("/api/mounjaro", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ date, dose })
          })
          .then(r => r.json())
          .then(json => {
            if (json.success) {
              toast.success(`已記錄 ${date} 施打 ${dose}mg`);
              // Check if record already exists on this date to replace or add
              setMRecords(prev => {
                const filtered = prev.filter(r => r.date !== date);
                return [{ id: json.data.id, date, dose, createdAt: new Date().toISOString() }, ...filtered].sort((a, b) => b.date.localeCompare(a.date));
              });
            } else {
              toast.error(json.error || "紀錄失敗");
            }
          })
          .catch(() => toast.error("紀錄過程發生錯誤"))
          .finally(() => setMSaving(false));
        }}
        onDeleteRecord={handleDeleteMounjaroRecord}
        isLoading={mSaving}
      />

      {/* === Upload area === */}
      <div
        className="card"
        style={{
          textAlign: "center",
          padding: "var(--spacing-xl)",
          marginBottom: "var(--spacing-md)",
          cursor: "pointer",
          border: images.length > 0 ? "2px solid var(--color-primary)" : "2px dashed var(--border-color)",
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        {images.length > 0 ? (
          <div>
            <div style={{ display: "flex", gap: "var(--spacing-sm)", flexWrap: "wrap", justifyContent: "center" }}>
              {images.map((img, i) => (
                <div key={i} style={{ position: "relative" }}>
                  <img src={img.dataUrl} alt={`截圖 ${i + 1}`} style={{ width: "80px", height: "120px", objectFit: "cover", borderRadius: "var(--radius-sm)", border: "2px solid var(--border-color)" }} />
                  <button onClick={(e) => { e.stopPropagation(); removeImage(i); }} style={{ position: "absolute", top: -8, right: -8, width: 22, height: 22, borderRadius: "50%", border: "none", background: "var(--color-danger)", color: "white", fontSize: "0.7rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                </div>
              ))}
            </div>
            <div style={{ marginTop: "var(--spacing-md)", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              已選 {images.length} 張截圖・點擊新增更多
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: "3rem", marginBottom: "var(--spacing-md)" }}>📊</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "var(--spacing-sm)" }}>上傳 InBody 報告截圖</div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>支援多張截圖一次上傳，AI 會自動辨識所有數值</div>
          </div>
        )}
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileSelect} style={{ display: "none" }} />

      {!result && (
        <div style={{ marginBottom: "var(--spacing-md)" }}>
          {/* 綠色框位置：文字說明 / 備註（作為 AI 判斷參考） */}
          <div className="card" style={{ padding: "var(--spacing-sm) var(--spacing-md)", marginBottom: "var(--spacing-md)" }}>
            <label className="label" style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
              <span>📝</span>
              <span>文字說明 / 備註（選填，作為 AI 判斷參考）</span>
            </label>
            <input
              className="input"
              value={hintText}
              onChange={(e) => setHintText(e.target.value)}
              placeholder="例如：檢測日期 2026/07/16、身高 175cm..."
              style={{ fontSize: "0.85rem" }}
            />
          </div>

          <button
            className="btn btn-primary btn-lg"
            style={{ width: "100%", marginBottom: "var(--spacing-sm)" }}
            onClick={handleAnalyze}
            disabled={images.length === 0 || loading}
          >
            {loading ? (
              <><span className="spinner" style={{ width: "18px", height: "18px" }} /> AI 分析中...</>
            ) : (
              `🤖 開始 AI 分析 (${images.length} 張)`
            )}
          </button>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: "center", fontSize: "0.85rem", color: "var(--text-muted)", animation: "pulse 2s ease infinite", marginBottom: "var(--spacing-md)" }}>
          正在辨識 InBody 報告數據，通常需要 5-15 秒...
        </div>
      )}

      {warnings.length > 0 && (
        <div style={{ background: "rgba(253, 203, 110, 0.15)", border: "1px solid rgba(253, 203, 110, 0.4)", borderRadius: "var(--radius-md)", padding: "var(--spacing-md)", marginBottom: "var(--spacing-md)", fontSize: "0.85rem", color: "#f39c12" }}>
          <div style={{ fontWeight: 700, marginBottom: "var(--spacing-xs)" }}>⚠️ 數據可能不完整</div>
          <ul style={{ paddingLeft: "1.2rem", lineHeight: 1.8 }}>{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
        </div>
      )}

      {/* Save button (only after fresh analysis) */}
      {result && (
        <button className="btn btn-primary btn-lg" style={{ width: "100%", marginBottom: "var(--spacing-lg)" }} onClick={handleSave} disabled={saving}>
          {saving ? (<><span className="spinner" style={{ width: "18px", height: "18px" }} /> 儲存中...</>) : "✅ 確認儲存到 Notion"}
        </button>
      )}

      {/* === InBody Report Data === */}
      {displayData && (
        <div>
          {/* Section header */}
          {!result && latestRecord && (
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "var(--spacing-md)", textAlign: "center" }}>
              📋 最新紀錄 — 檢測日期 {latestRecord.date}
            </div>
          )}

          {/* 1. InBody Score */}
          <div className="card" style={{ marginBottom: "var(--spacing-md)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -20, right: -20, width: 120, height: 120, borderRadius: "50%", background: "linear-gradient(135deg, var(--color-primary), var(--color-secondary))", opacity: 0.08 }} />
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>InBody 評分</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "var(--spacing-sm)" }}>檢測日期：{displayData.date || "—"}</div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "3.5rem", fontWeight: 800, color: "var(--color-primary)", lineHeight: 1 }}>{displayData.score ?? "—"}</span>
              <span style={{ fontSize: "1.2rem", color: "var(--text-muted)", marginLeft: 4 }}>分</span>
            </div>
          </div>

          {/* 2. Weight / BF% / BMI */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--spacing-sm)", marginBottom: "var(--spacing-md)" }}>
            {[
              { label: "體重(kg)", value: displayData.weight, range: "55.9~75.7" },
              { label: "體脂率(%)", value: displayData.bodyFatPercent, range: "10~20" },
              { label: "BMI", value: displayData.bmi, range: "18.5~24" },
            ].map(m => (
              <div key={m.label} className="card" style={{ textAlign: "center", padding: "var(--spacing-md)" }}>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: 4 }}>{m.label}</div>
                <div style={{ fontSize: "1.6rem", fontWeight: 800 }}>{m.value ?? "—"}</div>
                <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", marginTop: 2 }}>({m.range})</div>
              </div>
            ))}
          </div>

          {/* 3. Body Composition */}
          <div className="card" style={{ marginBottom: "var(--spacing-md)" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "var(--spacing-md)" }}>身體組成</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--spacing-md)" }}>
              {[
                { label: "總水重", value: fv(displayData.totalBodyWater, "L") },
                { label: "礦物質重", value: fv(displayData.minerals, "kg") },
                { label: "蛋白質重", value: fv(displayData.protein, "kg") },
                { label: "體脂肪重", value: fv(displayData.bodyFatMass, "kg") },
              ].map(m => (
                <div key={m.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "1px solid var(--border-color)", paddingBottom: "var(--spacing-xs)" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{m.label}：</span>
                  <span style={{ fontSize: "1rem", fontWeight: 700 }}>{m.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Muscle-Fat Analysis bars */}
          <div className="card" style={{ marginBottom: "var(--spacing-md)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--spacing-md)" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>肌肉脂肪分析</h3>
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>體重過重/肥胖型</span>
            </div>
            {/* Scale header */}
            <div style={{ display: "flex", justifyContent: "space-between", paddingLeft: "70px", marginBottom: 4 }}>
              <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>低</span>
              <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>正常</span>
              <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>高</span>
            </div>
            {[
              { label: "體　重", value: displayData.weight, low: 55.9, high: 75.7, color: "rgba(108, 99, 255, 0.3)" },
              { label: "骨骼肌重", value: displayData.skeletalMuscleMass, low: 30, high: 40, color: "rgba(108, 99, 255, 0.4)" },
              { label: "體脂肪重", value: displayData.bodyFatMass, low: 7.9, high: 15.8, color: "rgba(108, 99, 255, 0.5)" },
            ].map(m => (
              <div key={m.label} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-sm)", marginBottom: "var(--spacing-sm)" }}>
                <span style={{ width: "65px", fontSize: "0.8rem", fontWeight: 600, flexShrink: 0 }}>{m.label}</span>
                <div style={{ flex: 1, position: "relative", height: 28, background: "var(--bg-secondary)", borderRadius: 4, overflow: "hidden" }}>
                  {/* Dashed scale lines */}
                  <div style={{ position: "absolute", left: "33%", top: 0, bottom: 0, borderLeft: "1px dashed var(--border-color)" }} />
                  <div style={{ position: "absolute", left: "66%", top: 0, bottom: 0, borderLeft: "1px dashed var(--border-color)" }} />
                  <div style={{
                    height: "100%",
                    width: `${barPercent(m.value, m.low, m.high)}%`,
                    background: `linear-gradient(90deg, ${m.color}, var(--color-primary))`,
                    borderRadius: 4,
                    display: "flex",
                    alignItems: "center",
                    paddingLeft: 8,
                    transition: "width 0.8s ease",
                  }}>
                    <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "white", textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>
                      {m.value ?? "—"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 5. BMI + Body Fat % bars */}
          <div className="card" style={{ marginBottom: "var(--spacing-md)" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "var(--spacing-md)" }}>肥胖分析</h3>
            <div style={{ display: "flex", justifyContent: "space-between", paddingLeft: "70px", marginBottom: 4 }}>
              <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>低</span>
              <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>正常</span>
              <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>高</span>
            </div>
            {[
              { label: "B M I", value: displayData.bmi, low: 18.5, high: 24 },
              { label: "體脂肪率", value: displayData.bodyFatPercent, low: 10, high: 20 },
            ].map(m => (
              <div key={m.label} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-sm)", marginBottom: "var(--spacing-sm)" }}>
                <span style={{ width: "65px", fontSize: "0.8rem", fontWeight: 600, flexShrink: 0 }}>{m.label}</span>
                <div style={{ flex: 1, position: "relative", height: 28, background: "var(--bg-secondary)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ position: "absolute", left: "33%", top: 0, bottom: 0, borderLeft: "1px dashed var(--border-color)" }} />
                  <div style={{ position: "absolute", left: "66%", top: 0, bottom: 0, borderLeft: "1px dashed var(--border-color)" }} />
                  <div style={{
                    height: "100%",
                    width: `${barPercent(m.value, m.low, m.high)}%`,
                    background: "linear-gradient(90deg, rgba(108, 99, 255, 0.3), var(--color-primary))",
                    borderRadius: 4,
                    display: "flex",
                    alignItems: "center",
                    paddingLeft: 8,
                    transition: "width 0.8s ease",
                  }}>
                    <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "white", textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>{m.value ?? "—"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 6. Segmental Muscle */}
          {displayData.segmentalMuscle && (
            <SegmentalDiagram data={displayData.segmentalMuscle} label="部位別肌肉分析" />
          )}

          {/* 7. Segmental Fat */}
          {displayData.segmentalFat && (
            <SegmentalDiagram data={displayData.segmentalFat} label="部位別脂肪分析" />
          )}

          {/* 8. Weight Control */}
          <div className="card" style={{ marginBottom: "var(--spacing-md)" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "var(--spacing-md)" }}>體重控制</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--spacing-md)" }}>
              {[
                { label: "目標體重", value: fv(displayData.targetWeight, "kg") },
                { label: "脂肪控制", value: fv(displayData.fatControl, "kg") },
                { label: "體重控制", value: fv(displayData.fatControl, "kg") },
                { label: "肌肉控制", value: fv(displayData.muscleControl, "kg") },
              ].map(m => (
                <div key={m.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "1px solid var(--border-color)", paddingBottom: "var(--spacing-xs)" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{m.label}：</span>
                  <span style={{ fontSize: "1rem", fontWeight: 700, color: m.value.startsWith("-") ? "var(--color-danger)" : "inherit" }}>{m.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 9. WHR + Visceral Fat */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--spacing-sm)", marginBottom: "var(--spacing-md)" }}>
            <div className="card" style={{ textAlign: "center", padding: "var(--spacing-lg)" }}>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 4 }}>腰臀圍比</div>
              <div style={{ fontSize: "2rem", fontWeight: 800 }}>{displayData.whr ?? "—"}</div>
              <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>(0.8~0.9)</div>
            </div>
            <div className="card" style={{ textAlign: "center", padding: "var(--spacing-lg)" }}>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 4 }}>內臟脂肪級別</div>
              <div style={{ fontSize: "2rem", fontWeight: 800, color: (displayData.visceralFatLevel ?? 0) > 9 ? "var(--color-danger)" : "inherit" }}>{displayData.visceralFatLevel ?? "—"}</div>
              {(displayData.visceralFatLevel ?? 0) > 9 && (
                <div style={{ fontSize: "0.7rem", color: "var(--color-danger)", fontWeight: 600 }}>內臟肥胖型</div>
              )}
            </div>
          </div>

          {/* 10. Research Parameters */}
          <div className="card" style={{ marginBottom: "var(--spacing-md)" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "var(--spacing-md)" }}>研究參數</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-sm)" }}>
              {[
                { label: "除脂體重", value: fv(displayData.leanBodyMass, "kg"), range: null },
                { label: "基礎代謝率", value: fv(displayData.bmr, "kcal"), range: "1935~2283" },
                { label: "肥胖度", value: fv(displayData.obesityDegree, "%"), range: "90~110" },
                { label: "SMI", value: fv(displayData.smi, "kg/m²"), range: null },
                { label: "建議的熱量攝取", value: fv(displayData.recommendedCalorie, "kcal"), range: null },
              ].map(m => (
                <div key={m.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "1px solid var(--border-color)", paddingBottom: "var(--spacing-xs)" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{m.label}：</span>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "1rem", fontWeight: 700 }}>{m.value}</span>
                    {m.range && <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginLeft: 8 }}>({m.range})</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* History comparison table */}
          {records.length > 1 && !result && (
            <InBodyHistoryTable records={records} />
          )}
        </div>
      )}
    </div>
  );
}
