"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className="card" style={{ 
          margin: "var(--spacing-md)", 
          padding: "var(--spacing-xl)", 
          textAlign: "center",
          border: "1px solid var(--color-danger)",
          background: "rgba(225, 112, 85, 0.05)"
        }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "var(--spacing-md)" }}>
            <AlertTriangle size={48} color="var(--color-danger)" />
          </div>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "var(--spacing-sm)", color: "var(--color-danger)" }}>
            哎呀！這個區塊發生了不可預期的錯誤
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "var(--spacing-lg)", lineHeight: 1.6 }}>
            我們無法正確顯示這部分的內容。可能是網路不穩定或資料格式有誤。<br/>
            <span style={{ fontSize: "0.75rem", fontFamily: "monospace", color: "var(--text-muted)" }}>{this.state.error?.message}</span>
          </p>
          <button 
            className="btn btn-secondary" 
            onClick={() => this.setState({ hasError: false })}
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            <RefreshCw size={16} />
            重新嘗試
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
