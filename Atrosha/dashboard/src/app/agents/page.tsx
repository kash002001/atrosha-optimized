"use client";

import { Shield, DollarSign, Clock, Users, AlertTriangle } from "lucide-react";

// Updated to use real service names as requested
const agents = [
    {
        id: "Stripe",
        role: "payment-processor",
        daily: "$250,000",
        perTx: "$50,000",
        rate: "1000 req/min",
        status: "active",
    },
    {
        id: "Wise",
        role: "treasury-management",
        daily: "$500,000",
        perTx: "$100,000",
        rate: "500 req/min",
        status: "active",
    },
    {
        id: "OpenAI",
        role: "inference",
        daily: "$2,000",
        perTx: "$50",
        rate: "5000 req/min",
        status: "active",
    },
    {
        id: "AWS",
        role: "infrastructure",
        daily: "$15,000",
        perTx: "$2,000",
        rate: "Unlimited",
        status: "active",
    },
];

// Renamed "Global Policies" to "Global Limits" for clarity
const global = [
    { icon: AlertTriangle, label: "HITL Threshold", value: "$50,000", desc: "Transactions above this require human-in-the-loop MFA" },
    { icon: Shield, label: "Supervisor Sig Threshold", value: "$10,000", desc: "Requires X-Atrosha-Supervisor-Signature header" },
    { icon: Clock, label: "Permit TTL", value: "300s", desc: "Spend permits expire after 5 minutes" },
    { icon: Users, label: "Max Agents", value: "50", desc: "Enterprise plan limit" },
];

export default function Agents() {
    return (
        <>
            <div className="page-header">
                <h2>Agents</h2>
                <p>Manage your active agents, spending limits, and security policies.</p>
            </div>

            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <DollarSign size={16} /> Global Limits
            </h3>
            <div className="stats-grid" style={{ marginBottom: 28 }}>
                {global.map((g) => (
                    <div className="stat-card" key={g.label}>
                        <div className="stat-label"><g.icon size={14} /> {g.label}</div>
                        <div className="stat-value" style={{ fontSize: 22 }}>{g.value}</div>
                        <p style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>{g.desc}</p>
                    </div>
                ))}
            </div>

            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <Shield size={16} /> Active Agents
            </h3>
            <div className="policies-grid">
                {agents.map((a) => (
                    <div className="policy-card" key={a.id}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <h4 style={{ margin: 0, fontSize: 16 }}>{a.id}</h4>
                            <span className="badge approved" style={{ fontSize: 10 }}>{a.status}</span>
                        </div>
                        <p style={{ marginBottom: 16, fontSize: 12, color: "var(--text-muted)" }}>Role: {a.role}</p>

                        <div className="policy-field">
                            <label>Daily Limit</label>
                            <span>{a.daily}</span>
                        </div>
                        <div className="policy-field">
                            <label>Per-Tx Limit</label>
                            <span>{a.perTx}</span>
                        </div>
                        <div className="policy-field">
                            <label>Rate Limit</label>
                            <span>{a.rate}</span>
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}
