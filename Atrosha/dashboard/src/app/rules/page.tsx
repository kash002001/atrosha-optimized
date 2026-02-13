"use client";

import { useState, Fragment } from "react";
import { BookOpen, Plus, Trash2, ChevronRight, Sparkles, Code2 } from "lucide-react";

interface Rule {
    id: string;
    nl: string;
    compiled: string;
    agent: string;
    status: "active" | "draft" | "disabled";
    created: string;
}

const seed: Rule[] = [
    {
        id: "rl-001",
        nl: "Allow Stripe charges under $5,000 without approval",
        compiled: '{ "agent": "stripe", "action": "charge", "max_amount": 5000, "require_approval": false }',
        agent: "Stripe",
        status: "active",
        created: "Feb 10",
    },
    {
        id: "rl-002",
        nl: "Block all crypto transfers above $10,000",
        compiled: '{ "agent": "coinbase", "action": "transfer", "max_amount": 10000, "effect": "deny" }',
        agent: "Coinbase",
        status: "active",
        created: "Feb 9",
    },
    {
        id: "rl-003",
        nl: "Require supervisor signature for Wise transfers over $3,000",
        compiled: '{ "agent": "wise", "action": "transfer", "threshold": 3000, "require": "supervisor_sig" }',
        agent: "Wise",
        status: "active",
        created: "Feb 8",
    },
    {
        id: "rl-004",
        nl: "Limit OpenAI API spend to $500 per day",
        compiled: '{ "agent": "openai", "action": "*", "daily_limit": 500, "currency": "USD" }',
        agent: "OpenAI",
        status: "draft",
        created: "Feb 11",
    },
];

// fake compilation delay
function compileRule(nl: string): string {
    const lower = nl.toLowerCase();
    const agent = lower.includes("stripe") ? "stripe"
        : lower.includes("wise") ? "wise"
            : lower.includes("openai") ? "openai"
                : lower.includes("coinbase") ? "coinbase"
                    : lower.includes("aws") ? "aws"
                        : "unknown";

    const amountMatch = nl.match(/\$?([\d,]+)/);
    const amount = amountMatch ? parseInt(amountMatch[1].replace(",", "")) : 0;

    const isDeny = lower.includes("block") || lower.includes("deny") || lower.includes("reject");
    const needsApproval = lower.includes("require") || lower.includes("approval") || lower.includes("supervisor");

    return JSON.stringify({
        agent,
        action: "*",
        ...(amount > 0 && { threshold: amount }),
        effect: isDeny ? "deny" : "allow",
        ...(needsApproval && { require: "supervisor_sig" }),
    }, null, 2);
}

