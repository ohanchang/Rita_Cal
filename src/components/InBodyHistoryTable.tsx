"use client";

import React from "react";
import { InBodyRecord } from "@/lib/types";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

interface Props {
  records: InBodyRecord[];
}

export default function InBodyHistoryTable({ records }: Props) {
  if (records.length <= 1) return null;

  // 排序由新到舊 (假設原本傳進來就排序過了，這裡保險起見再次按日期降序)
  const sorted = [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  // 最多顯示最近 5 筆在表格
  const displayRecords = sorted.slice(0, 5);
  
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    } catch {
      return dateStr;
    }
  };

  const getChangeIcon = (current: number | null, previous: number | null, invertGood: boolean = false) => {
    if (current === null || previous === null) return <Minus size={14} color="var(--text-muted)" />;
    if (current === previous) return <Minus size={14} color="var(--text-muted)" />;
    
    const diff = current - previous;
    const isIncrease = diff > 0;
    
    // Invert good means lower is better (like BodyFat, VisceralFat, Weight for some)
    const isGood = invertGood ? !isIncrease : isIncrease;
    const color = isGood ? "var(--color-success)" : "var(--color-danger)";
    
    return isIncrease 
      ? <ArrowUpRight size={16} color={color} style={{ strokeWidth: 3 }} />
      : <ArrowDownRight size={16} color={color} style={{ strokeWidth: 3 }} />;
  };

  const renderRow = (label: string, unit: string, key: keyof InBodyRecord, invertGood: boolean = false) => {
    return (
      <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
        <td style={{ position: "sticky", left: 0, zIndex: 1, backgroundColor: "var(--color-bg)", boxShadow: "2px 0 5px -2px rgba(0,0,0,0.1)", padding: "12px 16px", fontWeight: 600, color: "var(--text-primary)", fontSize: "0.85rem" }}>
          {label} <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 400 }}>({unit})</span>
        </td>
        {displayRecords.map((rec, i) => {
          const val = rec[key] as number | null;
          const prevRec = displayRecords[i + 1];
          const prevVal = prevRec ? prevRec[key] as number | null : null;
          
          return (
            <td key={rec.id} style={{ padding: "12px 16px", textAlign: "right", fontSize: "0.9rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                {val !== null ? val.toFixed(1) : "-"}
                {i < displayRecords.length - 1 && getChangeIcon(val, prevVal, invertGood)}
              </div>
            </td>
          );
        })}
      </tr>
    );
  };

  return (
    <div className="card" style={{ marginTop: "var(--spacing-xl)", overflow: "hidden" }}>
      <div style={{ padding: "var(--spacing-md) var(--spacing-lg)", borderBottom: "1px solid var(--border-color)", background: "var(--color-bg)" }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, color: "var(--color-primary-dark)" }}>
          📈 歷史數據變化
        </h3>
        <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: "4px 0 0 0" }}>
          追蹤最近 {displayRecords.length} 次的變化軌跡
        </p>
      </div>
      
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
          <thead>
            <tr style={{ background: "rgba(163, 177, 198, 0.1)" }}>
              <th style={{ position: "sticky", left: 0, zIndex: 2, backgroundColor: "#f3f5f8", boxShadow: "2px 0 5px -2px rgba(0,0,0,0.1)", padding: "12px 16px", textAlign: "left", color: "var(--text-secondary)", fontSize: "0.8rem", fontWeight: 500, width: 140 }}>
                檢測日期
              </th>
              {displayRecords.map(rec => (
                <th key={rec.id} style={{ padding: "12px 16px", textAlign: "right", color: "var(--text-secondary)", fontSize: "0.85rem", fontWeight: 600 }}>
                  {formatDate(rec.date)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {renderRow("InBody 評分", "分", "score", false)}
            {renderRow("體重", "kg", "weight", true)}
            {renderRow("骨骼肌重", "kg", "skeletalMuscleMass", false)}
            {renderRow("體脂肪率", "%", "bodyFatPercent", true)}
            {renderRow("BMI", "", "bmi", true)}
            {renderRow("內臟脂肪", "級", "visceralFatLevel", true)}
            {renderRow("基礎代謝", "kcal", "bmr", false)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
