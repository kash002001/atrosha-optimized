"use client";

import { useState, useEffect } from "react";
import { Search, Filter, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase-client";

export interface Tx {
    id: string;
    agent_id: string;
    amount: number;
    destination: string;
    status: string;
    created_at: string;
    currency: string;
    sim_score?: number;
    latency_ms?: number;
    denial_reason?: string;
}

export default function TransactionsClient({ initialData }: { initialData: Tx[] }) {
    const [transactions, setTransactions] = useState<Tx[]>(initialData);
    const [filter, setFilter] = useState<string>("all");
    const [search, setSearch] = useState("");
    const [connected, setConnected] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const supabase = createClient();

        const channel = supabase.channel('realtime:transactions')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'transactions' },
                (payload) => {
                    setTransactions(prev => [payload.new as Tx, ...prev]);
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'transactions' },
                (payload) => {
                    setTransactions(prev => prev.map(tx => tx.id === payload.new.id ? payload.new as Tx : tx));
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    setConnected(true);
                } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                    setConnected(false);
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const filtered = (transactions || []).filter((tx) => {
        if (filter !== "all" && tx.status !== filter) return false;

        const searchLower = search.toLowerCase();
        const agent = String(tx.agent_id || "").toLowerCase();
        const target = String(tx.destination || "").toLowerCase();
        const id = String(tx.id || "").toLowerCase();

        if (search && !agent.includes(searchLower) && !id.includes(searchLower) && !target.includes(searchLower)) return false;
        return true;
    });

    return (
        <>
            <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center" }}>
                <div style={{ position: "relative", flex: 1 }}>
                    <Search size={14} style={{ position: "absolute", left: 12, top: 11, color: "var(--text-dim)" }} />
                    <input
                        type="text"
                        placeholder="Search by agent, ID, or target..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{
                            width: "100%",
                            padding: "10px 12px 10px 32px",
                            background: "var(--bg-card)",
                            border: "1px solid var(--border)",
                            borderRadius: "var(--radius-sm)",
                            color: "var(--text)",
                            fontSize: 13,
                            outline: "none",
                        }}
                    />
                </div>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <Filter size={14} style={{ color: "var(--text-dim)", marginRight: 4 }} />
                    {["all", "approved", "denied", "pending"].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            style={{
                                padding: "6px 12px",
                                borderRadius: "var(--radius-sm)",
                                border: filter === f ? "1px solid var(--primary)" : "1px solid var(--border)",
                                background: filter === f ? "var(--primary-glow)" : "var(--bg-card)",
                                color: filter === f ? "var(--primary-hover)" : "var(--text-muted)",
                                fontSize: 12,
                                fontWeight: 500,
                                cursor: "pointer",
                                textTransform: "capitalize",
                            }}
                        >
                            {f}
                        </button>
                    ))}
                    <div style={{ marginLeft: 8 }} title={connected ? "Live Updates Active" : "Connecting..."}>
                        {connected ? (
                            <div style={{ width: 8, height: 8, background: "var(--green)", borderRadius: "50%", boxShadow: "0 0 8px var(--green)" }} />
                        ) : (
                            <Loader2 size={14} className="animate-spin" style={{ color: "var(--text-muted)" }} />
                        )}
                    </div>
                </div>
            </div>

            <div className="table-section">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Agent</th>
                            <th>Amount</th>
                            <th>Target</th>
                            <th>ML Verdict</th>
                            <th>Status</th>
                            <th>Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((tx) => (
                            <tr key={tx.id}>
                                <td className="mono" style={{ fontSize: 11 }}>{String(tx.id).substring(0, 8)}...</td>
                                <td>{tx.agent_id}</td>
                                <td style={{ fontWeight: 600 }}>
                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: tx.currency || 'USD' }).format((tx.amount || 0) / 100)}
                                </td>
                                <td className="mono" style={{ color: "var(--text-muted)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {tx.destination || "N/A"}
                                </td>
                                <td>
                                    {tx.sim_score ? (
                                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                {tx.denial_reason === 'semantic firewall DENIED request' ? (
                                                    <span style={{ color: "var(--red)", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                                                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--red)", boxShadow: "0 0 4px var(--red)" }}></div>
                                                        Blocked Check
                                                    </span>
                                                ) : (
                                                    <span style={{ color: "var(--green)", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                                                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", boxShadow: "0 0 4px var(--green)" }}></div>
                                                        Safe
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "monospace" }}>
                                                conf: {(tx.sim_score * 100).toFixed(1)}% {tx.latency_ms && `• ${tx.latency_ms.toFixed(1)}ms`}
                                            </div>
                                        </div>
                                    ) : (
                                        <span style={{ color: "var(--text-dim)", fontSize: 11, fontStyle: "italic" }}>
                                            N/A
                                        </span>
                                    )}
                                </td>
                                <td>
                                    <span className={`badge`} style={{
                                        color: tx.status === 'approved' ? 'var(--green)' : 'var(--red)',
                                        background: tx.status === 'approved' ? 'var(--green-bg)' : 'var(--red-bg)',
                                        padding: '2px 8px', borderRadius: 4, fontSize: 12, textTransform: 'capitalize'
                                    }}>
                                        {tx.status || 'unknown'}
                                    </span>
                                </td>
                                <td style={{ color: "var(--text-muted)", fontSize: 12 }}>
                                    {mounted && tx.created_at ? new Date(tx.created_at).toLocaleString() : ''}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filtered.length === 0 && (
                    <div style={{ padding: 40, textAlign: "center", color: "var(--text-dim)", fontSize: 13 }}>
                        No transactions found.
                    </div>
                )}
            </div>
        </>
    );
}
