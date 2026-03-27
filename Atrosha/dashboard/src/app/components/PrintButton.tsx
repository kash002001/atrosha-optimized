"use client";

import { FileText } from "lucide-react";

export default function PrintButton() {
  return (
    <button onClick={() => window.print()} className="btn-secondary" style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "8px 14px",
      background: "#fff",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius-sm)",
      fontSize: 13,
      fontWeight: 500,
      color: "var(--text-muted)",
      cursor: "pointer",
      boxShadow: "var(--shadow-soft)",
    }}>
      <FileText size={14} /> Print Report
    </button>
  );
}
