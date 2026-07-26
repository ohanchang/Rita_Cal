"use client";

import React from "react";

export function Skeleton({ className = "", style = {} }: { className?: string, style?: React.CSSProperties }) {
  return (
    <div 
      className={`skeleton-loader ${className}`}
      style={{
        backgroundColor: "var(--color-bg-input)",
        backgroundImage: "linear-gradient(90deg, rgba(255,255,255,0) 0, rgba(255,255,255,0.2) 20%, rgba(255,255,255,0.5) 60%, rgba(255,255,255,0))",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s infinite linear",
        borderRadius: "var(--radius-sm)",
        ...style
      }}
    />
  );
}

export function FoodCardSkeleton() {
  return (
    <div className="card" style={{ marginBottom: "var(--spacing-md)", padding: "var(--spacing-md)" }}>
      <div style={{ display: "flex", gap: "var(--spacing-md)", marginBottom: "var(--spacing-sm)" }}>
        <Skeleton style={{ width: 80, height: 80, borderRadius: "var(--radius-md)", flexShrink: 0 }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: "var(--spacing-xs)" }}>
          <Skeleton style={{ height: 20, width: "70%" }} />
          <Skeleton style={{ height: 16, width: "40%" }} />
          <Skeleton style={{ height: 14, width: "30%" }} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--spacing-sm)" }}>
        <Skeleton style={{ height: 40 }} />
        <Skeleton style={{ height: 40 }} />
        <Skeleton style={{ height: 40 }} />
      </div>
    </div>
  );
}

export function StatsCardSkeleton() {
  return (
    <div className="card" style={{ marginBottom: "var(--spacing-md)", padding: "var(--spacing-md)" }}>
      <Skeleton style={{ height: 24, width: "40%", marginBottom: "var(--spacing-lg)" }} />
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "var(--spacing-lg)" }}>
        <Skeleton style={{ width: 140, height: 140, borderRadius: "50%" }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--spacing-md)" }}>
        <Skeleton style={{ height: 50 }} />
        <Skeleton style={{ height: 50 }} />
        <Skeleton style={{ height: 50 }} />
      </div>
    </div>
  );
}
