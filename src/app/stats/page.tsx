"use client";

import { useState, useEffect } from "react";
import { AppSettings, DEFAULT_SETTINGS, DailyIntake, MealTypeStats, InBodyRecord, DietAnalysis } from "@/lib/types";
import { getSettings, getDailyTargets } from "@/lib/settings";
import { useRecords } from "@/lib/useRecords";
import InBodyModal from "@/components/InBodyModal";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell, AreaChart, Area } from 'recharts';

export default function StatsPage() {
  const { records, loading } = useRecords();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [period, setPeriod] = useState<"week" | "month">("week");
  const [inbodyRecords, setInbodyRecords] = useState<InBodyRecord[]>([]);
  const [inbodyModalOpen, setInbodyModalOpen] = useState(false);
  const [dietAnalysis, setDietAnalysis] = useState<DietAnalysis | null>(null);
  const [analysisPeriod, setAnalysisPeriod] = useState<'7days' | '30days'>('7days');
  const [analysisLoading, setAnalysisLoading] = useState(false);

  useEffect(() => {
    setSettings(getSettings());

    // Load InBody records
    fetch("/api/inbody")
      .then(r => r.json())
      .then(json => { if (json.success) setInbodyRecords(json.data); })
      .catch(() => {});

    // Load cached diet analysis
    try {
      const cached = localStorage.getItem("diet-analysis-7days");
      if (cached) setDietAnalysis(JSON.parse(cached));
    } catch { /* ignore */ }
  }, []);

  const targets = getDailyTargets(settings);

  // Filter by period
  const now = new Date();
  const periodDays = period === "week" ? 7 : 30;
  const cutoff = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const periodRecords = records.filter((r) => r.date >= cutoff);

  // Daily intake stats
  const dailyMap = new Map<string, DailyIntake>();
  periodRecords.forEach((r) => {
    const existing = dailyMap.get(r.date) || { date: r.date, totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0, count: 0 };
    existing.totalCalories += r.totalCalories;
    existing.totalProtein += r.totalProtein;
    existing.totalCarbs += r.totalCarbs;
    existing.totalFat += r.totalFat;
    existing.count += 1;
    dailyMap.set(r.date, existing);
  });
  const dailyIntakes = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  // Meal type stats
  const mealMap = new Map<string, MealTypeStats>();
  const totalCal = periodRecords.reduce((sum, r) => sum + r.totalCalories, 0);
  periodRecords.forEach((r) => {
    const existing = mealMap.get(r.mealType) || { mealType: r.mealType, totalCalories: 0, count: 0, percentage: 0 };
    existing.totalCalories += r.totalCalories;
    existing.count += 1;
    mealMap.set(r.mealType, existing);
  });
  const mealStats = Array.from(mealMap.values()).map((s) => ({
    ...s,
    percentage: totalCal > 0 ? (s.totalCalories / totalCal) * 100 : 0,
  })).sort((a, b) => b.totalCalories - a.totalCalories);

  const avgCalories = dailyIntakes.length > 0
    ? Math.round(dailyIntakes.reduce((sum, d) => sum + d.totalCalories, 0) / dailyIntakes.length)
    : 0;

  // Top foods
  const foodCountMap = new Map<string, { name: string; calories: number; count: number }>();
  periodRecords.forEach((r) => {
    const existing = foodCountMap.get(r.foodName) || { name: r.foodName, calories: 0, count: 0 };
    existing.calories += r.totalCalories;
    existing.count += 1;
    foodCountMap.set(r.foodName, existing);
  });
  const topFoods = Array.from(foodCountMap.values()).sort((a, b) => b.count - a.count).slice(0, 5);

  const maxDailyCal = Math.max(...dailyIntakes.map((d) => d.totalCalories), targets.calories);

  // InBody helpers
  const latestInBody = inbodyRecords[0] || null;
  const prevInBody = inbodyRecords[1] || null;

  function renderDelta(current: number | null, prev: number | null, unit: string, reverseColor = false) {
    if (current == null || prev == null) return null;
    const diff = current - prev;
    if (diff === 0) return null;
    const isPositive = diff > 0;
    const color = reverseColor ? (isPositive ? "var(--color-danger)" : "var(--color-success)") : (isPositive ? "var(--color-success)" : "var(--color-danger)");
    return <span style={{ fontSize: "0.7rem", fontWeight: 600, color, marginLeft: 4 }}>{isPositive ? "↑" : "↓"}{Math.abs(diff).toFixed(1)}{unit}</span>;
  }

  async function handleRefreshAnalysis() {
    setAnalysisLoading(true);
    try {
      const res = await fetch("/api/diet-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period: analysisPeriod }),
      });
      const json = await res.json();
      if (json.success) {
        setDietAnalysis(json.data);
        localStorage.setItem(`diet-analysis-${analysisPeriod}`, JSON.stringify(json.data));
      }
    } catch { /* silent */ }
    finally { setAnalysisLoading(false); }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">📊 統計分析</h1>
      </div>

      {/* Period toggle */}
      <div style={{ display: "flex", gap: "var(--spacing-sm)", marginBottom: "var(--spacing-lg)" }}>
        <button className={`btn btn-sm ${period === "week" ? "btn-primary" : "btn-secondary"}`} onClick={() => setPeriod("week")}>
          近 7 天
        </button>
        <button className={`btn btn-sm ${period === "month" ? "btn-primary" : "btn-secondary"}`} onClick={() => setPeriod("month")}>
          近 30 天
        </button>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)" }}>
          {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: "120px" }} />)}
        </div>
      ) : (
        <>
          {/* 概覽 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--spacing-sm)", marginBottom: "var(--spacing-lg)" }}>
            <div className="card-flat" style={{ textAlign: "center", padding: "var(--spacing-md)" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>平均每日攝取</div>
              <div className="calories-value" style={{ fontSize: "1.5rem", marginTop: 4 }}>
                {avgCalories.toLocaleString()}
              </div>
              <div className="calories-unit">kcal / 天</div>
            </div>
            <div className="card-flat" style={{ textAlign: "center", padding: "var(--spacing-md)" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>記錄天數</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--color-primary)", marginTop: 4 }}>
                {dailyIntakes.length}
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>共 {periodRecords.length} 筆</div>
            </div>
          </div>

          {/* 每日卡路里趨勢 */}
          <div className="card" style={{ marginBottom: "var(--spacing-lg)" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "var(--spacing-md)" }}>📈 每日卡路里趨勢</h3>
            {dailyIntakes.length === 0 ? (
              <div style={{ textAlign: "center", padding: "var(--spacing-lg)", color: "var(--text-muted)" }}>暫無資料</div>
            ) : (
              <div style={{ width: "100%", height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyIntakes.slice(-14)} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <XAxis dataKey="date" tickFormatter={(v) => v.slice(5)} tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      cursor={{ fill: "rgba(163, 177, 198, 0.1)" }}
                      contentStyle={{ background: "var(--text-primary)", color: "var(--color-bg)", borderRadius: 8, fontSize: 12, border: "none", padding: "4px 8px", boxShadow: "var(--neu-pressed)" }}
                      formatter={(val: any) => [`${val} kcal`, '總熱量']}
                      labelFormatter={(label) => `日期: ${label}`}
                    />
                    <ReferenceLine y={targets.calories} stroke="var(--color-primary-light)" strokeDasharray="3 3" />
                    <Bar dataKey="totalCalories" radius={[4, 4, 0, 0]}>
                      {dailyIntakes.slice(-14).map((d) => (
                        <Cell key={d.date} fill={d.totalCalories > targets.calories ? "var(--color-danger)" : "var(--color-primary)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-sm)", marginTop: "var(--spacing-sm)", fontSize: "0.75rem", color: "var(--text-muted)" }}>
              <div style={{ width: 16, height: 2, borderTop: "2px dashed var(--color-primary-light)" }} />
              <span>目標: {targets.calories.toLocaleString()} kcal</span>
            </div>
          </div>

          {/* 用餐類型分佈 */}
          <div className="card" style={{ marginBottom: "var(--spacing-lg)" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "var(--spacing-md)" }}>🍽️ 用餐類型分佈</h3>
            {mealStats.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--text-muted)" }}>暫無資料</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-sm)" }}>
                {mealStats.map((s) => (
                  <div key={s.mealType} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-sm)" }}>
                    <span style={{ width: "50px", fontSize: "0.85rem", fontWeight: 500 }}>{s.mealType}</span>
                    <div style={{ flex: 1 }}>
                      <div className="progress-bar" style={{ height: "8px" }}>
                        <div className="progress-fill" style={{ width: `${s.percentage}%` }} />
                      </div>
                    </div>
                    <span style={{ fontSize: "0.8rem", fontWeight: 600, width: "60px", textAlign: "right" }}>{s.percentage.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top 5 食物 */}
          <div className="card" style={{ marginBottom: "var(--spacing-lg)" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "var(--spacing-md)" }}>🏆 最常吃的食物</h3>
            {topFoods.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--text-muted)" }}>暫無資料</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-sm)" }}>
                {topFoods.map((f, i) => (
                  <div key={f.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--spacing-sm)", borderRadius: "var(--radius-sm)", background: i === 0 ? "rgba(108, 99, 255, 0.08)" : "transparent" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-sm)" }}>
                      <span style={{ fontSize: "1.1rem" }}>{["🥇", "🥈", "🥉", "4️⃣", "5️⃣"][i]}</span>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: "0.9rem" }}>{f.name}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{f.count} 次</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>{Math.round(f.calories / f.count)} kcal</div>
                      <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>平均/次</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* InBody Trends */}
          {latestInBody && (
            <>
            <div 
              className="card" 
              style={{ marginBottom: "var(--spacing-lg)", cursor: "pointer", transition: "transform 0.2s" }} 
              onClick={() => setInbodyModalOpen(true)}
              onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.02)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--spacing-md)" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 600, margin: 0 }}>🏋️ InBody 最新數據</h3>
                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-primary)", background: "rgba(108, 99, 255, 0.1)", padding: "4px 10px", borderRadius: "12px", border: "1px solid rgba(108, 99, 255, 0.2)" }}>
                  查看詳細與歷史 👉
                </div>
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "var(--spacing-sm)" }}>
                檢測日期: {latestInBody.date} {prevInBody && `・上次: ${prevInBody.date}`}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--spacing-sm)" }}>
                {[
                  { label: "InBody 評分", value: latestInBody.score, prev: prevInBody?.score, unit: "", reverse: false },
                  { label: "體重", value: latestInBody.weight, prev: prevInBody?.weight, unit: "kg", reverse: true },
                  { label: "體脂率", value: latestInBody.bodyFatPercent, prev: prevInBody?.bodyFatPercent, unit: "%", reverse: true },
                  { label: "骨骼肌重", value: latestInBody.skeletalMuscleMass, prev: prevInBody?.skeletalMuscleMass, unit: "kg", reverse: false },
                  { label: "BMR", value: latestInBody.bmr, prev: prevInBody?.bmr, unit: "", reverse: false },
                  { label: "內臟脂肪", value: latestInBody.visceralFatLevel, prev: prevInBody?.visceralFatLevel, unit: "", reverse: true },
                ].map((m) => (
                  <div key={m.label} className="card-inset" style={{ textAlign: "center", padding: "var(--spacing-sm)" }}>
                    <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>{m.label}</div>
                    <div style={{ fontSize: "1rem", fontWeight: 700, marginTop: 2 }}>
                      {m.value ?? "—"}
                      {renderDelta(m.value, m.prev ?? null, m.unit, m.reverse)}
                    </div>
                  </div>
                ))}
              </div>
              {/* Weight trend mini chart */}
              {inbodyRecords.length > 1 && (
                <div style={{ marginTop: "var(--spacing-md)" }}>
                  <div style={{ fontSize: "0.8rem", fontWeight: 600, marginBottom: "var(--spacing-sm)" }}>📉 體重趨勢</div>
                  <div style={{ width: "100%", height: 120 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={[...inbodyRecords].reverse().slice(-10)} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" tickFormatter={(v) => v.slice(5)} tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                        <YAxis domain={['dataMin - 2', 'dataMax + 2']} tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                        <Tooltip 
                          contentStyle={{ background: "var(--text-primary)", color: "var(--color-bg)", borderRadius: 8, fontSize: 12, border: "none", padding: "4px 8px" }}
                          formatter={(val: any) => [`${val} kg`, '體重']}
                          labelFormatter={(label) => `檢測日期: ${label}`}
                        />
                        <Area type="monotone" dataKey="weight" stroke="var(--color-primary)" fillOpacity={1} fill="url(#colorWeight)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
            {inbodyModalOpen && (
              <InBodyModal records={inbodyRecords} onClose={() => setInbodyModalOpen(false)} />
            )}
            </>
          )}

          {/* AI Diet Analysis */}
          <div className="card" style={{ marginBottom: "var(--spacing-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--spacing-md)" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>🤖 AI 分析建議</h3>
              <button
                className={`btn btn-sm ${analysisLoading ? "" : "btn-secondary"}`}
                onClick={handleRefreshAnalysis}
                disabled={analysisLoading}
                style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
              >
                {analysisLoading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : "🔄 更新"}
              </button>
            </div>
            <div style={{ display: "flex", gap: "var(--spacing-xs)", marginBottom: "var(--spacing-md)" }}>
              {(['7days', '30days'] as const).map((p) => (
                <button
                  key={p}
                  className={`btn btn-sm ${analysisPeriod === p ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => {
                    setAnalysisPeriod(p);
                    const cached = localStorage.getItem(`diet-analysis-${p}`);
                    if (cached) setDietAnalysis(JSON.parse(cached));
                    else setDietAnalysis(null);
                  }}
                  style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem" }}
                >
                  {p === '7days' ? '近 7 天' : '近 30 天'}
                </button>
              ))}
            </div>
            {!dietAnalysis ? (
              <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "var(--spacing-lg)", fontSize: "0.85rem" }}>
                尚無分析結果，請點擊「🔄 更新」按鈕產生 AI 建議
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)" }}>
                <div className="card-inset" style={{ padding: "var(--spacing-md)" }}>
                  <div style={{ fontSize: "0.85rem", lineHeight: 1.6 }}>{dietAnalysis.summary}</div>
                </div>
                {dietAnalysis.mounjaroAssessment && (
                  <div>
                    <div style={{ fontSize: "0.8rem", fontWeight: 600, marginBottom: "var(--spacing-xs)" }}>💉 GLP-1 綜合評估</div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>{dietAnalysis.mounjaroAssessment}</div>
                  </div>
                )}
                <div>
                  <div style={{ fontSize: "0.8rem", fontWeight: 600, marginBottom: "var(--spacing-xs)" }}>🔥 熱量評估</div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>{dietAnalysis.calorieAssessment}</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.8rem", fontWeight: 600, marginBottom: "var(--spacing-xs)" }}>⚖️ 營養素評估</div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>{dietAnalysis.macroAssessment}</div>
                </div>
                {dietAnalysis.strengths.length > 0 && (
                  <div>
                    <div style={{ fontSize: "0.8rem", fontWeight: 600, marginBottom: "var(--spacing-xs)" }}>✅ 飲食優點</div>
                    <ul style={{ paddingLeft: "1.2rem", fontSize: "0.85rem", color: "var(--color-success)", lineHeight: 1.8 }}>
                      {dietAnalysis.strengths.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )}
                {dietAnalysis.concerns.length > 0 && (
                  <div>
                    <div style={{ fontSize: "0.8rem", fontWeight: 600, marginBottom: "var(--spacing-xs)" }}>⚠️ 需注意事項</div>
                    <ul style={{ paddingLeft: "1.2rem", fontSize: "0.85rem", color: "#f39c12", lineHeight: 1.8 }}>
                      {dietAnalysis.concerns.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>
                )}
                {dietAnalysis.suggestions.length > 0 && (
                  <div>
                    <div style={{ fontSize: "0.8rem", fontWeight: 600, marginBottom: "var(--spacing-xs)" }}>💡 改善建議</div>
                    <ul style={{ paddingLeft: "1.2rem", fontSize: "0.85rem", color: "var(--color-primary)", lineHeight: 1.8 }}>
                      {dietAnalysis.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )}
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textAlign: "right" }}>
                  分析時間: {dietAnalysis.generatedAt ? new Date(dietAnalysis.generatedAt).toLocaleString("zh-TW") : "—"}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
