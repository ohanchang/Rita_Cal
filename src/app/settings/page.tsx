"use client";

import { useState, useEffect } from "react";
import { AppSettings, DEFAULT_SETTINGS, Gender, ActivityLevel, FitnessGoal, ACTIVITY_LEVELS, FITNESS_GOALS, InBodyRecord, APP_VERSION } from "@/lib/types";
import { getSettings, saveSettings, getDailyTargets, calculateBMR, calculateTDEE, getRecommendedCalories } from "@/lib/settings";
import { isDemoMode, setDemoMode, setNotionConfigured } from "@/lib/demo-mode";
import { useRecords } from "@/lib/useRecords";
import { useAppStore } from "@/lib/store";

export default function SettingsPage() {
  const [settings, setSettingsState] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [demo, setDemoState] = useState(false);
  const [saved, setSaved] = useState(false);
  const [inbodyRecords, setInbodyRecords] = useState<InBodyRecord[]>([]);
  const foodRecords = useAppStore(state => state.foodRecords);

  useEffect(() => {
    setSettingsState(getSettings());
    setDemoState(isDemoMode());
    // Load InBody records for syncing BMR
    fetch("/api/inbody")
      .then(r => r.json())
      .then(json => { if (json.success) setInbodyRecords(json.data); })
      .catch(() => {});
  }, []);

  function handleChange<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    const newSettings = { ...settings, [key]: value };
    setSettingsState(newSettings);
    saveSettings(newSettings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleToggleDemo() {
    const newVal = !demo;
    setDemoState(newVal);
    setDemoMode(newVal);
    if (!newVal) {
      setNotionConfigured(true);
    }
  }

  function handleExportCSV() {
    if (foodRecords.length === 0) {
      alert("目前沒有飲食紀錄可以匯出");
      return;
    }
    
    const headers = ["日期", "餐別", "來源", "食物名稱", "總卡路里(kcal)", "蛋白質(g)", "脂肪(g)", "碳水(g)", "纖維(g)", "餐廳名稱"];
    
    // Sort logically by date desc
    const sorted = [...foodRecords].sort((a,b) => (b.date||"").localeCompare(a.date||""));
    
    const rows = sorted.map(r => {
      // Escape localized commas
      const name = `"${r.foodName?.replace(/"/g, '""') || ''}"`;
      return [
        r.date, r.mealType, r.source, name, 
        r.totalCalories, r.totalProtein, r.totalFat, r.totalCarbs, r.totalFiber,
        `"${r.restaurantName?.replace(/"/g, '""') || ''}"`
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n"); // add BOM for Excel UTF-8
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `diet_records_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const bmr = calculateBMR(settings);
  const tdee = calculateTDEE(settings);
  const recommended = getRecommendedCalories(settings);
  const targets = getDailyTargets(settings);
  const ratioSum = settings.proteinRatio + settings.carbsRatio + settings.fatRatio;

  return (
    <div className="page-container">
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-xs)" }}>
          <h1 className="page-title">⚙️ 設定</h1>
          <span className="badge" style={{ background: "var(--color-bg)", border: "1px solid var(--border-color)", color: "var(--text-secondary)", fontSize: "0.75rem", padding: "2px 8px", borderRadius: "var(--radius-full)" }}>
            {APP_VERSION}
          </span>
        </div>
        {saved && (
          <span className="badge" style={{ background: "rgba(0, 184, 148, 0.2)", color: "var(--color-success)" }}>
            ✓ 已儲存
          </span>
        )}
      </div>

      {/* 外觀主題 */}
      <div className="card" style={{ marginBottom: "var(--spacing-md)" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "var(--spacing-md)" }}>🎨 外觀主題</h3>
        <div style={{ display: "flex", gap: "var(--spacing-sm)" }}>
          {(['light', 'dark', 'system'] as const).map((t) => (
            <button
              key={t}
              className={`btn btn-sm ${settings.theme === t ? "btn-primary" : "btn-secondary"}`}
              onClick={() => {
                handleChange("theme", t);
                document.documentElement.setAttribute('data-theme', t);
              }}
              style={{ flex: 1 }}
            >
              {t === 'light' ? '☀️ 淺色' : t === 'dark' ? '🌙 深色' : '⚙️ 自動'}
            </button>
          ))}
        </div>
      </div>

      {/* 個人資料 */}
      <div className="card" style={{ marginBottom: "var(--spacing-md)" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "var(--spacing-md)" }}>👤 個人資料</h3>

        {/* 性別 */}
        <div style={{ marginBottom: "var(--spacing-md)" }}>
          <label className="label">性別</label>
          <div style={{ display: "flex", gap: "var(--spacing-sm)" }}>
            {(["男", "女"] as Gender[]).map((g) => (
              <button
                key={g}
                className={`btn btn-sm ${settings.gender === g ? "btn-primary" : "btn-secondary"}`}
                onClick={() => handleChange("gender", g)}
                style={{ flex: 1 }}
              >
                {g === "男" ? "♂ 男" : "♀ 女"}
              </button>
            ))}
          </div>
        </div>

        {/* 年齡 / 身高 / 體重 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--spacing-sm)", marginBottom: "var(--spacing-md)" }}>
          <div>
            <label className="label">年齡</label>
            <input
              className="input"
              type="number"
              value={settings.age}
              onChange={(e) => handleChange("age", Number(e.target.value))}
              min={10}
              max={100}
            />
          </div>
          <div>
            <label className="label">身高 (cm)</label>
            <input
              className="input"
              type="number"
              value={settings.height}
              onChange={(e) => handleChange("height", Number(e.target.value))}
              min={100}
              max={250}
            />
          </div>
          <div>
            <label className="label">體重 (kg)</label>
            <input
              className="input"
              type="number"
              value={settings.weight}
              onChange={(e) => handleChange("weight", Number(e.target.value))}
              min={30}
              max={300}
            />
          </div>
        </div>

        {/* 活動量 */}
        <div style={{ marginBottom: "var(--spacing-md)" }}>
          <label className="label">活動量</label>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-xs)" }}>
            {ACTIVITY_LEVELS.map((a) => (
              <button
                key={a.level}
                className={`btn btn-sm ${settings.activityLevel === a.level ? "btn-primary" : "btn-secondary"}`}
                onClick={() => handleChange("activityLevel", a.level)}
                style={{
                  textAlign: "left",
                  justifyContent: "flex-start",
                  padding: "0.5rem 0.8rem",
                }}
              >
                <span style={{ fontWeight: 600, minWidth: "80px" }}>{a.level}</span>
                <span style={{ fontSize: "0.75rem", opacity: 0.8 }}>{a.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 健身目標 */}
        <div>
          <label className="label">健身目標</label>
          <div style={{ display: "flex", gap: "var(--spacing-sm)" }}>
            {FITNESS_GOALS.map((g) => (
              <button
                key={g.goal}
                className={`btn btn-sm ${settings.fitnessGoal === g.goal ? "btn-primary" : "btn-secondary"}`}
                onClick={() => handleChange("fitnessGoal", g.goal)}
                style={{ flex: 1, flexDirection: "column", gap: 2, padding: "0.6rem 0.4rem" }}
              >
                <span style={{ fontSize: "0.85rem" }}>{g.goal === "減脂" ? "🔥" : g.goal === "增肌" ? "💪" : "⚖️"} {g.goal}</span>
                <span style={{ fontSize: "0.65rem", opacity: 0.7 }}>{g.description}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* BMR / TDEE 計算結果 */}
      <div className="card-inset" style={{ marginBottom: "var(--spacing-md)", padding: "var(--spacing-md)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--spacing-md)" }}>
          <h3 style={{ fontSize: "0.95rem", fontWeight: 600 }}>📐 自動計算結果</h3>
          {inbodyRecords[0]?.bmr && (
            <button 
              className={`btn btn-sm ${settings.inbodyBmrOverride ? "btn-secondary" : "btn-primary"}`}
              onClick={() => handleChange("inbodyBmrOverride", settings.inbodyBmrOverride ? undefined : (inbodyRecords[0].bmr ?? undefined))}
              style={{ fontSize: "0.75rem", padding: "4px 8px" }}
            >
              {settings.inbodyBmrOverride ? "取消覆寫" : `🔄 使用 InBody BMR (${inbodyRecords[0].bmr})`}
            </button>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--spacing-sm)", textAlign: "center" }}>
          <div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>BMR 基礎代謝</div>
            <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-secondary)", marginTop: 2 }}>
              {bmr.toLocaleString()}
            </div>
            <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>kcal</div>
          </div>
          <div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>TDEE 每日消耗</div>
            <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--color-secondary)", marginTop: 2 }}>
              {tdee.toLocaleString()}
            </div>
            <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>kcal</div>
          </div>
          <div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>建議攝取</div>
            <div className="calories-value" style={{ fontSize: "1.2rem", marginTop: 2 }}>
              {recommended.toLocaleString()}
            </div>
            <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>kcal</div>
          </div>
        </div>
        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textAlign: "center", marginTop: "var(--spacing-sm)" }}>
          {settings.inbodyBmrOverride 
            ? `已使用您的 InBody 檢測數值 (BMR ${settings.inbodyBmrOverride} kcal) 計算` 
            : `Mifflin-St Jeor 公式 · ${settings.gender === "男" ? "♂" : "♀"} ${settings.age}歲 · ${settings.height}cm · ${settings.weight}kg`}
        </div>
      </div>

      {/* 卡路里目標模式切換 */}
      <div className="card" style={{ marginBottom: "var(--spacing-md)" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "var(--spacing-md)" }}>🎯 每日卡路里目標</h3>

        <div style={{ display: "flex", gap: "var(--spacing-sm)", marginBottom: "var(--spacing-md)" }}>
          <button
            className={`btn btn-sm ${settings.useAutoCalorie ? "btn-primary" : "btn-secondary"}`}
            onClick={() => handleChange("useAutoCalorie", true)}
            style={{ flex: 1 }}
          >
            🤖 自動計算
          </button>
          <button
            className={`btn btn-sm ${!settings.useAutoCalorie ? "btn-primary" : "btn-secondary"}`}
            onClick={() => handleChange("useAutoCalorie", false)}
            style={{ flex: 1 }}
          >
            ✏️ 手動設定
          </button>
        </div>

        {settings.useAutoCalorie ? (
          <div className="card-inset" style={{ textAlign: "center", padding: "var(--spacing-md)" }}>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>根據你的個人資料自動計算</div>
            <div className="calories-value" style={{ fontSize: "1.8rem", marginTop: "var(--spacing-xs)" }}>
              {targets.calories.toLocaleString()}
              <span className="calories-unit" style={{ fontSize: "0.9rem" }}> kcal / 天</span>
            </div>
          </div>
        ) : (
          <div>
            <label className="label">手動卡路里目標 (kcal)</label>
            <input
              className="input"
              type="number"
              value={settings.dailyCalorieTarget}
              onChange={(e) => handleChange("dailyCalorieTarget", Number(e.target.value))}
              min={500}
              max={10000}
            />
          </div>
        )}
      </div>

      {/* 營養素比例 */}
      <div className="card" style={{ marginBottom: "var(--spacing-md)" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "var(--spacing-md)" }}>📊 營養素目標比例</h3>

        <div style={{ marginBottom: "var(--spacing-sm)" }}>
          <label className="label">蛋白質比例 ({settings.proteinRatio}%)</label>
          <input
            className="input"
            type="range"
            min={10}
            max={60}
            value={settings.proteinRatio}
            onChange={(e) => handleChange("proteinRatio", Number(e.target.value))}
            style={{ boxShadow: "none", padding: 0 }}
          />
        </div>

        <div style={{ marginBottom: "var(--spacing-sm)" }}>
          <label className="label">碳水化合物比例 ({settings.carbsRatio}%)</label>
          <input
            className="input"
            type="range"
            min={10}
            max={70}
            value={settings.carbsRatio}
            onChange={(e) => handleChange("carbsRatio", Number(e.target.value))}
            style={{ boxShadow: "none", padding: 0 }}
          />
        </div>

        <div style={{ marginBottom: "var(--spacing-md)" }}>
          <label className="label">脂肪比例 ({settings.fatRatio}%)</label>
          <input
            className="input"
            type="range"
            min={10}
            max={50}
            value={settings.fatRatio}
            onChange={(e) => handleChange("fatRatio", Number(e.target.value))}
            style={{ boxShadow: "none", padding: 0 }}
          />
        </div>

        {ratioSum !== 100 && (
          <div style={{
            background: ratioSum > 100 ? "rgba(225, 112, 85, 0.1)" : "rgba(253, 203, 110, 0.1)",
            borderRadius: "var(--radius-sm)",
            padding: "var(--spacing-sm)",
            fontSize: "0.8rem",
            color: ratioSum > 100 ? "var(--color-danger)" : "#f39c12",
            marginBottom: "var(--spacing-sm)",
          }}>
            ⚠️ 目前比例總和為 {ratioSum}%，建議調整至 100%
          </div>
        )}

        <div className="card-inset" style={{ padding: "var(--spacing-md)" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "var(--spacing-sm)" }}>
            每日攝取目標換算（{targets.calories.toLocaleString()} kcal）：
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--spacing-sm)", textAlign: "center" }}>
            <div>
              <div className="macro-protein" style={{ fontWeight: 700 }}>{targets.protein}g</div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>蛋白質</div>
            </div>
            <div>
              <div className="macro-carbs" style={{ fontWeight: 700 }}>{targets.carbs}g</div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>碳水</div>
            </div>
            <div>
              <div className="macro-fat" style={{ fontWeight: 700 }}>{targets.fat}g</div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>脂肪</div>
            </div>
          </div>
        </div>
      </div>

      {/* Demo 模式 */}
      <div className="card" style={{ marginBottom: "var(--spacing-md)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>🧪 Demo 模式</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>
              使用模擬資料，無需設定 API
            </div>
          </div>
          <button
            className={`btn btn-sm ${demo ? "btn-primary" : "btn-secondary"}`}
            onClick={handleToggleDemo}
          >
            {demo ? "✓ 開啟" : "關閉"}
          </button>
        </div>
      </div>

      {/* API 設定說明 */}
      <div className="card-flat" style={{ padding: "var(--spacing-md)", fontSize: "0.85rem", color: "var(--text-muted)" }}>
        <div style={{ fontWeight: 600, marginBottom: "var(--spacing-sm)", color: "var(--text-secondary)" }}>🔑 API 設定</div>
        <p>本應用需要以下 API 設定（在 Vercel 環境變數中配置）：</p>
        <ul style={{ paddingLeft: "1.2rem", marginTop: "var(--spacing-sm)", lineHeight: 1.8 }}>
          <li><strong>GEMINI_API_KEY</strong> — Google Gemini API 金鑰</li>
          <li><strong>NOTION_TOKEN</strong> — Notion Integration Token</li>
          <li><strong>NOTION_DATABASE_ID</strong> — Notion Database ID</li>
        </ul>
      </div>

      {/* 公式說明 */}
      <div className="card-flat" style={{ padding: "var(--spacing-md)", marginTop: "var(--spacing-md)", fontSize: "0.8rem", color: "var(--text-muted)" }}>
        <div style={{ fontWeight: 600, marginBottom: "var(--spacing-xs)", color: "var(--text-secondary)" }}>📖 計算公式說明</div>
        <p><strong>BMR</strong>（基礎代謝率）= 維持生命所需的最低熱量（Mifflin-St Jeor 公式）</p>
        <p><strong>TDEE</strong>（每日總消耗）= BMR × 活動乘數，代表你一天實際消耗的熱量</p>
        <p><strong>建議攝取</strong> = TDEE ± 目標調整（減脂 -400 / 維持 ±0 / 增肌 +250）</p>
        <p style={{ marginTop: "var(--spacing-xs)", fontStyle: "italic" }}>⚠️ 所有資料僅儲存在本機裝置，不會上傳到任何伺服器</p>
      </div>
      {/* 資料備份與匯出 */}
      <div className="card" style={{ marginBottom: "var(--spacing-md)" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "var(--spacing-md)" }}>💾 資料管理</h3>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>匯出飲食紀錄</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>
              將歷史紀錄下載為 Excel 支援的 CSV 格式 ({foodRecords.length} 筆)
            </div>
          </div>
          <button
            className="btn btn-sm btn-primary"
            onClick={handleExportCSV}
            disabled={foodRecords.length === 0}
          >
            📥 下載 CSV
          </button>
        </div>
      </div>

      <div style={{ textAlign: "center", margin: "var(--spacing-lg) 0 var(--spacing-md)", fontSize: "0.8rem", color: "var(--text-muted)" }}>
        Food Calories Tracker {APP_VERSION}
      </div>

    </div>
  );
}
