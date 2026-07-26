"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="page-container" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", textAlign: "center" }}>
      <div className="card" style={{ padding: "var(--spacing-2xl)", maxWidth: "400px", width: "100%" }}>
        <div style={{ fontSize: "3rem", marginBottom: "var(--spacing-md)" }}>⚠️</div>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "var(--spacing-sm)" }}>
          發生錯誤
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "var(--spacing-lg)" }}>
          {error.message || "頁面載入過程中發生問題，請嘗試重新載入。"}
        </p>
        <button className="btn btn-primary" onClick={reset}>
          🔄 重新載入
        </button>
      </div>
    </div>
  );
}
