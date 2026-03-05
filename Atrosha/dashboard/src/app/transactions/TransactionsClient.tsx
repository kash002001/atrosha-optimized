"use client";

import { useState, useEffect } from "react";
import { Search, Filter, Loader2, Download, Shield, Brain, X } from "lucide-react";
import { createClient } from "@/lib/supabase-client";

export interface Tx {
    id: string;
    agent_id: string;
    amount: number;
    destination: string;
    status: string;
    created_at: string;
    currency: string;
    verdict_confidence?: number;
    verdict_source?: string;
    verdict_reason?: string;
    payload_preview?: string;
}

function SourceBadge({ source }: { source?: string }) {
    if (!source) return <span style={{ color: "var(--text-dim)", fontSize: 11 }}>—</span>;

    const isHeuristic = source === "heuristic";
    return (
        <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600,
            color: isHeuristic ? "#f59e0b" : "#8b5cf6",
            background: isHeuristic ? "rgba(245,158,11,0.1)" : "rgba(139,92,246,0.1)",
            border: `1px solid ${isHeuristic ? "rgba(245,158,11,0.25)" : "rgba(139,92,246,0.25)"}`,
        }}>
            {isHeuristic ? <Shield size={10} /> : <Brain size={10} />}
            {isHeuristic ? "Heuristic" : "Semantic V3"}
        </span>
    );
}

function ConfidenceBar({ value }: { value?: number }) {
    if (value == null) return <span style={{ color: "var(--text-dim)", fontSize: 11 }}>—</span>;
    const pct = Math.round(value * 100);
    const color = pct >= 90 ? "var(--green)" : pct >= 60 ? "#f59e0b" : "var(--red)";
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
                width: 48, height: 5, borderRadius: 3,
                background: "rgba(255,255,255,0.06)",
                overflow: "hidden",
            }}>
                <div style={{
                    width: `${pct}%`, height: "100%",
                    background: color, borderRadius: 3,
                    transition: "width 0.4s ease",
                }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color, fontFamily: "var(--font-mono, monospace)" }}>
                {pct}%
            </span>
        </div>
    );
}

function DetailPanel({ tx, onClose }: { tx: Tx; onClose: () => void }) {
    return (
        <div style={{
            position: "fixed", top: 0, right: 0, bottom: 0, width: 420,
            background: "var(--bg-card)", borderLeft: "1px solid var(--border)",
            zIndex: 100, padding: 24, overflowY: "auto",
            boxShadow: "-8px 0 32px rgba(0,0,0,0.3)",
            animation: "slideIn 0.2s ease-out",
        }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600 }}>Verdict Detail</h3>
                <button onClick={onClose} style={{
                    background: "none", border: "none", color: "var(--text-muted)",
                    cursor: "pointer", padding: 4,
                }}>
                    <X size={18} />
                </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <Field label="Transaction ID" value={tx.id} mono />
                <Field label="Agent" value={tx.agent_id} mono />
                <Field label="Target" value={tx.destination || "N/A"} mono />
                <Field label="Status" value={tx.status} />
                <Field label="Source">
                    <SourceBadge source={tx.verdict_source} />
                </Field>
                <Field label="Confidence">
                    <ConfidenceBar value={tx.verdict_confidence} />
                </Field>
                <Field label="Reason" value={tx.verdict_reason || "—"} />
                {tx.payload_preview && (
                    <div>
                        <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>
                            Payload Preview
                        </div>
                        <pre style={{
                            background: "rgba(0,0,0,0.3)", padding: 12, borderRadius: 6,
                            fontSize: 11, color: "var(--text-muted)", whiteSpace: "pre-wrap",
                            wordBreak: "break-all", maxHeight: 200, overflowY: "auto",
                            border: "1px solid var(--border)",
                        }}>
                            {tx.payload_preview}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
}

function Field({ label, value, mono, children }: { label: string; value?: string; mono?: boolean; children?: React.ReactNode }) {
    return (
        <div>
            <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 2, textTransform: "uppercase", letterSpacing: 1 }}>
                {label}
            </div>
            {children || (
                <div style={{
                    fontSize: 13, color: "var(--text)",
                    fontFamily: mono ? "var(--font-mono, monospace)" : "inherit",
                    wordBreak: "break-all",
                }}>
                    {value}
                </div>
            )}
        </div>
    );
}

