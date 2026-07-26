"use client";

import { useState, useEffect } from "react";
import { AppSettings, DEFAULT_SETTINGS } from "@/lib/types";
import { getSettings, getDailyTargets } from "@/lib/settings";
import { isDemoMode } from "@/lib/demo-mode";
import { useRecords } from "@/lib/useRecords";
import { getMealClass } from "@/lib/utils";
import Link from "next/link";

export default function Dashboard() {
  const { records, loading, loadRecords } = useRecords();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    setSettings(getSettings());
    setDemo(isDemoMode());
  }, []);

  // #2 — Auto refresh when page becomes visible
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        loadRecords();
        setSettings(getSettings());
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [loadRecords]);

  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Taipei" });
  const todayRecords = records.filter((r) => r.date === today);
  const todayCalories = todayRecords.reduce((sum, r) => sum + r.totalCalories, 0);
  const todayProtein = todayRecords.reduce((sum, r) => sum + r.totalProtein, 0);
  const todayCarbs = todayRecords.reduce((sum, r) => sum + r.totalCarbs, 0);
  const todayFat = todayRecords.reduce((sum, r) => sum + r.totalFat, 0);
  const todayFiber = todayRecords.reduce((sum, r) => sum + r.totalFiber, 0);
  const targets = getDailyTargets(settings);
  const caloriePercent = targets.calories > 0 ? (todayCalories / targets.calories) * 100 : 0;
  const recentRecords = records.slice(0, 5);

  const macros = [
    { label: "蛋白質", value: todayProtein, target: targets.protein, color: "#0984e3", cls: "macro-protein" },
    { label: "碳水", value: todayCarbs, target: targets.carbs, color: "#fdcb6e", cls: "macro-carbs" },
    { label: "脂肪", value: todayFat, target: targets.fat, color: "#e17055", cls: "macro-fat" },
    { label: "纖維", value: todayFiber, target: 25, color: "#00b894", cls: "macro-fiber" },
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">🍽️ 卡路里追蹤</h1>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-sm)" }}>
          {demo && (
            <span className="badge" style={{ background: "rgba(253, 203, 110, 0.2)", color: "#f39c12" }}>
              Demo
            </span>
          )}
          <Link
            href="/settings"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              borderRadius: "var(--radius-full)",
              background: "var(--color-bg)",
              boxShadow: "var(--neu-raised)",
              fontSize: "1.1rem",
              textDecoration: "none",
            }}
            aria-label="設定"
          >
            ⚙️
          </Link>
        </div>
      </div>

      {/* 今日卡路里 */}
      <div className="card" style={{ marginBottom: "var(--spacing-md)", animation: "fadeIn 0.3s ease" }}>
        <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "var(--spacing-xs)" }}>
          今日攝取
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "var(--spacing-sm)" }}>
          <span className="calories-value" style={{ fontSize: "2.2rem" }}>
            {todayCalories.toLocaleString()}
          </span>
          <span className="calories-unit" style={{ fontSize: "0.9rem" }}>
            / {targets.calories.toLocaleString()} kcal
          </span>
        </div>
        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "var(--spacing-xs)" }}>
          {todayRecords.length} 筆記錄
        </div>
      </div>

      {/* 卡路里進度條 */}
      <div className="card" style={{ marginBottom: "var(--spacing-md)", animation: "fadeIn 0.4s ease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--spacing-sm)" }}>
          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>每日目標進度</span>
          <span style={{
            fontSize: "0.85rem",
            fontWeight: 600,
            color: caloriePercent > 100 ? "var(--color-danger)" : "var(--color-success)"
          }}>
            {caloriePercent.toFixed(0)}%
          </span>
        </div>
        <div className="progress-bar">
          <div
            className={`progress-fill ${caloriePercent > 100 ? "over-target" : ""}`}
            style={{ width: `${Math.min(caloriePercent, 100)}%` }}
          />
        </div>
      </div>

      {/* #9 營養素概覽 — 帶進度條 */}
      <div className="macro-grid" style={{ marginBottom: "var(--spacing-lg)" }}>
        {macros.map((m, i) => {
          const pct = m.target > 0 ? Math.min((m.value / m.target) * 100, 100) : 0;
          return (
            <div key={m.label} className="card-flat macro-card" style={{ animation: `fadeIn ${0.5 + i * 0.1}s ease` }}>
              <div className="macro-card-label">{m.label}</div>
              <div className={m.cls} style={{ fontSize: "1.1rem", fontWeight: 700, marginTop: 2 }}>
                {m.value.toFixed(0)}g
              </div>
              <div className="macro-card-target">/ {m.target}g</div>
              <div className="progress-bar" style={{ height: "4px", marginTop: "6px" }}>
                <div style={{ height: "100%", width: `${pct}%`, borderRadius: "var(--radius-full)", background: m.color, transition: "width 0.8s ease" }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* 快捷入口 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--spacing-md)", marginBottom: "var(--spacing-lg)" }}>
        <Link href="/scan" className="btn btn-primary btn-lg" style={{ textDecoration: "none" }}>
          📸 拍照辨識
        </Link>
        <Link href="/search" className="btn btn-secondary btn-lg" style={{ textDecoration: "none" }}>
          🔍 搜尋餐廳
        </Link>
      </div>

      {/* 最近記錄 */}
      <div style={{ marginBottom: "var(--spacing-lg)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--spacing-md)" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 600 }}>最近記錄</h2>
          <Link href="/history" style={{ fontSize: "0.85rem", color: "var(--color-primary)", textDecoration: "none" }}>
            查看全部 →
          </Link>
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)" }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: "72px" }} />
            ))}
          </div>
        ) : recentRecords.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "var(--spacing-2xl)", color: "var(--text-muted)" }}>
            <div style={{ fontSize: "2rem", marginBottom: "var(--spacing-sm)" }}>🍽️</div>
            還沒有任何記錄，開始拍照吧！
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-sm)" }}>
            {recentRecords.map((r, i) => (
              <div
                key={r.id}
                className="card"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "var(--spacing-md)",
                  animation: `fadeIn ${0.3 + i * 0.1}s ease`,
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>{r.foodName}</div>
                  <div style={{ display: "flex", gap: "var(--spacing-sm)", fontSize: "0.8rem" }}>
                    <span className={`badge badge-${getMealClass(r.mealType)}`}>{r.mealType}</span>
                    <span style={{ color: "var(--text-muted)" }}>{r.date}</span>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="calories-value">{r.totalCalories.toLocaleString()}</div>
                  <div className="calories-unit">kcal</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
