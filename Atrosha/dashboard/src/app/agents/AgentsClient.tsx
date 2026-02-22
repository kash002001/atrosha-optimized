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
                <div className="chart-card" style={{ marginBottom: 20, border: "1px solid var(--accent)", background: "rgba(16, 185, 129, 0.05)" }}>
                    <h4 style={{ marginTop: 0, color: "var(--accent)" }}>Agent Created Successfully</h4>
                    <p style={{ fontSize: 13, marginBottom: 12 }}>
                        Here is the Ed25519 Private Key for <strong>{newAgentKey.name}</strong>.
                        Copy it now. Put it in your bot's environment variables.
                        <strong> You will never be able to see this again.</strong>
                    </p>
                    <div style={{
                        background: "#000", padding: 12, borderRadius: 4, fontFamily: "monospace",
                        fontSize: 12, border: "1px solid #333", color: "#0f0", wordBreak: "break-all", marginBottom: 12
                    }}>
                        {newAgentKey.priv}
                    </div>
                    <button
                        onClick={() => setNewAgentKey(null)}
                        style={{ background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)", padding: "4px 12px", borderRadius: 4, cursor: "pointer", fontSize: 12 }}
                    >
                        I have copied the key
                    </button>
                </div>
            )}

            {showNewAgent && (
                <div className="chart-card" style={{ marginBottom: 20, border: "1px solid var(--primary)" }}>
                    <h4 style={{ marginTop: 0 }}>Register New Agent</h4>
                    <div style={{ display: "flex", gap: 10 }}>
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