export default function Rules() {
    const [rules, setRules] = useState<Rule[]>(seed);
    const [input, setInput] = useState("");
    const [preview, setPreview] = useState<string | null>(null);
    const [compiling, setCompiling] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const handleCompile = () => {
        if (!input.trim()) return;
        setCompiling(true);
        setPreview(null);
        // simulate AI compilation
        setTimeout(() => {
            setPreview(compileRule(input));
            setCompiling(false);
        }, 800);
    };

    const handleAdd = () => {
        if (!preview || !input.trim()) return;
        const lower = input.toLowerCase();
        const agent = lower.includes("stripe") ? "Stripe"
            : lower.includes("wise") ? "Wise"
                : lower.includes("openai") ? "OpenAI"
                    : lower.includes("coinbase") ? "Coinbase"
                        : lower.includes("aws") ? "AWS"
                            : "Custom";

        const rule: Rule = {
            id: `rl-${String(rules.length + 1).padStart(3, "0")}`,
            nl: input,
            compiled: preview,
            agent,
            status: "active",
            created: "Just now",
        };
        setRules([rule, ...rules]);
        setInput("");
        setPreview(null);
    };

    const handleDelete = (id: string) => {
        setRules(rules.filter((r) => r.id !== id));
    };

    return (
        <>
            <div className="page-header">
                <h2>Rules</h2>
                <p>Define natural-language rules — they&apos;re compiled into enforceable agent policies automatically.</p>
            </div>

            {/* rule composer */}
            <div className="chart-card" style={{ marginBottom: 24 }}>
                <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Sparkles size={16} style={{ color: "var(--primary)" }} />
                    Rule Composer
                </h3>
                <div style={{ display: "flex", gap: 12, marginBottom: preview ? 16 : 0 }}>
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder='e.g. "Allow Stripe charges under $2,000 without supervisor approval"'
                        rows={2}
                        style={{
                            flex: 1,
                            padding: "12px 14px",
                            background: "var(--bg)",
                            border: "1px solid var(--border)",
                            borderRadius: "var(--radius-sm)",
                            color: "var(--text)",
                            fontSize: 13,
                            fontFamily: "var(--font)",
                            resize: "vertical",
                            outline: "none",
                            lineHeight: 1.5,
                        }}
                    />
                    <button
                        onClick={handleCompile}
                        disabled={!input.trim() || compiling}
                        style={{
                            padding: "0 20px",
                            background: compiling ? "var(--border)" : "var(--primary)",
                            color: "#fff",
                            border: "none",
                            borderRadius: "var(--radius-sm)",
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: input.trim() ? "pointer" : "not-allowed",
                            opacity: input.trim() ? 1 : 0.5,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            whiteSpace: "nowrap",
                        }}
                    >
                        <Code2 size={14} />
                        {compiling ? "Compiling..." : "Compile"}
                    </button>
                </div>

                {preview && (
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                        <pre
                            style={{
                                flex: 1,
                                background: "var(--bg)",
                                border: "1px solid var(--border)",
                                borderRadius: "var(--radius-sm)",
                                padding: "12px 14px",
                                fontSize: 12,
                                color: "var(--green)",
                                fontFamily: "'Geist Mono', monospace",
                                overflow: "auto",
                                margin: 0,
                            }}
                        >
                            {preview}
                        </pre>
                        <button
                            onClick={handleAdd}
                            style={{
                                padding: "10px 16px",
                                background: "var(--green)",
                                color: "#fff",
                                border: "none",
                                borderRadius: "var(--radius-sm)",
                                fontSize: 13,
                                fontWeight: 600,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                whiteSpace: "nowrap",
                            }}
                        >
                            <Plus size={14} /> Add Rule
                        </button>
                    </div>
                )}
            </div>

            {/* active rules */}
            <div className="table-section">
                <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <BookOpen size={16} /> Active Rules ({rules.length})
                </h3>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Natural Language Rule</th>
                            <th>Agent</th>
                            <th>Status</th>
                            <th>Created</th>
                            <th style={{ width: 80 }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rules.map((r) => (
                            <Fragment key={r.id}>
                                <tr style={{ cursor: "pointer" }} onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}>
                                    <td className="mono">{r.id}</td>
                                    <td>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                            <ChevronRight
                                                size={12}
                                                style={{
                                                    transform: expandedId === r.id ? "rotate(90deg)" : "none",
                                                    transition: "transform 0.15s",
                                                    color: "var(--text-dim)",
                                                    flexShrink: 0,
                                                }}
                                            />
                                            {r.nl}
                                        </div>
                                    </td>
                                    <td>{r.agent}</td>
                                    <td><span className={`badge ${r.status === "active" ? "approved" : r.status === "draft" ? "pending" : "shadow"}`}>{r.status}</span></td>
                                    <td style={{ color: "var(--text-muted)" }}>{r.created}</td>
                                    <td>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }}
                                            style={{
                                                background: "none",
                                                border: "none",
                                                color: "var(--text-dim)",
                                                cursor: "pointer",
                                                padding: 4,
                                            }}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </td>
                                </tr>
                                {expandedId === r.id && (
                                    <tr key={`${r.id}-compiled`}>
                                        <td colSpan={6} style={{ padding: 0 }}>
                                            <pre
                                                style={{
                                                    margin: 0,
                                                    padding: "12px 24px",
                                                    background: "var(--bg)",
                                                    fontSize: 11,
                                                    color: "var(--green)",
                                                    fontFamily: "'Geist Mono', monospace",
                                                    borderBottom: "1px solid var(--border)",
                                                }}
                                            >
                                                {r.compiled}
                                            </pre>
                                        </td>
                                    </tr>
                                )}
                            </Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}
