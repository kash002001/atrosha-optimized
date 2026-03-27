"use client";

import { Shield, DollarSign, Clock, Users, AlertTriangle, Plus, HardDrive } from "lucide-react";
import { useState, useEffect } from "react";
import { useUser } from "../context/UserContext";
import { createClient } from "@/lib/supabase-client";
import { createAgent } from "./actions";

interface Agent {
    id: string;
    name: string;
    entity_id: number;
    created_at: string;
    is_active?: boolean;
}

export default function AgentsClient() {
    const { entityId, role } = useUser();
    const [agents, setAgents] = useState<Agent[]>([]);
    const [showNewAgent, setShowNewAgent] = useState(false);
    const [newName, setNewName] = useState("");
    const [creating, setCreating] = useState(false);
    const [loading, setLoading] = useState(true);

    const [newAgentKey, setNewAgentKey] = useState<{ name: string, priv: string } | null>(null);

    const fetchAgents = async () => {
        setLoading(true);
        try {
            const supabase = createClient();
            const { data, error } = await supabase.from('agents').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            setAgents(data || []);
        } catch (e) {
            console.error(e);
            setAgents([]);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchAgents();
    }, [entityId, role]);

    const global = [
        { icon: AlertTriangle, label: "HITL Threshold", value: "$50,000", desc: "Transactions above this require human-in-the-loop MFA" },
        { icon: Shield, label: "Supervisor Sig Threshold", value: "$10,000", desc: "Requires X-Atrosha-Supervisor-Signature header" },
        { icon: Clock, label: "Permit TTL", value: "300s", desc: "Spend permits expire after 5 minutes" },
        { icon: Users, label: "Max Agents", value: "50", desc: "Enterprise plan limit" },
    ];

    const handleCreate = async () => {
        if (!newName.trim()) return;
        setCreating(true);
        try {
            // Using the server action which safely interacts with the DB and Proxy
            const result = await createAgent(newName, 5000000); 

            if (result.error || !result.data) {
                alert("Failed to create agent: " + (result.error || "Unknown Error"));
                return;
            }

            setNewAgentKey({ name: newName, priv: result.data._privateKey });
            setShowNewAgent(false);
            setNewName("");
            fetchAgents();
        } catch (e: unknown) {
            alert("Crash during agent creation: " + (e instanceof Error ? e.message : String(e)));
        } finally {
            setCreating(false);
        }
    };

    return (
        <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
                    <DollarSign size={16} /> Global Limits (Entity {entityId})
                </h3>
            </div>

            <div className="stats-grid" style={{ marginBottom: 28 }}>
                {global.map((g) => (
                    <div className="stat-card" key={g.label}>
                        <div className="stat-label"><g.icon size={14} /> {g.label}</div>
                        <div className="stat-value" style={{ fontSize: 22 }}>{g.value}</div>
                        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{g.desc}</p>
                    </div>
                ))}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
                    <Shield size={16} /> Active Agents ({agents.length})
                </h3>
                {role === "ADMIN" && (
                    <button
                        onClick={() => setShowNewAgent(true)}
                        className="btn-primary"
                        style={{ fontSize: 12, padding: "6px 12px", background: "var(--primary)", border: "none", borderRadius: 4, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                    >
                        <Plus size={14} /> New Agent
                    </button>
                )}
            </div>

            {newAgentKey && (
                <div className="chart-card" style={{ marginBottom: 20, border: "1px solid var(--accent)", background: "rgba(139, 92, 246, 0.05)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                        <div>
                            <h4 style={{ marginTop: 0, color: "var(--accent)", display: "flex", alignItems: "center", gap: 8 }}>
                                <Shield size={16} /> Agent Registered: {newAgentKey.name}
                            </h4>
                            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
                                Save your Agent Private Key below. For your security, it will never be shown again.
                            </p>
                        </div>
                    </div>

                    <div style={{ background: "#000", padding: "12px 16px", borderRadius: 4, fontFamily: "monospace", fontSize: 13, color: "#10b981", wordBreak: "break-all", marginBottom: 24, border: "1px solid #333", letterSpacing: "0.5px" }}>
                        {newAgentKey.priv}
                    </div>

                    <button
                        onClick={() => setNewAgentKey(null)}
                        style={{ padding: "8px 16px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: 600, fontSize: 13 }}
                    >
                        I have securely saved my key
                    </button>
                </div>
            )}

            {showNewAgent && (
                <div className="chart-card" style={{ marginBottom: 20, border: "1px solid var(--primary)", padding: 20 }}>
                    <h4 style={{ marginTop: 0, marginBottom: 16 }}>Register New Agent</h4>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                        <input
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            placeholder="Agent Name (e.g. 'Support Bot')"
                            style={{ flex: 1, padding: "8px 12px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-body)", color: 'var(--text)' }}
                        />
                        <button
                            onClick={handleCreate}
                            disabled={creating}
                            style={{ background: "var(--primary)", color: "white", border: "none", padding: "0 20px", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}
                        >
                            {creating ? "Creating..." : "Create"}
                        </button>
                        <button
                            onClick={() => setShowNewAgent(false)}
                            style={{ background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)", padding: "0 16px", borderRadius: 6, cursor: "pointer" }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                {loading && agents.length === 0 ? (
                    <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", gridColumn: '1/-1' }}>Loading agents...</div>
                ) : agents.length === 0 ? (
                    <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", gridColumn: '1/-1' }}>No agents detected for this entity.</div>
                ) : (
                    agents.map((a) => (
                        <div key={a.id} className="chart-card" style={{ padding: 16 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{a.name}</h4>
                                    <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-muted)", fontFamily: 'monospace' }}>ID: {a.id.substring(0, 13)}...</p>
                                </div>
                                <span style={{
                                    fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                                    background: a.is_active ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                                    color: a.is_active ? "#22c55e" : "#ef4444",
                                    border: `1px solid ${a.is_active ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
                                    textTransform: 'uppercase'
                                }}>
                                    {a.is_active ? "Active" : "Revoked"}
                                </span>
                            </div>
                            <div style={{ display: "flex", gap: 16, marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                                <div>
                                    <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: 'uppercase' }}>Created</div>
                                    <div style={{ fontSize: 12 }}>{new Date(a.created_at).toLocaleDateString()}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: 'uppercase' }}>Scope</div>
                                    <div style={{ fontSize: 12 }}>Full Entity</div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </>
    );
}
