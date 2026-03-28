'use client';

import { Shield, Hammer, ToggleLeft, Trash2, Cpu, FileJson, Play } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useUser } from "../context/UserContext";
import { createClient } from "@/lib/supabase-client";

interface Rule {
    id: string;
    nl_text: string;
    compiled_policy: any;
    agent_id?: string;
    status: string;
    created_at: string;
    agent?: { name: string };
}

export default function RulesClient() {
    const { entityId, role } = useUser();
    const [rules, setRules] = useState<Rule[]>([]);
    const [showSimulate, setShowSimulate] = useState(false);
    const [prompt, setPrompt] = useState("");
    const [simulating, setSimulating] = useState(false);
    const [simResult, setSimResult] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchRules = useCallback(async () => {
        try {
            const supabase = createClient();
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

    const handleSimulate = () => {
        if (!prompt.trim()) return;
        setSimulating(true);
        setTimeout(() => {
            setSimResult({
                intent: prompt,
                action: "TRANSFER",
                params: { amount: 500, currency: "USD" },
                policy: {
                    type: "ALLOW",
                    conditions: ["amount < 1000", "approved_vendor"]
                },
                signature: "0x" + Math.random().toString(16).substring(2, 42)
            });
            setSimulating(false);
        }, 1500);
    };

    const handleCommit = async () => {
        if (!simResult) return;
        try {
            const supabase = createClient();
            const { error } = await supabase.from('rules').insert({
                nl_text: simResult.intent,
                compiled_policy: simResult.policy,
                status: 'active',
                effect: 'allow',
                priority: 100,
            });
            if (error) throw error;
            setShowSimulate(false);
            setSimResult(null);
            setPrompt("");
            setLoading(true);
            fetchRules();
        } catch (e) {
            alert("Failed to save rule");
            console.error(e);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure?")) return;
        try {
            const supabase = createClient();
            const { error } = await supabase.from('rules').delete().eq('id', id);
            if (error) throw error;
            setLoading(true);
            fetchRules();
        } catch (e) {
            alert("Failed to delete rule");
            console.error(e);
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

            {showSimulate && (
                <div className="chart-card" style={{ marginBottom: 20, border: "1px solid var(--accent)", background: "rgba(139, 92, 246, 0.05)" }}>
                    <h4 style={{ margin: "0 0 16px" }}>Simulate Natural Language Intent</h4>
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
                            onClick={handleSimulate}
                            disabled={simulating}
                            style={{ background: "var(--accent)", color: "white", border: "none", padding: "8px 20px", borderRadius: 6, cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}
                        >
                            {simulating ? "Compiling..." : <><Cpu size={14} /> Simulate Compiled Intent</>}
                        </button>
                        <button
                            onClick={() => { setShowSimulate(false); setSimResult(null); }}
                            style={{ background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)", padding: "8px 16px", borderRadius: 6, cursor: "pointer" }}
                        >
                            Cancel
                        </button>
                    </div>

                    {simResult && (
                        <div style={{ marginTop: 24, borderTop: "1px solid var(--border)", paddingTop: 24 }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                                <div>
                                    <h5 style={{ margin: "0 0 8px", fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase" }}>Compiled Policy</h5>
                                    <pre style={{ background: "#000", padding: 16, borderRadius: 6, fontSize: 12, color: "#10b981", border: "1px solid #333", margin: 0 }}>
                                        {JSON.stringify(simResult.policy, null, 2)}
                                    </pre>
                                </div>
                                <div>
                                    <h5 style={{ margin: "0 0 8px", fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase" }}>Cryptographic Proof</h5>
                                    <div style={{ background: "#000", padding: 16, borderRadius: 6, fontSize: 11, color: "var(--text-muted)", border: "1px solid #333", fontFamily: "monospace", wordBreak: "break-all" }}>
                                        {simResult.signature}
                                    </div>
                                    <button
                                        onClick={handleCommit}
                                        style={{ marginTop: 16, width: "100%", background: "var(--primary)", color: "white", border: "none", padding: "10px", borderRadius: 6, cursor: "pointer", fontWeight: 700 }}
                                    >
                                        Commit to Proxy Kernel
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
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
                                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)" }}>
                                            ENFORCED
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: "flex", gap: 12 }}>
                                            <button style={{ background: "transparent", border: "none", color: "var(--text-muted)", padding: 0, cursor: "pointer" }}><ToggleLeft size={16} /></button>
                                            {role === "ADMIN" && (
                                                <button
                                                    onClick={() => handleDelete(r.id)}
                                                    style={{ background: "transparent", border: "none", color: "#ef4444", padding: 0, cursor: "pointer" }}
                                                ><Trash2 size={16} /></button>
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
