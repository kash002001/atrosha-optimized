"use client";

import { useEffect, useState } from "react";
import { useUser } from "../context/UserContext";
import { atroshaFetch } from "@/lib/api-client";

interface Stats {
    invoices: number;
    executions: number;
    vendors: number;
    anomalies: number;
}

export default function DashboardAgentStats() {
    const { entityId, role } = useUser();
    const [stats, setStats] = useState<Stats | null>(null);

    useEffect(() => {
        atroshaFetch("/stats")
            .then(setStats)
            .catch(console.error);
    }, [entityId, role]);

    if (!stats) return (
        <div className="chart-card" style={{ padding: 20, marginBottom: 24, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
            Loading Agent Intelligence...
        </div>
    );

    return (
        <div className="chart-card" style={{ padding: 20, marginBottom: 24, background: "linear-gradient(135deg, rgba(59,130,246,0.05), rgba(139,92,246,0.05))", border: "1px solid rgba(59,130,246,0.15)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e" }} />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Sovereign Agent (Entity {entityId})</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>v1.2.0</span>
                </div>
                <div style={{ display: "flex", gap: 32 }}>
                    <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>Invoices</div>
                        <div style={{ fontSize: 18, fontWeight: 700 }}>{stats.invoices}</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>Anomalies</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: stats.anomalies > 0 ? "#ef4444" : "inherit" }}>{stats.anomalies}</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>Vendors</div>
                        <div style={{ fontSize: 18, fontWeight: 700 }}>{stats.vendors}</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>Executions</div>
                        <div style={{ fontSize: 18, fontWeight: 700 }}>{stats.executions}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
