'use client';

import { Shield, Hammer, ToggleLeft, Trash2, Cpu, FileJson } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useUser } from "../context/UserContext";
import { createClient } from "@/lib/supabase-client";
import { addRule, deleteRule, toggleRule } from "./actions";

// L1: proper types instead of any
interface CompiledPolicy {
    type: string;
    conditions: string[];
}

interface Rule {
    id: string;
    nl_text: string;
    compiled_policy: CompiledPolicy | Record<string, unknown>;
    agent_id?: string;
    status: string;
    created_at: string;
}

export default function RulesClient() {
    const { entityId, role } = useUser();
    const [rules, setRules] = useState<Rule[]>([]);
    const [showSimulate, setShowSimulate] = useState(false);
    const [prompt, setPrompt] = useState("");
    const [loading, setLoading] = useState(true);
    const [actionError, setActionError] = useState<string | null>(null);

    const fetchRules = useCallback(async () => {
        try {
            const supabase = createClient();
            // L2 pattern: supabase client respects RLS; org filter enforced server-side in addRule/deleteRule actions
            const { data, error } = await supabase.from('rules').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            setRules(data || []);
        } catch (e) {
            console.error(e);
            setRules([]);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchRules();
    }, [fetchRules, entityId, role]);

    // H2: "Commit" now routes through the server action which adds organization_id
    const handleCommit = async (nl: string, compiled: string) => {
        setActionError(null);
        try {
            await addRule(nl, compiled, "Global");
            setShowSimulate(false);
            setPrompt("");
            setLoading(true);
            fetchRules();
        } catch (e: unknown) {
            setActionError(e instanceof Error ? e.message : "Failed to save rule");
        }
    };

    // H2: delete routes through server action which enforces org_id equality
    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure?")) return;
        setActionError(null);
        try {
            await deleteRule(id);
            setLoading(true);
            fetchRules();
        } catch (e: unknown) {
            setActionError(e instanceof Error ? e.message : "Failed to delete rule");
        }
    };

    const handleToggle = async (id: string, currentStatus: string) => {
        setActionError(null);
        try {
            await toggleRule(id, currentStatus);
            fetchRules();
        } catch (e: unknown) {
            setActionError(e instanceof Error ? e.message : "Failed to toggle rule");
        }
    };

    return (
        <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
                    <Shield size={16} /> Active Intent Proofs (Entity {entityId})
                </h3>
                {(role === "ADMIN" || role === "APPROVER") && (
                    <button
                        onClick={() => setShowSimulate(true)}
                        className="btn-primary"
                        style={{ fontSize: 12, padding: "6px 12px", background: "var(--primary)", border: "none", borderRadius: 4, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                    >
                        <Hammer size={14} /> New Intent Proof
                    </button>
                )}
            </div>

            {actionError && (
                <div style={{ padding: "10px 14px", marginBottom: 16, borderRadius: 6, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: 13 }}>
                    {actionError}
                </div>
            )}

            {showSimulate && (
                <div className="chart-card" style={{ marginBottom: 20, border: "1px solid var(--accent)", background: "rgba(139, 92, 246, 0.05)" }}>
                    {/* L6: clearly marked as demo — the simulate endpoint is not yet wired to the semantic engine */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <h4 style={{ margin: 0 }}>Add Natural Language Intent</h4>
                        <span style={{ fontSize: 10, background: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 4, padding: "2px 8px", fontWeight: 700 }}>
                            DRAFT MODE
                        </span>
                    </div>
                    <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Describe a recurring intent (e.g., 'Allow all AWS invoices under $1000 automatically')"
                            style={{ flex: 1, padding: 12, borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-body)", color: "var(--text)", minHeight: 80, fontSize: 14 }}
                        />
                    </div>
                    <div style={{ display: "flex", gap: 12 }}>
                        <button
                            onClick={() => handleCommit(prompt, JSON.stringify({ type: "ALLOW", conditions: ["natural_language"] }))}
                            disabled={!prompt.trim()}
                            style={{ background: "var(--accent)", color: "white", border: "none", padding: "8px 20px", borderRadius: 6, cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 8, opacity: prompt.trim() ? 1 : 0.5 }}
                        >
                            <Cpu size={14} /> Save Rule
                        </button>
                        <button
                            onClick={() => { setShowSimulate(false); setPrompt(""); }}
                            style={{ background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)", padding: "8px 16px", borderRadius: 6, cursor: "pointer" }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>NL Intent</th>
                            <th>Compiled Policy</th>
                            <th>Assigned Agent</th>
                            <th>Created</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && rules.length === 0 ? (
                            <tr><td colSpan={6} style={{ textAlign: "center", padding: 40 }}>Loading rules...</td></tr>
                        ) : rules.length === 0 ? (
                            <tr><td colSpan={6} style={{ textAlign: "center", padding: 40 }}>No intent proofs found for this entity.</td></tr>
                        ) : (
                            rules.map((r) => (
                                <tr key={r.id}>
                                    <td style={{ fontWeight: 500, fontSize: 13 }}>{r.nl_text}</td>
                                    <td>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--accent)", fontSize: 12 }}>
                                            <FileJson size={14} /> Compiled
                                        </div>
                                    </td>
                                    <td style={{ fontSize: 12 }}>{r.agent_id ? "Agent" : "Global"}</td>
                                    <td style={{ fontSize: 12 }}>{new Date(r.created_at).toLocaleDateString()}</td>
                                    <td>
                                        <span style={{
                                            fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                                            background: r.status === "active" ? "rgba(34,197,94,0.1)" : "rgba(107,114,128,0.1)",
                                            color: r.status === "active" ? "#22c55e" : "#6b7280",
                                            border: `1px solid ${r.status === "active" ? "rgba(34,197,94,0.2)" : "rgba(107,114,128,0.2)"}`,
                                        }}>
                                            {r.status === "active" ? "ENFORCED" : "DISABLED"}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: "flex", gap: 12 }}>
                                            <button
                                                onClick={() => handleToggle(r.id, r.status)}
                                                title={r.status === "active" ? "Disable" : "Enable"}
                                                style={{ background: "transparent", border: "none", color: "var(--text-muted)", padding: 0, cursor: "pointer" }}
                                            >
                                                <ToggleLeft size={16} />
                                            </button>
                                            {role === "ADMIN" && (
                                                <button
                                                    onClick={() => handleDelete(r.id)}
                                                    style={{ background: "transparent", border: "none", color: "#ef4444", padding: 0, cursor: "pointer" }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </>
    );
}
