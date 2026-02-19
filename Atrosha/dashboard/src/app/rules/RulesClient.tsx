"use client";

import { useState, Fragment } from "react";
import { BookOpen, Plus, Trash2, ChevronRight, Sparkles, Code2 } from "lucide-react";
import { addRule, deleteRule } from "./actions";

interface Rule {
    id: string;
    nl_text: string;
    compiled_policy: any;
    agent_id: string;
    status: string;
    created_at: string;
    agent?: { name: string }; // Joined
}

interface RulesClientProps {
    rules: Rule[];
}

// Simple client-side compiler mock (same as before, but mapped to schema)
function compileRule(nl: string): string {
    const lower = nl.toLowerCase();
    const agent = lower.includes("stripe") ? "Stripe"
        : lower.includes("wise") ? "Wise"
            : lower.includes("openai") ? "OpenAI"
                : lower.includes("coinbase") ? "Coinbase"
                    : lower.includes("aws") ? "AWS"
                        : "Global";

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

export default function RulesClient({ rules }: RulesClientProps) {
    const [input, setInput] = useState("");
    const [preview, setPreview] = useState<string | null>(null);
    const [compiling, setCompiling] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const handleCompile = () => {
        if (!input.trim()) return;
        setCompiling(true);
        setPreview(null);
        setTimeout(() => {
            setPreview(compileRule(input));
            setCompiling(false);
        }, 800);
    };

    const handleAdd = async () => {
        if (!preview || !input.trim()) return;
        setSaving(true);

        try {
            // Parse agent from preview
            const parsed = JSON.parse(preview);
            await addRule(input, preview, parsed.agent);
            setInput("");
            setPreview(null);
        } catch (e) {
            alert("Failed to add rule: " + e);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this rule?")) return;
        try {
            await deleteRule(id);
        } catch (e) {
            alert("Failed to delete rule");
        }
    };

    return (
        <>
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
                        }}
                    />
                    <button
                        onClick={handleCompile}
                        disabled={!input.trim() || compiling || saving}
                        className="btn-primary"
                        style={{
                            padding: "0 20px",
                            background: compiling ? "var(--border)" : "var(--primary)",
                            color: "#fff",
                            border: "none",
                            borderRadius: "var(--radius-sm)",
                            cursor: input.trim() ? "pointer" : "not-allowed",
                        }}
                    >
                        <Code2 size={14} style={{ marginRight: 6 }} />
                        {compiling ? "Compiling..." : "Compile"}
                    </button>
                </div>

                {preview && (
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                        <pre style={{
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
                            disabled={saving}
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
                            }}
                        >
                            <Plus size={14} />
                            {saving ? "Saving..." : "Add Rule"}
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
                                    <td className="mono" style={{ fontSize: 11 }}>{r.id.substring(0, 8)}...</td>
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
                                            {r.nl_text}
                                        </div>
                                    </td>
                                    <td>{r.agent?.name || "Global"}</td>
                                    <td><span className={`badge ${r.status === "active" ? "approved" : "pending"}`}>{r.status}</span></td>
                                    <td style={{ color: "var(--text-muted)" }}>{new Date(r.created_at).toLocaleDateString()}</td>
                                    <td>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }}
                                            className="icon-btn"
                                            style={{ color: "var(--red)" }}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </td>
                                </tr>
                                {expandedId === r.id && (
                                    <tr key={`${r.id}-compiled`}>
                                        <td colSpan={6} style={{ padding: 0 }}>
                                            <pre style={{
                                                margin: 0,
                                                padding: "12px 24px",
                                                background: "var(--bg)",
                                                fontSize: 11,
                                                color: "var(--green)",
                                                fontFamily: "'Geist Mono', monospace",
                                                borderBottom: "1px solid var(--border)",
                                            }}
                                            >
                                                {JSON.stringify(r.compiled_policy, null, 2)}
                                            </pre>
                                        </td>
                                    </tr>
                                )}
                            </Fragment>
                        ))}
                    </tbody>
                </table>
                {rules.length === 0 && (
                    <div style={{ padding: 40, textAlign: "center", color: "var(--text-dim)", fontSize: 13 }}>
                        No rules active. Create one above!
                    </div>
                )}
            </div>
        </>
    );
}
