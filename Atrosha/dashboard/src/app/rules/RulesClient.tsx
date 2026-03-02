"use client";

import { useState, Fragment, useTransition } from "react";
import { BookOpen, Plus, Trash2, ChevronRight, Sparkles, Code2, Play, ToggleLeft, ToggleRight } from "lucide-react";
import { addRule, deleteRule, toggleRule } from "./actions";
import TestPanel from "./TestPanel";

interface Rule {
    id: string;
    nl_text: string;
    compiled_policy: any;
    agent_id: string;
    status: string;
    created_at: string;
    agent?: { name: string };
}

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

function ToggleBtn({ id, status }: { id: string; status: string }) {
    const [localStatus, setLocalStatus] = useState(status);
    const [isPending, startTransition] = useTransition();
    const isActive = localStatus === "active";

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        startTransition(async () => {
            await toggleRule(id, localStatus);
            setLocalStatus(isActive ? "disabled" : "active");
        });
    };

    return (
        <button
            onClick={handleToggle}
            disabled={isPending}
            title={isActive ? "Disable rule" : "Enable rule"}
            style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "3px 8px", borderRadius: 4,
                border: `1px solid ${isActive ? "rgba(34,197,94,0.3)" : "var(--border)"}`,
                background: isActive ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.04)",
                color: isActive ? "var(--green)" : "var(--text-dim)",
                fontSize: 11, fontWeight: 600, cursor: "pointer",
                transition: "all 0.15s ease",
                opacity: isPending ? 0.5 : 1,
            }}
        >
            {isActive
                ? <ToggleRight size={13} />
                : <ToggleLeft size={13} />
            }
            {isActive ? "Active" : "Off"}
        </button>
    );
}

export default function RulesClient({ rules: initialRules }: { rules: Rule[] }) {
    const [rules] = useState(initialRules);
    const [input, setInput] = useState("");
    const [preview, setPreview] = useState<string | null>(null);
    const [compiling, setCompiling] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [testingRule, setTestingRule] = useState<Rule | null>(null);

    const handleCompile = () => {
        if (!input.trim()) return;
        setCompiling(true);
        setPreview(null);
        setTimeout(() => { setPreview(compileRule(input)); setCompiling(false); }, 800);
    };

    const handleAdd = async () => {
        if (!preview || !input.trim()) return;
        setSaving(true);
        try {
            const parsed = JSON.parse(preview);
            await addRule(input, preview, parsed.agent);
            setInput(""); setPreview(null);
        } catch (e) { alert("Failed to add rule: " + e); }
        finally { setSaving(false); }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm("Delete this rule?")) return;
        try { await deleteRule(id); }
        catch { alert("Failed to delete rule"); }
    };

    return (
        <>
            {/* rule composer */}
            <div className="chart-card" style={{ marginBottom: 24 }}>
                <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Sparkles size={16} style={{ color: "var(--primary)" }} />
                    Rule Composer
                </h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: preview ? 16 : 0 }}>
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder='e.g. "Block all transactions over $10,000 to unknown domains"'
                        rows={2}
                        style={{
                            flex: 1, padding: "12px 14px",
                            background: "var(--bg)", border: "1px solid var(--border)",
                            borderRadius: "var(--radius-sm)", color: "var(--text)", fontSize: 13,
                        }}
                    />
                    <button
                        onClick={handleCompile}
                        disabled={!input.trim() || compiling || saving}
                        className="btn-primary"
                        style={{
                            padding: "0 20px",
                            background: compiling ? "var(--border)" : "var(--primary)",
                            color: "#fff", border: "none",
                            borderRadius: "var(--radius-sm)",
                            cursor: input.trim() ? "pointer" : "not-allowed",
                            display: "flex", alignItems: "center", gap: 6,
                        }}
                    >
                        <Code2 size={14} />
                        {compiling ? "Compiling..." : "Compile"}
                    </button>
                </div>

                {preview && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
                        <pre style={{
                            flex: 1, background: "var(--bg)", border: "1px solid var(--border)",
                            borderRadius: "var(--radius-sm)", padding: "12px 14px",
                            fontSize: 12, color: "var(--green)",
                            fontFamily: "'Geist Mono', monospace", overflow: "auto", margin: 0,
                        }}>
                            {preview}
                        </pre>
                        <button
                            onClick={handleAdd}
                            disabled={saving}
                            style={{
                                padding: "10px 16px", background: "var(--green)",
                                color: "#fff", border: "none",
                                borderRadius: "var(--radius-sm)",
                                fontSize: 13, fontWeight: 600, cursor: "pointer",
                                display: "flex", alignItems: "center", gap: 6,
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
                            <th style={{ width: 100 }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rules.map((r) => (
                            <Fragment key={r.id}>
                                <tr
                                    style={{ cursor: "pointer", transition: "background 0.12s ease" }}
                                    onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                                    onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                                    onMouseOut={(e) => e.currentTarget.style.background = ""}
                                >
                                    <td className="mono" style={{ fontSize: 11 }}>{r.id.substring(0, 8)}...</td>
                                    <td>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                            <ChevronRight
                                                size={12}
                                                style={{
                                                    transform: expandedId === r.id ? "rotate(90deg)" : "none",
                                                    transition: "transform 0.15s",
                                                    color: "var(--text-dim)", flexShrink: 0,
                                                }}
                                            />
                                            {r.nl_text}
                                        </div>
                                    </td>
                                    <td>{r.agent?.name || "Global"}</td>
                                    <td><ToggleBtn id={r.id} status={r.status} /></td>
                                    <td style={{ color: "var(--text-muted)" }}>
                                        {new Date(r.created_at).toLocaleDateString()}
                                    </td>
                                    <td>
                                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setTestingRule(r); }}
                                                className="icon-btn"
                                                title="Test this rule"
                                                style={{ color: "var(--primary)" }}
                                            >
                                                <Play size={14} />
                                            </button>
                                            <button
                                                onClick={(e) => handleDelete(e, r.id)}
                                                className="icon-btn"
                                                title="Delete rule"
                                                style={{ color: "var(--red)" }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                {expandedId === r.id && (
                                    <tr key={`${r.id}-compiled`}>
                                        <td colSpan={6} style={{ padding: 0 }}>
                                            <pre style={{
                                                margin: 0, padding: "12px 24px",
                                                background: "var(--bg)", fontSize: 11,
                                                color: "var(--green)",
                                                fontFamily: "'Geist Mono', monospace",
                                                borderBottom: "1px solid var(--border)",
                                            }}>
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
                        No rules active. Create one above.
                    </div>
                )}
            </div>

            {/* test panel */}
            {testingRule && (
                <TestPanel
                    ruleId={testingRule.id}
                    ruleText={testingRule.nl_text}
                    onClose={() => setTestingRule(null)}
                />
            )}
        </>
    );
}
