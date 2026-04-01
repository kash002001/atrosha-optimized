"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useUser } from "../context/UserContext";

interface AgentInfo {
    id: string;
    name: string;
    dailyLimit: number;
    perTxLimit: number;
    active: boolean;
    rateLimit: number;
    todaySpent: number;
    todayTxCount: number;
}

interface AgentStatsPayload {
    totalTransactions: number;
    activeAgents: number;
    totalAgents: number;
    activeRules: number;
    pendingApprovals: number;
    totalSpendCents: number;
    deniedCents: number;
    agents: AgentInfo[];
    ts: number;
}

const POLL_INTERVAL = 30_000;

export default function DashboardAgentStats() {
    const { entityId } = useUser();
    const [stats, setStats] = useState<AgentStatsPayload | null>(null);
    const [err, setErr] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const timer = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchStats = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await fetch("/api/agent-stats", { cache: "no-store" });
            if (!res.ok) throw new Error(`${res.status}`);
            const data: AgentStatsPayload = await res.json();
            setStats(data);
            setErr(null);
        } catch (e: any) {
            setErr(e.message || "Failed to load");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
        timer.current = setInterval(() => fetchStats(true), POLL_INTERVAL);
        return () => { if (timer.current) clearInterval(timer.current); };
    }, [entityId, fetchStats]);

    // skeleton shimmer
    if (loading && !stats) return (
        <div className="chart-card" style={{
            padding: 20, marginBottom: 24, height: 88,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(90deg, rgba(59,130,246,0.03) 25%, rgba(139,92,246,0.06) 50%, rgba(59,130,246,0.03) 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
            border: '1px solid rgba(59,130,246,0.1)',
        }}>
            <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>Loading Agent Intelligence...</span>
        </div>
    );

    if (err) return (
        <div className="chart-card" style={{
            padding: 20, marginBottom: 24,
            border: '1px solid rgba(239,68,68,0.2)',
            background: 'rgba(239,68,68,0.04)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
            <span style={{ fontSize: 13, color: '#ef4444', fontWeight: 500 }}>
                ⚠ Failed to load agent stats
            </span>
            <button onClick={() => fetchStats()} style={{
                padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer',
            }}>Retry</button>
        </div>
    );

    if (!stats) return null;

    const topAgent = stats.agents.length
        ? stats.agents.reduce((a, b) => a.todaySpent > b.todaySpent ? a : b)
        : null;

    const totalDailyBudget = stats.agents.reduce((s, a) => s + a.dailyLimit, 0);
    const totalDailySpent = stats.agents.reduce((s, a) => s + a.todaySpent, 0);
    const burnPct = totalDailyBudget > 0 ? Math.min(100, (totalDailySpent / totalDailyBudget) * 100) : 0;

    const cells: { label: string; val: string | number; accent?: string; sub?: string }[] = [
        { label: "Transactions", val: stats.totalTransactions.toLocaleString() },
        { label: "Active Rules", val: stats.activeRules },
        { label: "Agents", val: `${stats.activeAgents} / ${stats.totalAgents}` },
        { label: "Pending", val: stats.pendingApprovals, accent: stats.pendingApprovals > 0 ? '#f59e0b' : undefined },
        { label: "Total Spend", val: `$${(stats.totalSpendCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
        { label: "Denied", val: `$${(stats.deniedCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, accent: '#ef4444' },
    ];

    return (
        <div className="chart-card" style={{
            padding: 20, marginBottom: 24,
            background: "linear-gradient(135deg, rgba(59,130,246,0.05), rgba(139,92,246,0.05))",
            border: "1px solid rgba(59,130,246,0.15)",
        }}>
            {/* top bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e", animation: "pulse-dot 2s infinite" }} />
                    <style>{`@keyframes pulse-dot { 0%,100% { opacity:1; } 50% { opacity:0.5; } }`}</style>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Sovereign Agent (Entity {entityId})</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>v3.0.0</span>
                </div>
                <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "monospace" }}>
                    updated {new Date(stats.ts).toLocaleTimeString()}
                </span>
            </div>

            {/* stat cells */}
            <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
                {cells.map(c => (
                    <div key={c.label} style={{ textAlign: "center", minWidth: 70 }}>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>{c.label}</div>
                        <div style={{ fontSize: 17, fontWeight: 700, color: c.accent || "var(--text)" }}>{c.val}</div>
                    </div>
                ))}
            </div>

            {/* budget burn bar */}
            {totalDailyBudget > 0 && (
                <div style={{ marginTop: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
                        <span>Daily Budget Burn</span>
                        <span>{burnPct.toFixed(1)}% — ${(totalDailySpent / 100).toLocaleString()} / ${(totalDailyBudget / 100).toLocaleString()}</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                        <div style={{
                            height: '100%', borderRadius: 2, transition: 'width 0.6s ease',
                            width: `${burnPct}%`,
                            background: burnPct > 80 ? '#ef4444' : burnPct > 50 ? '#f59e0b' : '#22c55e',
                        }} />
                    </div>
                    {topAgent && (
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                            Top spender: <strong style={{ color: 'var(--text)' }}>{topAgent.name}</strong> — ${(topAgent.todaySpent / 100).toLocaleString()} ({topAgent.todayTxCount} txns)
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
