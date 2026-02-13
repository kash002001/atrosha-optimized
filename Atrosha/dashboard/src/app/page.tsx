"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import {
  ArrowUpRight, ArrowDownRight, Calendar, ChevronDown, Download,
  MoreHorizontal, Plus, CreditCard, FileText
} from "lucide-react";

// Dynamic imports for charts
const VolumeChart = dynamic(() => import("./components/VolumeChart"), { ssr: false });
const Sparkline = dynamic(() => import("./components/Sparkline"), { ssr: false });

export default function Overview() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 40 }}>
      {/* Header with improved hierarchy */}
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>Overview</h2>
          <p style={{ fontSize: 14, color: "var(--text-muted)" }}>Financial performance for <span style={{ fontWeight: 600, color: "var(--text)" }}>Atrosha Corp</span>.</p>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button className="btn-secondary" style={{
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
            transition: "all 0.2s"
          }}>
            <Calendar size={14} /> Last 7 days <ChevronDown size={14} style={{ opacity: 0.5 }} />
          </button>
          <button className="btn-secondary" style={{
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
            transition: "all 0.2s"
          }}>
            <Download size={14} /> Export
          </button>

          {/* Quick Actions 3-Dot Menu */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 36, height: 36,
                background: "#fff",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                color: "var(--text-muted)",
                cursor: "pointer",
                boxShadow: "var(--shadow-soft)",
                transition: "all 0.2s"
              }}>
              <MoreHorizontal size={16} />
            </button>

            {menuOpen && (
              <div style={{
                position: "absolute", top: 40, right: 0,
                background: "#fff", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                minWidth: 160, zIndex: 10,
                overflow: "hidden",
                display: "flex", flexDirection: "column"
              }}>
                <button style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
                  background: "none", border: "none", width: "100%", textAlign: "left",
                  fontSize: 13, color: "var(--text)", cursor: "pointer",
                  borderBottom: "1px solid var(--border-hover)"
                }} onClick={() => setMenuOpen(false)}>
                  <Plus size={14} /> Create Rule
                </button>
                <button style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
                  background: "none", border: "none", width: "100%", textAlign: "left",
                  fontSize: 13, color: "var(--text)", cursor: "pointer"
                }} onClick={() => setMenuOpen(false)}>
                  <CreditCard size={14} /> View Payments
                </button>
                <button style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
                  background: "none", border: "none", width: "100%", textAlign: "left",
                  fontSize: 13, color: "var(--text)", cursor: "pointer"
                }} onClick={() => setMenuOpen(false)}>
                  <FileText size={14} /> Audit Log
                </button>
              </div>
            )}
            {menuOpen && (
              <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 5 }} onClick={() => setMenuOpen(false)} />
            )}
          </div>
        </div>
      </div>

      {/* Main Chart Moved to Top */}
      <div className="chart-card" style={{ padding: 24, minHeight: 400, marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Total Volume</h3>
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--primary)" }}></div>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Current period</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#E2E8F0" }}></div>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Previous period</span>
            </div>
          </div>
        </div>
        <div style={{ height: 320 }}>
          <VolumeChart />
        </div>
      </div>

      {/* Metric Cards Moved Below Graph */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div className="stat-card" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Total Transactions</span>
              <div className="stat-value" style={{ fontSize: 24, marginTop: 4 }}>2,845</div>
            </div>
            <span className="badge approved" style={{ background: "var(--green-bg)", color: "var(--green)", padding: "2px 8px", fontSize: 11, borderRadius: 12 }}>
              +12.5%
            </span>
          </div>
          <div style={{ marginTop: 8 }}>
            <Sparkline color="#059669" />
          </div>
        </div>

        <div className="stat-card" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Amount Saved</span>
              <div className="stat-value" style={{ fontSize: 24, marginTop: 4 }}>$48,120.00</div>
            </div>
            <span className="badge approved" style={{ background: "var(--green-bg)", color: "var(--green)", padding: "2px 8px", fontSize: 11, borderRadius: 12 }}>
              +8.2%
            </span>
          </div>
          <div style={{ marginTop: 8 }}>
            <Sparkline color="#0D9488" />
          </div>
        </div>

        <div className="stat-card" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Active Agents</span>
              <div className="stat-value" style={{ fontSize: 24, marginTop: 4 }}>12</div>
            </div>
            <span className="badge" style={{ background: "var(--bg-secondary)", color: "var(--text-muted)", padding: "2px 8px", fontSize: 11, borderRadius: 12 }}>
              0% change
            </span>
          </div>
          <div style={{ marginTop: 8 }}>
            <Sparkline color="#64748B" />
          </div>
        </div>
      </div>

      {/* Financial Reports Table */}
      <div className="chart-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-secondary)" }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-dim)" }}>Financial Reports</h3>
          <button style={{ fontSize: 12, color: "var(--primary)", background: "none", border: "none", fontWeight: 600, cursor: "pointer" }}>View all</button>
        </div>
        <table className="data-table">
          <tbody>
            {[
              { label: "Successful payments", val: "648", change: "+12%" },
              { label: "Failed payments", val: "53", change: "-4%" },
              { label: "Refunds", val: "12", change: "+2%" },
              { label: "Disputes", val: "2", change: "0%" },
            ].map((item, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 500 }}>{item.label}</td>
                <td style={{ textAlign: "right", fontWeight: 600 }}>{item.val}</td>
                <td style={{ textAlign: "right" }}>
                  <span style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: item.change.startsWith("+") ? "var(--green)" : item.change === "0%" ? "var(--text-muted)" : "var(--red)",
                    background: item.change.startsWith("+") ? "var(--green-bg)" : "transparent",
                    padding: "2px 6px",
                    borderRadius: 4
                  }}>
                    {item.change}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}