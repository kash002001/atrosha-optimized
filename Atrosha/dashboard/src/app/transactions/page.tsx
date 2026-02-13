"use client";

import { useState } from "react";
import { Search, Filter } from "lucide-react";

type Decision = "approved" | "denied" | "pending" | "shadow";

interface Tx {
    id: string;
    agent: string;
    amount: string;
    target: string;
    decision: Decision;
    time: string;
    permit: string;
    latency: string;
}

const txs: Tx[] = [
    { id: "tx-a91f3c", agent: "Stripe", amount: "$2,450.00", target: "stripe.com/v1/charges", decision: "approved", time: "Feb 12 11:23", permit: "pmt-8a2f", latency: "18ms" },
    { id: "tx-b73c01", agent: "Wise", amount: "$12,000.00", target: "wise.com/v3/transfers", decision: "denied", time: "Feb 12 11:18", permit: "pmt-9b3e", latency: "22ms" },
    { id: "tx-c55e72", agent: "OpenAI", amount: "$180.00", target: "api.openai.com/v1/completions", decision: "approved", time: "Feb 12 11:15", permit: "pmt-7c1d", latency: "15ms" },
    { id: "tx-d12a44", agent: "Coinbase", amount: "$7,200.00", target: "crypto://eth/transfer", decision: "pending", time: "Feb 12 11:11", permit: "pmt-6d0c", latency: "45ms" },
    { id: "tx-e88b19", agent: "AWS", amount: "$950.00", target: "aws.amazon.com/billing", decision: "approved", time: "Feb 12 11:08", permit: "pmt-5e9b", latency: "12ms" },
    { id: "tx-f22d85", agent: "Stripe", amount: "$3,100.00", target: "stripe.com/v1/transfers", decision: "approved", time: "Feb 12 10:55", permit: "pmt-4f8a", latency: "19ms" },
    { id: "tx-g44a33", agent: "Plaid", amount: "$500.00", target: "plaid.com/auth/get", decision: "shadow", time: "Feb 12 10:42", permit: "pmt-3g7z", latency: "31ms" },
    { id: "tx-h66c77", agent: "Anthropic", amount: "$89.99", target: "api.anthropic.com/v1/messages", decision: "approved", time: "Feb 12 10:30", permit: "pmt-2h6y", latency: "14ms" },
];

export default function Transactions() {
    const [filter, setFilter] = useState<Decision | "all">("all");
    const [search, setSearch] = useState("");

    const filtered = txs.filter((tx) => {
        if (filter !== "all" && tx.decision !== filter) return false;
        if (search && !tx.agent.toLowerCase().includes(search.toLowerCase()) && !tx.id.includes(search) && !tx.target.includes(search)) return false;
        return true;
    });

    return (
        <>
            <div className="page-header">
                <h2>Transactions</h2>
                <p>Full audit log of all proxied financial operations.</p>
            </div>

            <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
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
                    {(["all", "approved", "denied", "pending", "shadow"] as const).map((f) => (
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
                            <th>Decision</th>
                            <th>Permit</th>
                            <th>Latency</th>
                            <th>Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((tx) => (
                            <tr key={tx.id}>
                                <td className="mono">{tx.id}</td>
                                <td>{tx.agent}</td>
                                <td style={{ fontWeight: 600 }}>{tx.amount}</td>
                                <td className="mono" style={{ color: "var(--text-muted)" }}>{tx.target}</td>
                                <td><span className={`badge ${tx.decision}`}>{tx.decision}</span></td>
                                <td className="mono" style={{ color: "var(--text-muted)" }}>{tx.permit}</td>
                                <td className="mono">{tx.latency}</td>
                                <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{tx.time}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filtered.length === 0 && (
                    <div style={{ padding: 40, textAlign: "center", color: "var(--text-dim)", fontSize: 13 }}>
                        No transactions match your filters.
                    </div>
                )}
            </div>
        </>
    );
}
