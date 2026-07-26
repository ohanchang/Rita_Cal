"use client";

import { useState } from "react";
import { FoodRecord, MealType, MEAL_TYPES, FOOD_SOURCES, FoodSource } from "@/lib/types";
import { isDemoMode } from "@/lib/demo-mode";
import { useRecords } from "@/lib/useRecords";
import { getMealClass } from "@/lib/utils";

export default function HistoryPage() {
  const { records, setRecords, loading, loadRecords } = useRecords();
  const [filter, setFilter] = useState<MealType | "全部">("全部");
  const [dateFilter, setDateFilter] = useState<"本月" | "上月" | "全部">("本月");
  const [visibleCount, setVisibleCount] = useState(20);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  // Modal Edit State
  const [editingRecord, setEditingRecord] = useState<FoodRecord | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Date and Type Filtering
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`;

  const filtered = records.filter((r) => {
    // Type match
    if (filter !== "全部" && r.mealType !== filter) return false;
    // Date match
    if (dateFilter === "本月" && !r.date?.startsWith(currentMonth)) return false;
    if (dateFilter === "上月" && !r.date?.startsWith(lastMonth)) return false;
    return true;
  });

  const visibleRecords = filtered.slice(0, visibleCount);

  // 按日期分組
  const grouped = visibleRecords.reduce<Record<string, FoodRecord[]>>((acc, r) => {
    const date = r.date || "未知日期";
    if (!acc[date]) acc[date] = [];
    acc[date].push(r);
    return acc;
  }, {});

  function toggleSelect(id: string) {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  }

  async function handleBatchDelete() {
    if (selectedIds.size === 0) return;

    setDeleting(true);
    try {
      if (isDemoMode()) {
        await new Promise((r) => setTimeout(r, 500));
        setRecords(records.filter((r) => !selectedIds.has(r.id)));
        setSelectedIds(new Set());
        return;
      }

      for (const id of selectedIds) {
        await fetch(`/api/notion?id=${id}`, { method: "DELETE" });
      }

      setSelectedIds(new Set());
      await loadRecords();
    } catch (err) {
      console.error("刪除失敗:", err);
    } finally {
      setDeleting(false);
    }
  }

  async function handleSaveEdit() {
    if (!editingRecord) return;
    setSavingEdit(true);

    try {
      if (isDemoMode()) {
        await new Promise((r) => setTimeout(r, 500));
        setRecords(records.map(r => r.id === editingRecord.id ? editingRecord : r));
        setEditingRecord(null);
        return;
      }

      await fetch(`/api/notion?id=${editingRecord.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: editingRecord.date,
          mealType: editingRecord.mealType,
          source: editingRecord.source,
          foodName: editingRecord.foodName,
          restaurantName: editingRecord.restaurantName,
          note: editingRecord.note,
          totalCalories: editingRecord.totalCalories,
          totalProtein: editingRecord.totalProtein,
          totalCarbs: editingRecord.totalCarbs,
          totalFat: editingRecord.totalFat,
          totalFiber: editingRecord.totalFiber,
        }),
      });

      await loadRecords(true);
      setEditingRecord(null);
    } catch (err) {
      console.error("更新失敗:", err);
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">📋 歷史記錄</h1>
        {selectedIds.size > 0 && (
          <button
            className="btn btn-sm btn-danger"
            onClick={handleBatchDelete}
            disabled={deleting}
          >
            {deleting ? "刪除中..." : `🗑️ 刪除 (${selectedIds.size})`}
          </button>
        )}
      </div>

      {/* 篩選群組 */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-sm)", marginBottom: "var(--spacing-lg)" }}>
        {/* 日期篩選 */}
        <div style={{ display: "flex", gap: "var(--spacing-xs)", overflowX: "auto", paddingBottom: "2px" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", alignSelf: "center", marginRight: "8px", fontWeight: 600 }}>時間:</span>
          {(["全部", "本月", "上月"] as const).map((t) => (
            <button
              key={t}
              className={`btn btn-sm ${dateFilter === t ? "btn-primary" : "btn-secondary"}`}
              onClick={() => { setDateFilter(t); setVisibleCount(20); }}
              style={{ whiteSpace: "nowrap", fontSize: "0.75rem", padding: "0.25rem 0.6rem" }}
            >
              {t}
            </button>
          ))}
        </div>
        {/* 類型篩選 */}
        <div style={{ display: "flex", gap: "var(--spacing-xs)", overflowX: "auto", paddingBottom: "2px" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", alignSelf: "center", marginRight: "8px", fontWeight: 600 }}>類型:</span>
          {(["全部", ...MEAL_TYPES] as const).map((t) => (
            <button
              key={t}
              className={`btn btn-sm ${filter === t ? "btn-primary" : "btn-secondary"}`}
              onClick={() => { setFilter(t); setVisibleCount(20); }}
              style={{ whiteSpace: "nowrap", fontSize: "0.75rem", padding: "0.25rem 0.6rem" }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)" }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton" style={{ height: "80px" }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "var(--spacing-2xl)", color: "var(--text-muted)" }}>
          <div style={{ fontSize: "2rem", marginBottom: "var(--spacing-sm)" }}>📭</div>
          沒有找到記錄
        </div>
      ) : (
        Object.entries(grouped).map(([date, items]) => {
          const dayTotal = items.reduce((sum, r) => sum + r.totalCalories, 0);
          return (
            <div key={date} style={{ marginBottom: "var(--spacing-lg)" }}>
              {/* 日期標題 */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "var(--spacing-sm)",
                padding: "var(--spacing-xs) 0",
              }}>
                <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                  📅 {date}
                </span>
                <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                  <span className="calories-value">{dayTotal.toLocaleString()}</span>
                  <span className="calories-unit"> kcal</span>
                </span>
              </div>

              {/* 記錄列表 */}
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-sm)" }}>
                {items.map((r) => (
                  <div
                    key={r.id}
                    className="card"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "var(--spacing-md)",
                      gap: "var(--spacing-sm)",
                      border: selectedIds.has(r.id) ? "2px solid var(--color-danger)" : "none",
                      cursor: "pointer",
                    }}
                    onClick={() => setEditingRecord(r)}
                  >
                    {/* Checkbox area */}
                    <div style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: "var(--radius-sm)",
                      border: selectedIds.has(r.id) ? "none" : "2px solid var(--border-color)",
                      background: selectedIds.has(r.id) ? "var(--color-danger)" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.9rem",
                      color: "white",
                      flexShrink: 0,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelect(r.id);
                    }}
                    >
                      {selectedIds.has(r.id) && "✓"}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, marginBottom: 2 }}>{r.foodName}</div>
                      <div style={{ display: "flex", gap: "var(--spacing-sm)", fontSize: "0.75rem", flexWrap: "wrap" }}>
                        <span className={`badge badge-${getMealClass(r.mealType)}`}>{r.mealType}</span>
                        <span style={{ color: "var(--text-muted)" }}>{r.source}</span>
                        {r.restaurantName && (
                          <span style={{ color: "var(--text-secondary)" }}>📍 {r.restaurantName}</span>
                        )}
                      </div>
                    </div>

                    {/* Calories */}
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div className="calories-value">{r.totalCalories.toLocaleString()}</div>
                      <div className="calories-unit">kcal</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}

      {/* 載入更多按鈕 */}
      {!loading && visibleCount < filtered.length && (
        <div style={{ textAlign: "center", margin: "var(--spacing-lg) 0 var(--spacing-2xl) 0" }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => setVisibleCount(c => c + 20)}
            style={{ width: "100%", maxWidth: "300px" }}
          >
            載入更多 ({visibleCount} / {filtered.length})
          </button>
        </div>
      )}

      {/* Edit Modal — #10 animated */}
      {editingRecord && (
        <div className="modal-overlay" onClick={() => setEditingRecord(null)}>
          <div className="card modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 600 }}>🍽️ 餐點明細與編輯</h2>
              <button className="btn btn-sm" onClick={() => setEditingRecord(null)}>✕</button>
            </div>

            {/* #4 — 食物名稱可編輯 */}
            <div>
              <label className="label">食物名稱</label>
              <input className="input" value={editingRecord.foodName}
                onChange={e => setEditingRecord({...editingRecord, foodName: e.target.value})} />
            </div>
            
            <div style={{ display: "flex", gap: "var(--spacing-sm)", fontSize: "0.85rem", overflowX: "auto" }}>
              <span className="macro-protein">P: {editingRecord.totalProtein}g</span>
              <span className="macro-carbs">C: {editingRecord.totalCarbs}g</span>
              <span className="macro-fat">F: {editingRecord.totalFat}g</span>
              <span className="calories-value">{editingRecord.totalCalories} kcal</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-sm)" }}>
              {editingRecord.items.map((item, idx) => (
                <div key={idx} className="card-inset" style={{ padding: "var(--spacing-md)", display: "flex", flexDirection: "column", gap: "var(--spacing-xs)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{item.name} {item.portion ? `(${item.portion})` : ""}</span>
                    <span className="calories-value" style={{ fontSize: "0.95rem" }}>{item.calories} <span className="calories-unit" style={{ fontSize: "0.75rem" }}>kcal</span></span>
                  </div>
                  <div style={{ display: "flex", gap: "var(--spacing-sm)", fontSize: "0.75rem" }}>
                    <span className="macro-protein">P: {item.protein}g</span>
                    <span className="macro-carbs">C: {item.carbs}g</span>
                    <span className="macro-fat">F: {item.fat}g</span>
                    <span className="macro-fiber" style={{ color: "var(--color-success)" }}>Fi: {item.fiber}g</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--spacing-sm)" }}>
              <div>
                <label className="label">日期</label>
                <input type="date" className="input" value={editingRecord.date}
                  onChange={e => setEditingRecord({...editingRecord, date: e.target.value})} />
              </div>
              {/* #4 — 餐廳名稱可編輯 */}
              <div>
                <label className="label">餐廳名稱</label>
                <input className="input" value={editingRecord.restaurantName || ""}
                  onChange={e => setEditingRecord({...editingRecord, restaurantName: e.target.value})}
                  placeholder="選填" />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--spacing-sm)" }}>
              <div>
                <label className="label">用餐類型</label>
                <select className="select" value={editingRecord.mealType}
                  onChange={e => setEditingRecord({...editingRecord, mealType: e.target.value as MealType})}>
                  {MEAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label">來源</label>
                <select className="select" value={editingRecord.source}
                  onChange={e => setEditingRecord({...editingRecord, source: e.target.value as FoodSource})}>
                  {FOOD_SOURCES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="label">備註</label>
              <textarea 
                className="textarea" 
                value={editingRecord.note || ""}
                onChange={e => setEditingRecord({...editingRecord, note: e.target.value})}
                placeholder="可添加或修改備註..."
                style={{ minHeight: "120px", resize: "vertical", lineHeight: "1.5" }}
              />
            </div>

            {/* 營養素數值修正 */}
            <div>
              <div className="label" style={{ marginBottom: "var(--spacing-sm)" }}>
                🔢 修正營養數值（AI 估算有誤時使用）
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--spacing-sm)" }}>
                <div>
                  <label className="label">熱量 (kcal)</label>
                  <input
                    type="number"
                    className="input"
                    value={editingRecord.totalCalories}
                    min={0}
                    onChange={e => setEditingRecord({ ...editingRecord, totalCalories: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="label">蛋白質 (g)</label>
                  <input
                    type="number"
                    className="input"
                    value={editingRecord.totalProtein}
                    min={0}
                    step={0.1}
                    onChange={e => setEditingRecord({ ...editingRecord, totalProtein: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="label">碳水化合物 (g)</label>
                  <input
                    type="number"
                    className="input"
                    value={editingRecord.totalCarbs}
                    min={0}
                    step={0.1}
                    onChange={e => setEditingRecord({ ...editingRecord, totalCarbs: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="label">脂肪 (g)</label>
                  <input
                    type="number"
                    className="input"
                    value={editingRecord.totalFat}
                    min={0}
                    step={0.1}
                    onChange={e => setEditingRecord({ ...editingRecord, totalFat: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="label">膳食纖維 (g)</label>
                  <input
                    type="number"
                    className="input"
                    value={editingRecord.totalFiber}
                    min={0}
                    step={0.1}
                    onChange={e => setEditingRecord({ ...editingRecord, totalFiber: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            <button className="btn btn-primary btn-lg" style={{ marginTop: "var(--spacing-sm)" }} onClick={handleSaveEdit} disabled={savingEdit}>
              {savingEdit ? "儲存中..." : "💾 儲存修改"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
