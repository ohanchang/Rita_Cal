"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { isDemoMode } from "@/lib/demo-mode";
import { MOCK_FOOD_RECORDS } from "@/lib/mock-data";
import { useAppStore } from "@/lib/store";
import { FoodData } from "@/lib/types";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [favorites, setFavorites] = useState<any[]>([]);
  const router = useRouter();

  // Load from store on mount to avoid hydration mismatch
  useEffect(() => {
    setFavorites(useAppStore.getState().favorites || []);
  }, []);

  const suggestions = [
    "麥當勞 大麥克套餐",
    "星巴克 焦糖瑪奇朵 大杯",
    "路易莎 經典拿鐵",
    "肯德基 蛋撻",
    "鼎泰豐 小籠包 10入",
    "全家 茶葉蛋",
    "50嵐 四季春茶 大杯微糖",
    "水煮雞胸肉 200g",
  ];

  // #1 — 搜尋邏輯去重：統一入口
  async function handleSearch(searchQuery?: string) {
    const q = (searchQuery || query).trim();
    if (!q) return;

    setLoading(true);
    setError("");

    try {
      if (isDemoMode()) {
        await new Promise((r) => setTimeout(r, 1200));
        const mock = { ...MOCK_FOOD_RECORDS[1], foodName: q };
        sessionStorage.setItem("foodData", JSON.stringify(mock));
        router.push("/scan/confirm");
        return;
      }

      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });

      const json = await res.json();
      if (!json.success) {
        setError(json.error || "查詢失敗");
        return;
      }

      sessionStorage.setItem("foodData", JSON.stringify(json.data));
      router.push("/scan/confirm");
    } catch (err) {
      setError("搜尋過程發生錯誤");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleUseFavorite(fav: any) {
    // Override date with today
    const favData = { 
      ...fav, 
      date: new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Taipei" }) 
    };
    sessionStorage.setItem("foodData", JSON.stringify(favData));
    router.push("/scan/confirm");
  }

  function handleDeleteFavorite(id: string) {
    useAppStore.getState().removeFavorite(id);
    setFavorites(favorites.filter((f: any) => f.id !== id));
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">🔍 搜尋餐廳食物</h1>
      </div>

      {/* 搜尋框 */}
      <div className="card" style={{ marginBottom: "var(--spacing-md)" }}>
        <label className="label">輸入餐廳名稱 + 餐點</label>
        <div style={{ display: "flex", gap: "var(--spacing-sm)" }}>
          <input
            className="input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="例：麥當勞 大麥克套餐"
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            style={{ flex: 1 }}
          />
          <button
            className="btn btn-primary"
            onClick={() => handleSearch()}
            disabled={!query.trim() || loading}
            style={{ whiteSpace: "nowrap" }}
          >
            {loading ? <span className="spinner" style={{ width: "16px", height: "16px" }} /> : "搜尋"}
          </button>
        </div>
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

      {loading && (
        <div className="card" style={{ textAlign: "center", padding: "var(--spacing-2xl)", marginBottom: "var(--spacing-md)" }}>
          <span className="spinner" />
          <div style={{ marginTop: "var(--spacing-md)", color: "var(--text-muted)", fontSize: "0.9rem", animation: "pulse 2s ease infinite" }}>
            AI 正在查詢「{query}」的營養資訊...
          </div>
        </div>
      )}

      {/* 常用餐點區塊 */}
      {favorites.length > 0 && (
        <div style={{ marginBottom: "var(--spacing-lg)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "var(--spacing-md)" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 600 }}>🍱 常用餐點</h2>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>點擊直接紀錄</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--spacing-sm)" }}>
            {favorites.map((fav) => (
              <div
                key={fav.id}
                className="btn btn-sm"
                style={{ 
                  fontSize: "0.8rem", 
                  padding: "6px 12px", 
                  background: "var(--color-bg)", 
                  color: "var(--color-primary)", 
                  border: "1px solid var(--color-primary)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  borderRadius: "var(--radius-md)",
                  cursor: "default"
                }}
              >
                <span 
                  onClick={() => handleUseFavorite(fav)} 
                  style={{ cursor: "pointer", fontWeight: 600 }}
                >
                  {fav.foodName} <span style={{ opacity: 0.7, fontSize: "0.7rem", marginLeft: 4 }}>({fav.totalCalories} kcal)</span>
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteFavorite(fav.id);
                  }}
                  style={{ 
                    background: "none", 
                    border: "none", 
                    cursor: "pointer", 
                    color: "var(--color-danger)", 
                    fontSize: "1.1rem", 
                    fontWeight: 700,
                    display: "flex", 
                    alignItems: "center", 
                    padding: 0,
                    opacity: 0.7
                  }}
                  title="刪除此常用餐點"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 快速建議 — #1 去重，直接呼叫 handleSearch */}
      <div style={{ marginBottom: "var(--spacing-lg)" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "var(--spacing-md)" }}>💡 常見搜尋</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--spacing-sm)" }}>
          {suggestions.map((s) => (
            <button
              key={s}
              className="btn btn-sm btn-secondary"
              onClick={() => {
                setQuery(s);
                handleSearch(s);
              }}
              style={{ fontSize: "0.8rem" }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* 說明 */}
      <div className="card-flat" style={{ padding: "var(--spacing-md)", color: "var(--text-muted)", fontSize: "0.85rem" }}>
        <div style={{ fontWeight: 600, marginBottom: "var(--spacing-xs)" }}>💡 使用技巧</div>
        <ul style={{ paddingLeft: "1.2rem", lineHeight: 1.8 }}>
          <li>輸入品牌名稱 + 餐點名稱效果最佳</li>
          <li>可以輸入套餐名稱，AI 會自動拆分品項</li>
          <li>也可以輸入一般食物名稱估算卡路里</li>
          <li>搜尋結果可在確認頁面修改</li>
        </ul>
      </div>
    </div>
  );
}
