import React from "react";
import Image from "next/image";
import { SegmentalData } from "@/lib/types";

export function fv(v: number | null | undefined, unit: string): string {
  if (v === null || v === undefined) return "—";
  return `${v}${unit}`;
}

export function ratingColor(r: string): string {
  if (r === "高") return "var(--color-danger)";
  if (r === "低") return "#3b82f6";
  return "var(--color-success)";
}

export function heatColor(rating: string, opacity: number = 0.6): string {
  if (rating === "高") return `rgba(239, 68, 68, ${opacity})`;
  if (rating === "低") return `rgba(59, 130, 246, ${opacity})`;
  return `rgba(34, 197, 94, ${opacity})`;
}

export function barPercent(value: number | null, low: number, high: number): number {
  if (value === null) return 0;
  const range = high - low;
  return Math.min(100, Math.max(5, ((value - low + range * 0.3) / (range * 1.6)) * 100));
}

export function HeatmapBody({
  size = 170,
  filterId = "softHeatGlow",
  leftArmRating = "正常",
  rightArmRating = "正常",
  trunkRating = "正常",
  leftLegRating = "正常",
  rightLegRating = "正常",
}: {
  size?: number;
  filterId?: string;
  leftArmRating?: string;
  rightArmRating?: string;
  trunkRating?: string;
  leftLegRating?: string;
  rightLegRating?: string;
}) {
  return (
    <div style={{ position: "relative", width: size, height: size * 1.6, display: "flex", justifyContent: "center" }}>
      {/* 外部精美 AI 插圖 - 放大並下移，避免頭部被卡片遮擋 */}
      <div style={{ position: "relative", width: "100%", height: "100%", top: "40px" }}>
        <Image 
          src="/assets/inbody-body2.png" 
          alt="InBody Silhouette" 
          fill
          style={{ objectFit: "contain", opacity: 1 }}
          priority
        />
      </div>
      
      {/* 熱力疊加層 - 配合圖片下移與放大調整路徑與圓心 */}
      <svg 
        style={{ position: "absolute", top: "40px", left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 1 }} 
        viewBox="0 0 100 150"
      >
        <defs>
          <filter id={filterId}>
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        
        {/* 軀幹熱度 - 配合放大下移 */}
        <path d="M35 48 Q50 43 65 48 L60 88 Q50 91 40 88 Z" fill={heatColor(trunkRating, 0.4)} filter={`url(#${filterId})`} />
        
        {/* 手部與腿部熱度 (圓點式熱力) - 精確定位到放大後的手腕/腳踝區域 */}
        <circle cx="18" cy="75" r="10" fill={heatColor(leftArmRating, 0.4)} filter={`url(#${filterId})`} />
        <circle cx="82" cy="75" r="10" fill={heatColor(rightArmRating, 0.4)} filter={`url(#${filterId})`} />
        <circle cx="38" cy="125" r="13" fill={heatColor(leftLegRating, 0.4)} filter={`url(#${filterId})`} />
        <circle cx="62" cy="125" r="13" fill={heatColor(rightLegRating, 0.4)} filter={`url(#${filterId})`} />
      </svg>
    </div>
  );
}


export function FloatingCard({
  name, weight, percentage, rating, style,
}: {
  name: string;
  weight: number | null;
  percentage: number | null;
  rating: string;
  style?: React.CSSProperties;
}) {
  const rc = ratingColor(rating);
  return (
    <div style={{
      background: "var(--color-bg-card)",
      backdropFilter: "blur(16px)",
      WebkitBackdropFilter: "blur(16px)",
      borderRadius: "16px",
      border: `1.5px solid ${heatColor(rating, 0.2)}`,
      padding: "10px 8px",
      textAlign: "center",
      boxShadow: `0 8px 24px ${heatColor(rating, 0.12)}, var(--neu-flat)`,
      ...style,
    }}>
      <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: 4 }}>{name}</div>
      <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>{fv(weight, "kg")}</div>
      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 2 }}>{fv(percentage, "%")}</div>
      <div style={{
        display: "inline-block",
        marginTop: 6,
        fontSize: "0.65rem",
        fontWeight: 700,
        color: rc,
        background: heatColor(rating, 0.08),
        padding: "2px 10px",
        borderRadius: "12px",
      }}>
        {rating}
      </div>
    </div>
  );
}

export function SegmentalDiagram({ data, label }: { data: SegmentalData; label: string }) {
  const filterId = `heatGlow-${label.replace(/[^a-zA-Z0-9]/g, "-")}`;
  return (
    <div className="card" style={{ marginBottom: "var(--spacing-md)", overflow: "hidden", position: "relative", minHeight: "540px" }}>
      <div style={{ position: "absolute", inset: 0, opacity: 0.05, background: "radial-gradient(circle at 50% 30%, var(--color-primary), transparent 70%)" }} />
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--spacing-xl)" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>{label}</h3>
          <div style={{ display: "flex", gap: 10, fontSize: "0.65rem" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} /> 正常</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", display: "inline-block" }} /> 高</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "#3b82f6", display: "inline-block" }} /> 低</span>
          </div>
        </div>
        
        {/* 中央人體主視圖 */}
        <div style={{ position: "relative", height: "440px", display: "flex", justifyContent: "center", alignItems: "center" }}>
          
          {/* 人體圖片放在中央 */}
          <div style={{ position: "relative", top: "10px", zIndex: 0 }}>
            <HeatmapBody
              size={170}
              filterId={filterId}
              leftArmRating={data.leftArm.rating}
              rightArmRating={data.rightArm.rating}
              trunkRating={data.trunk.rating}
              leftLegRating={data.leftLeg.rating}
              rightLegRating={data.rightLeg.rating}
            />
          </div>

          {/* 軀幹卡片 - 頂部中央，稍微上移確保不擋住雕塑頭部 */}
          <div style={{ position: "absolute", top: "-15px", left: "50%", transform: "translateX(-50%)", width: "104px", zIndex: 2 }}>
            <FloatingCard name="軀幹" {...data.trunk} />
          </div>

          {/* 左右手卡片 - 配合人型下移與放大調整高度 */}
          <div style={{ position: "absolute", top: "130px", left: "-15px", width: "94px", zIndex: 2 }}>
            <FloatingCard name="左手" {...data.leftArm} />
          </div>
          <div style={{ position: "absolute", top: "130px", right: "-15px", width: "94px", zIndex: 2 }}>
            <FloatingCard name="右手" {...data.rightArm} />
          </div>

          {/* 左右腳卡片 - 底部兩側，上移避免貼齊卡片邊界 */}
          <div style={{ position: "absolute", bottom: "12px", left: "16px", width: "94px", zIndex: 2 }}>
            <FloatingCard name="左腳" {...data.leftLeg} />
          </div>
          <div style={{ position: "absolute", bottom: "12px", right: "16px", width: "94px", zIndex: 2 }}>
            <FloatingCard name="右腳" {...data.rightLeg} />
          </div>

        </div>
      </div>
    </div>
  );
}
