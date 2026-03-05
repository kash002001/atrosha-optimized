"use client";

import { Shield, DollarSign, Clock, Users, AlertTriangle } from "lucide-react";
import { useState } from "react";

interface Agent {
    id: string;
    name: string;
    organization_id: string;
    created_at: string;
    is_active?: boolean;
    daily_limit_cents?: number;
}

interface AgentsClientProps {
    agents: Agent[];
}

export default function AgentsClient({ agents }: AgentsClientProps) {
    const [showNewAgent, setShowNewAgent] = useState(false);
    const [newName, setNewName] = useState("");
    const [creating, setCreating] = useState(false);

    const [newAgentKey, setNewAgentKey] = useState<{ name: string, priv: string } | null>(null);

    // Mock global stats for now as they might be config-based or aggregates
    // Renamed "Global Policies" to "Global Limits" for clarity
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
            // Dynamic import to avoid SSR issues with server actions in client components if not perfectly set up
            const { createAgent } = await import("./actions");
            const result = await createAgent(newName, 500000); // Default $5k

            if (result.error) {
                alert("Failed to create agent: " + result.error);
                return;
            }

            const newAgent = result.data;
            setNewAgentKey({ name: newName, priv: newAgent._privateKey });
            setShowNewAgent(false);
            setNewName("");
        } catch (e: any) {
            alert("Crash during agent creation: " + e.message);
        } finally {
            setCreating(false);
        }
    };

    return (
        <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
                    <DollarSign size={16} /> Global Limits
                </h3>
            </div>

            <div className="stats-grid" style={{ marginBottom: 28 }}>
                {global.map((g) => (
                    <div className="stat-card" key={g.label}>
                        <div className="stat-label"><g.icon size={14} /> {g.label}</div>
                        <div className="stat-value" style={{ fontSize: 22 }}>{g.value}</div>
                        <p style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>{g.desc}</p>
                    </div>
                ))}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
                    <Shield size={16} /> Active Agents ({agents.length})
                </h3>
                <button
                    onClick={() => setShowNewAgent(true)}
                    className="btn-primary"
                    style={{ fontSize: 12, padding: "6px 12px", background: "var(--primary)", border: "none", borderRadius: 4, color: "#fff", cursor: "pointer" }}
                >
                    + New Agent
                </button>
            </div>

            {newAgentKey && (
                <div className="chart-card" style={{ marginBottom: 20, border: "1px solid var(--accent)", background: "var(--bg-card)" }}>
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

                    <h5 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Universal Integration Guide</h5>
                    <p style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 16, lineHeight: 1.5 }}>
                        Atrosha dynamically protects <strong>any AI agent in the world</strong> (OpenAI, Anthropic, custom LLMs, financial bots, Open Claw) out of the box.
                        Simply route your agent's outbound internet requests through the secure proxy.
                    </p>

                    <div style={{
                        background: "var(--bg)", padding: 16, borderRadius: 6, border: "1px solid var(--border)",
                        fontFamily: "Consolas, monospace", fontSize: 12, color: "var(--text)", overflowX: "auto", marginBottom: 20
                    }}>
                        <pre style={{ margin: 0 }}>
                            {`# 1. Provide Context to your AI Agent
export ATROSHA_AGENT_KEY="${newAgentKey.priv.substring(0, 16).replace(/[^a-zA-Z0-9]/g, 'a')}..."

# 2. Force external internet traffic through the guardian
export HTTPS_PROXY="https://proxy.atrosha.bond"
export HTTP_PROXY="http://proxy.atrosha.bond"

# 3. That's it! All HTTP requests, external API calls, and financial 
# transfers are now cryptographically verified and semantically audited.`}
                        </pre>
                    </div>

                    <button
                        onClick={() => setNewAgentKey(null)}
                        style={{ padding: "8px 16px", background: "var(--accent)", color: "#000", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: 600, fontSize: 13 }}
                    >
                        I have securely saved my key
                    </button>
                </div>
            )}

            {showNewAgent && (
                <div className="chart-card" style={{ marginBottom: 20, border: "1px solid var(--primary)" }}>
                    <h4 style={{ marginTop: 0 }}>Register New Agent</h4>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                        <input
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            placeholder="Agent Name (e.g. 'Support Bot')"
                            style={{ flex: 1, padding: "8px", borderRadius: 4, border: "1px solid var(--border)", background: "var(--bg)" }}
                        />
                        <button
                            onClick={handleCreate}
                            disabled={creating}
                            style={{ background: "var(--primary)", color: "white", border: "none", padding: "0 16px", borderRadius: 4, cursor: "pointer" }}
                        >
                            {creating ? "Creating..." : "Create"}
                        </button>
                        <button
                            onClick={() => setShowNewAgent(false)}
                            style={{ background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)", padding: "0 12px", borderRadius: 4, cursor: "pointer" }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            <div className="policies-grid">
                {agents.length === 0 ? (
                    <div className="text-gray-500 text-sm">No agents detected yet. Use the SDK or create one above.</div>
                ) : (
                    agents.map((a) => (
                        <div className="policy-card" key={a.id}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                <h4 style={{ margin: 0, fontSize: 16 }}>{a.name || "Unnamed Agent"}</h4>
                                <span className={`badge ${a.is_active !== false ? 'approved' : 'denied'}`} style={{ fontSize: 10 }}>
                                    {a.is_active !== false ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            <p style={{ marginBottom: 16, fontSize: 12, color: "var(--text-muted)" }}>Role: General Purpose</p>

                            <div className="policy-field">
                                <label>Registered</label>
                                <span>{new Date(a.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="policy-field">
                                <label>Status</label>
                                <span>Online</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </>
    );
}
