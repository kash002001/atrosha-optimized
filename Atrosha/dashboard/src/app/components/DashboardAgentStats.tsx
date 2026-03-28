"use client";

import { useEffect, useState } from "react";
import { useUser } from "../context/UserContext";
import { createClient } from "@/lib/supabase-client";

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
        const load = async () => {
            const supabase = createClient();
            const [txRes, agentRes, ruleRes] = await Promise.all([
                supabase.from('transactions').select('*', { count: 'exact', head: true }),
                supabase.from('agents').select('*', { count: 'exact', head: true }),
                supabase.from('rules').select('*', { count: 'exact', head: true }),
            ]);
            setStats({
                invoices: txRes.count ?? 0,
                executions: txRes.count ?? 0,
                vendors: agentRes.count ?? 0,
                anomalies: ruleRes.count ?? 0,
            });
        };
        load();
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
                        <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>Transactions</div>
                        <div style={{ fontSize: 18, fontWeight: 700 }}>{stats.invoices}</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>Active Rules</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: stats.anomalies > 0 ? "inherit" : "inherit" }}>{stats.anomalies}</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>Agents</div>
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
