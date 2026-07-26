"use client";

import React, { useState } from "react";
import { InBodyRecord } from "@/lib/types";
import { fv, SegmentalDiagram, barPercent } from "./InBodyVisuals";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  records: InBodyRecord[];
  onClose: () => void;
  openIndex?: number;
}

export default function InBodyModal({ records, onClose, openIndex = 0 }: Props) {
  const [currentIndex, setCurrentIndex] = useState(openIndex);
  
  if (!records || records.length === 0) return null;
  
  const record = records[currentIndex];
  
  const handleNext = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1); // newer
  };
  
  const handlePrev = () => {
    if (currentIndex < records.length - 1) setCurrentIndex(currentIndex + 1); // older
  };

  const scoreColor = (record.score ?? 0) >= 80 ? "var(--color-success)" : (record.score ?? 0) >= 70 ? "var(--color-primary)" : "var(--color-warning)";

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.4)",
      backdropFilter: "blur(4px)",
      zIndex: 9999,
      display: "flex",
      justifyContent: "center",
      alignItems: "flex-end", // Bottom sheet effect on mobile
    }}>
      <div style={{
        background: "var(--color-bg)",
        width: "100%",
        maxWidth: "480px",
        height: "90vh",
        borderTopLeftRadius: "var(--radius-lg)",
        borderTopRightRadius: "var(--radius-lg)",
        boxShadow: "0 -4px 20px rgba(0,0,0,0.15)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      }}>
        {/* Header / Date Selector */}
        <div style={{ 
          padding: "var(--spacing-md) var(--spacing-lg)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          borderBottom: "1px solid var(--border-color)",
          background: "var(--color-bg-card)",
          position: "relative"
        }}>
          <button 
            onClick={handlePrev} 
            disabled={currentIndex >= records.length - 1}
            style={{ background: "none", border: "none", color: currentIndex >= records.length - 1 ? "var(--border-color)" : "var(--color-primary)", cursor: "pointer", padding: 8 }}
          >
            <ChevronLeft size={24} />
          </button>
          
          <div style={{ textAlign: "center" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>{record.date}</h2>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              {currentIndex === 0 ? "最新紀錄" : `歷史紀錄 (${currentIndex + 1}/${records.length})`}
            </div>
          </div>
          
          <button 
            onClick={handleNext} 
            disabled={currentIndex === 0}
            style={{ background: "none", border: "none", color: currentIndex === 0 ? "var(--border-color)" : "var(--color-primary)", cursor: "pointer", padding: 8 }}
          >
            <ChevronRight size={24} />
          </button>
          
          {/* Close button top right above header or inside */}
          <button onClick={onClose} style={{
            position: "absolute", top: -16, right: 16,
            background: "var(--color-bg-card)", border: "1px solid var(--border-color)",
            width: 36, height: 36, borderRadius: "50%",
            display: "flex", justifyContent: "center", alignItems: "center",
            boxShadow: "var(--neu-raised)", cursor: "pointer", zIndex: 10
          }}>
            <X size={18} color="var(--text-primary)" />
          </button>
        </div>

        {/* Scrollable Content — 移除 page-container 解決滾動不順 */}
        <div style={{ overflowY: "auto", flex: 1, padding: "var(--spacing-md)", paddingBottom: "80px", width: "100%" }}>
          
          {/* Score Card */}
          <div className="card" style={{
            background: `linear-gradient(135deg, ${scoreColor}15, ${scoreColor}05)`,
            border: `1px solid ${scoreColor}30`,
            textAlign: "center", padding: "var(--spacing-lg)", marginBottom: "var(--spacing-md)"
          }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 800, margin: 0, color: scoreColor }}>InBody 綜合評分</h3>
            <div style={{ fontSize: "3.5rem", fontWeight: 900, lineHeight: 1.2, color: "var(--text-primary)" }}>{record.score ?? "—"}</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--spacing-sm)", marginBottom: "var(--spacing-md)" }}>
            <div className="card-flat" style={{ textAlign: "center", padding: "var(--spacing-sm) 0" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>體重</div>
              <div style={{ fontSize: "1.2rem", fontWeight: 800 }}>{fv(record.weight, "kg")}</div>
            </div>
            <div className="card-flat" style={{ textAlign: "center", padding: "var(--spacing-sm) 0" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>體脂率</div>
              <div style={{ fontSize: "1.2rem", fontWeight: 800 }}>{fv(record.bodyFatPercent, "%")}</div>
            </div>
            <div className="card-flat" style={{ textAlign: "center", padding: "var(--spacing-sm) 0" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>BMI</div>
              <div style={{ fontSize: "1.2rem", fontWeight: 800 }}>{record.bmi ?? "—"}</div>
            </div>
          </div>

          {/* Muscle-Fat Chart */}
          <div className="card" style={{ marginBottom: "var(--spacing-md)" }}>
            <h3 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "var(--spacing-md)" }}>肌肉脂肪分析</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[
                { label: "體重", val: record.weight, low: 50, high: 90 },
                { label: "骨骼肌重", val: record.skeletalMuscleMass, low: 25, high: 40 },
                { label: "體脂肪重", val: record.bodyFatMass, low: 8, high: 20 },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "4px" }}>
                    <span style={{ fontWeight: 600 }}>{item.label}</span>
                    <span>{fv(item.val, "kg")}</span>
                  </div>
                  <div style={{ width: "100%", height: 8, background: "rgba(163, 177, 198, 0.2)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${barPercent(item.val, item.low, item.high)}%`,
                      background: "linear-gradient(90deg, var(--color-primary-light), var(--color-primary))",
                      borderRadius: 4
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {record.segmentalMuscle && <SegmentalDiagram data={record.segmentalMuscle} label="部位別肌肉分析" />}
          {record.segmentalFat && <SegmentalDiagram data={record.segmentalFat} label="部位別脂肪分析" />}
          
        </div>
      </div>
    </div>
  );
}