export default function TransactionsClient({ initialData }: { initialData: Tx[] }) {
    const [transactions, setTransactions] = useState<Tx[]>(initialData);
    const [filter, setFilter] = useState<string>("all");
    const [search, setSearch] = useState("");
    const [connected, setConnected] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [selectedTx, setSelectedTx] = useState<Tx | null>(null);

    useEffect(() => {
        // use setImmediate or microtask to avoid synchronicity warning
        Promise.resolve().then(() => setMounted(true));
    }, []);

    useEffect(() => {
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
        const source = String(tx.verdict_source || "").toLowerCase();

        if (search && !agent.includes(searchLower) && !id.includes(searchLower)
            && !target.includes(searchLower) && !source.includes(searchLower)) return false;
        return true;
    });

    const handleExportCSV = () => {
        if (filtered.length === 0) return;

        const headers = ["ID", "Agent", "Amount", "Currency", "Target", "Status", "Source", "Confidence", "Reason", "Time"];
        const csvRows = [headers.join(",")];

        filtered.forEach(tx => {
            const row = [
                tx.id,
                tx.agent_id,
                (tx.amount || 0) / 100,
                tx.currency || "USD",
                `"${(tx.destination || "").replace(/"/g, '""')}"`,
                tx.status,
                tx.verdict_source || "",
                tx.verdict_confidence ?? "",
                `"${(tx.verdict_reason || "").replace(/"/g, '""')}"`,
                new Date(tx.created_at).toISOString()
            ];
            csvRows.push(row.join(","));
        });

        const csvString = csvRows.join("\n");
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `atrosha_transactions_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // quick stats
    const totalBlocked = transactions.filter(t => t.status === "denied").length;
    const heuristicBlocks = transactions.filter(t => t.verdict_source === "heuristic").length;
    const semanticBlocks = transactions.filter(t => t.verdict_source === "semantic_v3" && t.status === "denied").length;

    return (
        <>
            {/* stat cards row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
                <div style={{
                    background: "var(--bg-card)", border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)", padding: "14px 16px",
                }}>
                    <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: 1 }}>Total Blocked</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "var(--red)", marginTop: 4 }}>{totalBlocked}</div>
                </div>
                <div style={{
                    background: "var(--bg-card)", border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)", padding: "14px 16px",
                }}>
                    <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: 1 }}>Heuristic Blocks</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "#f59e0b", marginTop: 4 }}>{heuristicBlocks}</div>
                </div>
                <div style={{
                    background: "var(--bg-card)", border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)", padding: "14px 16px",
                }}>
                    <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: 1 }}>Semantic V3 Blocks</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "#8b5cf6", marginTop: 4 }}>{semanticBlocks}</div>
                </div>
            </div>

            {/* search + filters */}
            <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center" }}>
                <div style={{ position: "relative", flex: 1 }}>
                    <Search size={14} style={{ position: "absolute", left: 12, top: 11, color: "var(--text-dim)" }} />
                    <input
                        type="text"
                        placeholder="Search by agent, ID, target, or source..."
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

                    <button
                        onClick={handleExportCSV}
                        style={{
                            display: "flex", alignItems: "center", gap: 6,
                            marginLeft: 8,
                            padding: "6px 12px",
                            borderRadius: "var(--radius-sm)",
                            border: "1px solid var(--border)",
                            background: "var(--bg-card)",
                            color: "var(--text-muted)",
                            fontSize: 12,
                            fontWeight: 500,
                            cursor: "pointer",
                            transition: "all 0.2s ease"
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.color = "var(--text)";
                            e.currentTarget.style.borderColor = "var(--text-dim)";
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.color = "var(--text-muted)";
                            e.currentTarget.style.borderColor = "var(--border)";
                        }}
                    >
                        <Download size={14} /> Export CSV
                    </button>

                    <div style={{ marginLeft: 16 }} title={connected ? "Live Updates Active" : "Connecting..."}>
                        {connected ? (
                            <div style={{ width: 8, height: 8, background: "var(--green)", borderRadius: "50%", boxShadow: "0 0 8px var(--green)" }} />
                        ) : (
                            <Loader2 size={14} className="animate-spin" style={{ color: "var(--text-muted)" }} />
                        )}
                    </div>
                </div>
            </div>

            {/* data table */}
            <div className="table-section">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Agent</th>
                            <th>Target</th>
                            <th>Status</th>
                            <th>Source</th>
                            <th>Confidence</th>
                            <th>Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((tx) => (
                            <tr
                                key={tx.id}
                                onClick={() => setSelectedTx(tx)}
                                style={{ cursor: "pointer", transition: "background 0.15s ease" }}
                                onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                                onMouseOut={(e) => e.currentTarget.style.background = ""}
                            >
                                <td className="mono" style={{ fontSize: 11 }}>{String(tx.id).substring(0, 8)}...</td>
                                <td style={{ fontSize: 12 }}>{tx.agent_id ? String(tx.agent_id).substring(0, 8) + "..." : "—"}</td>
                                <td className="mono" style={{ color: "var(--text-muted)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12 }}>
                                    {tx.destination || "N/A"}
                                </td>
                                <td>
                                    <span style={{
                                        color: tx.status === 'approved' ? 'var(--green)' : 'var(--red)',
                                        background: tx.status === 'approved' ? 'var(--green-bg)' : 'var(--red-bg)',
                                        padding: '2px 8px', borderRadius: 4, fontSize: 12, textTransform: 'capitalize'
                                    }}>
                                        {tx.status || 'unknown'}
                                    </span>
                                </td>
                                <td><SourceBadge source={tx.verdict_source} /></td>
                                <td><ConfidenceBar value={tx.verdict_confidence} /></td>
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

            {/* detail side-panel */}
            {selectedTx && <DetailPanel tx={selectedTx} onClose={() => setSelectedTx(null)} />}
        </>
    );
}
