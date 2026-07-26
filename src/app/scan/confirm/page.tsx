"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { FoodData, FoodItem, MEAL_TYPES, FOOD_SOURCES, MealType, FoodSource } from "@/lib/types";
import { isDemoMode } from "@/lib/demo-mode";
import { useAppStore } from "@/lib/store";
import { toast } from "react-hot-toast";

function ConfirmContent() {
  const router = useRouter();
  const [foodData, setFoodData] = useState<FoodData | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // #3 — Read from sessionStorage instead of URL query
  useEffect(() => {
    const dataStr = sessionStorage.getItem("foodData");
    if (dataStr) {
      try {
        const parsed = JSON.parse(dataStr);
        if (!parsed.date) {
          parsed.date = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Taipei" });
        }
        setFoodData(parsed);
      } catch {
        setError("資料解析失敗");
      }
    } else {
      setError("找不到分析資料，請重新拍照或搜尋");
    }
  }, []);

  // #16 — Dynamic page title
  useEffect(() => {
    if (foodData?.foodName) {
      document.title = `確認 — ${foodData.foodName} | 卡路里追蹤`;
    }
    return () => { document.title = "Food Calories Tracker | 智慧卡路里追蹤"; };
  }, [foodData?.foodName]);

  function updateItem(index: number, field: keyof FoodItem, value: string | number) {
    if (!foodData) return;
    const newItems = [...foodData.items];
    newItems[index] = { ...newItems[index], [field]: value };

    const totalCalories = newItems.reduce((sum, item) => sum + Number(item.calories), 0);
    const totalProtein = newItems.reduce((sum, item) => sum + Number(item.protein), 0);
    const totalCarbs = newItems.reduce((sum, item) => sum + Number(item.carbs), 0);
    const totalFat = newItems.reduce((sum, item) => sum + Number(item.fat), 0);
    const totalFiber = newItems.reduce((sum, item) => sum + Number(item.fiber), 0);

    setFoodData({
      ...foodData,
      items: newItems,
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFat,
      totalFiber,
    });
  }

  function removeItem(index: number) {
    if (!foodData) return;
    const newItems = foodData.items.filter((_, i) => i !== index);
    const totalCalories = newItems.reduce((sum, item) => sum + Number(item.calories), 0);
    const totalProtein = newItems.reduce((sum, item) => sum + Number(item.protein), 0);
    const totalCarbs = newItems.reduce((sum, item) => sum + Number(item.carbs), 0);
    const totalFat = newItems.reduce((sum, item) => sum + Number(item.fat), 0);
    const totalFiber = newItems.reduce((sum, item) => sum + Number(item.fiber), 0);

    setFoodData({ ...foodData, items: newItems, totalCalories, totalProtein, totalCarbs, totalFat, totalFiber });
  }

  function addItem() {
    if (!foodData) return;
    const newItem: FoodItem = {
      name: "新品項",
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      portion: "",
      confidence: "低",
    };
    setFoodData({ ...foodData, items: [...foodData.items, newItem] });
  }

  async function handleSave() {
    if (!foodData) return;

    setSaving(true);
    setError("");

    try {
      if (isDemoMode()) {
        await new Promise((r) => setTimeout(r, 800));
        setSuccess(true);
        sessionStorage.removeItem("foodData");
        setTimeout(() => router.push("/"), 1500);
        return;
      }

      // #8 — Safe JSON serialization for items
      const safeData = { ...foodData };
      const itemsJson = JSON.stringify(safeData.items || []);
      if (itemsJson.length > 1900) {
        // Truncate item portions/confidence to fit within Notion's 2000 char limit
        safeData.items = safeData.items.map(item => ({
          ...item,
          portion: item.portion?.substring(0, 20) || "",
        }));
      }

      // Optimistic UI Update
      const tempId = `temp-${Date.now()}`;
      useAppStore.getState().addFoodOptimistic({
        ...safeData,
        id: tempId,
        createdAt: new Date().toISOString()
      });

      const res = await fetch("/api/notion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(safeData),
      });

      const json = await res.json();
      if (!json.success) {
        useAppStore.getState().removeFoodOptimistic(tempId);
        setError(json.error || "儲存失敗");
        return;
      }

      // 替換暫存 ID 為真實 ID，或強制重載一次（如果不想寫複雜邏輯則簡單重載即可，這邊重載可能最省事，因為列表重新 fetch 就可以）
      // 我們直接依賴下次回首頁時背景 loadRecords
      useAppStore.getState().setFoodRecords(
        useAppStore.getState().foodRecords.map(r => r.id === tempId ? { ...r, id: json.id || tempId } : r)
      );

      setSuccess(true);
      sessionStorage.removeItem("foodData");
      setTimeout(() => router.push("/"), 500); // Faster redirect since it's optimistic
    } catch (err) {
      setError("儲存過程發生錯誤");
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  function handleSaveFavorite() {
    if (!foodData) return;
    const favoriteData = { ...foodData, id: `fav-${Date.now()}` };
    useAppStore.getState().addFavorite(favoriteData);
    toast.success("已加入常用餐點！\n下次可直接從搜尋頁帶入", { icon: "🍱" });
  }

  if (!foodData) {
    return (
      <div className="page-container">
        <div className="card" style={{ textAlign: "center", padding: "var(--spacing-2xl)" }}>
          {error ? (
            <>
              <div style={{ fontSize: "2rem", marginBottom: "var(--spacing-md)" }}>⚠️</div>
              <div style={{ color: "var(--color-danger)", marginBottom: "var(--spacing-md)" }}>{error}</div>
              <button className="btn btn-primary" onClick={() => router.push("/scan")}>📸 回到拍照</button>
            </>
          ) : (
            <>
              <span className="spinner" />
              <div style={{ marginTop: "var(--spacing-md)" }}>載入中...</div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="page-container">
        <div className="card" style={{ textAlign: "center", padding: "var(--spacing-2xl)", animation: "fadeIn 0.3s ease" }}>
          <div style={{ fontSize: "3rem", marginBottom: "var(--spacing-md)" }}>✅</div>
          <div style={{ fontSize: "1.2rem", fontWeight: 600 }}>已儲存！</div>
          <div style={{ color: "var(--text-muted)", marginTop: "var(--spacing-sm)" }}>正在返回首頁...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 className="page-title">✏️ 確認修改</h1>
        {foodData.overallConfidence && (
          <span className={`badge badge-${
            foodData.overallConfidence === "高" ? "high" : 
            foodData.overallConfidence === "中" ? "medium" : "low"
          }`}>
            AI 信心度: {foodData.overallConfidence}
          </span>
        )}
      </div>

      {/* 雙圖分析提示 */}
      {(foodData as any).scanMode === "before_after" && (
        <div className="card" style={{
          background: "rgba(108, 99, 255, 0.08)",
          border: "1px solid rgba(108, 99, 255, 0.3)",
          color: "var(--color-primary-dark)",
          borderRadius: "var(--radius-md)",
          padding: "var(--spacing-md)",
          marginBottom: "var(--spacing-md)",
          fontSize: "0.9rem",
          display: "flex",
          alignItems: "center",
          gap: "var(--spacing-sm)",
          boxShadow: "var(--neu-flat)",
        }}>
          <span style={{ fontSize: "1.2rem" }}>⚖️</span>
          <span>已使用餐前與餐後照片比對分析，以下數值為實際攝取量（餐前 - 剩餘）。</span>
        </div>
      )}

      {/* 總覽 */}
      <div className="card" style={{ marginBottom: "var(--spacing-md)", animation: "fadeIn 0.3s ease" }}>
        <label className="label">食物名稱</label>
        <input
          className="input"
          value={foodData.foodName}
          onChange={(e) => setFoodData({ ...foodData, foodName: e.target.value })}
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--spacing-md)", marginTop: "var(--spacing-md)" }}>
          <div>
            <label className="label">用餐類型</label>
            <select
              className="select"
              value={foodData.mealType}
              onChange={(e) => setFoodData({ ...foodData, mealType: e.target.value as MealType })}
            >
              {MEAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">來源</label>
            <select
              className="select"
              value={foodData.source}
              onChange={(e) => setFoodData({ ...foodData, source: e.target.value as FoodSource })}
            >
              {FOOD_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--spacing-md)", marginTop: "var(--spacing-md)" }}>
          <div>
            <label className="label">日期</label>
            <input
              className="input"
              type="date"
              value={foodData.date}
              onChange={(e) => setFoodData({ ...foodData, date: e.target.value })}
            />
          </div>
          <div>
            <label className="label">餐廳名稱（選填）</label>
            <input
              className="input"
              value={foodData.restaurantName}
              onChange={(e) => setFoodData({ ...foodData, restaurantName: e.target.value })}
              placeholder="如：麥當勞"
            />
          </div>
        </div>
      </div>

      {/* 營養素總計 */}
      <div className="card-inset" style={{ marginBottom: "var(--spacing-md)", textAlign: "center" }}>
        <div className="calories-value" style={{ fontSize: "2rem" }}>
          {foodData.totalCalories.toLocaleString()}
          <span className="calories-unit" style={{ fontSize: "0.9rem" }}> kcal</span>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: "var(--spacing-lg)", marginTop: "var(--spacing-sm)", fontSize: "0.85rem" }}>
          <span className="macro-protein">P: {foodData.totalProtein.toFixed(1)}g</span>
          <span className="macro-carbs">C: {foodData.totalCarbs.toFixed(1)}g</span>
          <span className="macro-fat">F: {foodData.totalFat.toFixed(1)}g</span>
          <span className="macro-fiber" style={{ color: "var(--color-success)" }}>Fi: {foodData.totalFiber.toFixed(1)}g</span>
        </div>
      </div>

      {/* 品項明細 — #15 responsive grid */}
      <div style={{ marginBottom: "var(--spacing-md)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--spacing-sm)" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 600 }}>品項明細</h2>
          <button className="btn btn-sm btn-secondary" onClick={addItem}>+ 新增品項</button>
        </div>

        {foodData.items.map((item, index) => (
          <div key={index} className="card" style={{ marginBottom: "var(--spacing-sm)", padding: "var(--spacing-md)", animation: `fadeIn ${0.2 + index * 0.1}s ease` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--spacing-sm)" }}>
              <input
                className="input"
                value={item.name}
                onChange={(e) => updateItem(index, "name", e.target.value)}
                style={{ flex: 1, marginRight: "var(--spacing-sm)" }}
              />
              <button
                className="btn btn-sm btn-danger"
                onClick={() => removeItem(index)}
                style={{ padding: "0.2rem 0.5rem", fontSize: "0.7rem" }}
              >
                ✕
              </button>
            </div>
            <div className="nutrient-grid">
              <div>
                <label className="label" style={{ fontSize: "0.7rem" }}>卡路里</label>
                <input className="input" type="number" value={item.calories}
                  onChange={(e) => updateItem(index, "calories", Number(e.target.value))} style={{ fontSize: "0.85rem" }} />
              </div>
              <div>
                <label className="label" style={{ fontSize: "0.7rem" }}>蛋白質(g)</label>
                <input className="input" type="number" value={item.protein} step="0.1"
                  onChange={(e) => updateItem(index, "protein", Number(e.target.value))} style={{ fontSize: "0.85rem" }} />
              </div>
              <div>
                <label className="label" style={{ fontSize: "0.7rem" }}>碳水(g)</label>
                <input className="input" type="number" value={item.carbs} step="0.1"
                  onChange={(e) => updateItem(index, "carbs", Number(e.target.value))} style={{ fontSize: "0.85rem" }} />
              </div>
              <div>
                <label className="label" style={{ fontSize: "0.7rem" }}>脂肪(g)</label>
                <input className="input" type="number" value={item.fat} step="0.1"
                  onChange={(e) => updateItem(index, "fat", Number(e.target.value))} style={{ fontSize: "0.85rem" }} />
              </div>
              <div>
                <label className="label" style={{ fontSize: "0.7rem" }}>纖維(g)</label>
                <input className="input" type="number" value={item.fiber} step="0.1"
                  onChange={(e) => updateItem(index, "fiber", Number(e.target.value))} style={{ fontSize: "0.85rem" }} />
              </div>
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "var(--spacing-xs)" }}>
              {item.portion} · 信心: {item.confidence}
            </div>
          </div>
        ))}
      </div>

      {/* 備註 */}
      <div className="card" style={{ marginBottom: "var(--spacing-lg)" }}>
        <label className="label">備註</label>
        <textarea
          className="textarea"
          value={foodData.note}
          onChange={(e) => setFoodData({ ...foodData, note: e.target.value })}
          placeholder="可添加備註..."
          style={{ minHeight: "160px", resize: "vertical", lineHeight: "1.6" }}
        />
      </div>

      {/* 錯誤提示 */}
      {error && (
        <div style={{
          background: "rgba(255, 107, 107, 0.1)",
          border: "1px solid rgba(255, 107, 107, 0.3)",
          borderRadius: "var(--radius-md)",
          padding: "var(--spacing-md)",
          marginBottom: "var(--spacing-md)",
          color: "var(--color-danger)",
          fontSize: "0.9rem",
        }}>
          ❌ {error}
        </div>
      )}

      {/* 按鈕 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--spacing-md)" }}>
        <button className="btn btn-secondary btn-lg" onClick={() => router.back()}>
          ← 返回
        </button>
        <button
          className="btn btn-primary btn-lg"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <>
              <span className="spinner" style={{ width: "18px", height: "18px" }} />
              儲存中...
            </>
          ) : (
            "💾 確認儲存"
          )}
        </button>
      </div>
      
      <button 
        className="btn btn-secondary" 
        style={{ width: "100%", marginTop: "var(--spacing-md)", padding: "12px", border: "1px dashed var(--color-primary)" }} 
        onClick={handleSaveFavorite}
      >
        🍱 將此餐點加入「常用餐點」
      </button>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={
      <div className="page-container">
        <div className="card" style={{ textAlign: "center", padding: "var(--spacing-2xl)" }}>
          <span className="spinner" />
        </div>
      </div>
    }>
      <ConfirmContent />
    </Suspense>
  );
}
