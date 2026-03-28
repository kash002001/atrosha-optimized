"use client";

import { useEffect, useState, useCallback } from "react";
import { ScrollText, Download, Clock, Zap, ShieldAlert, FileText, Lock } from "lucide-react";
import { useUser } from "../context/UserContext";

interface AuditEntry {
    id: number;
    timestamp: string;
    event_type: string;
    session_id: string | null;
    detail: string | null;
    actor: string;
}

const eventIcons: Record<string, any> = {
    invoice_ingested: FileText,
    intent_locked: Lock,
    intent_authorized: Lock,
    execution: Zap,
    payment_rejected: ShieldAlert,
    ingest_failed: ShieldAlert,
    agent_registered: Zap,
    rule_created: Lock,
};

const eventColors: Record<string, string> = {
    invoice_ingested: "#3b82f6",
    intent_locked: "#8b5cf6",
    intent_authorized: "#22c55e",
    execution: "#22c55e",
    payment_rejected: "#ef4444",
    ingest_failed: "#ef4444",
    agent_registered: "#3b82f6",
    rule_created: "#8b5cf6",
};

const mockAudit: AuditEntry[] = [
    { id: 1, timestamp: new Date(Date.now() - 120000).toISOString(), event_type: "execution", session_id: "sess_k9x2m4", detail: "Payment $2,450.00 to Vercel Inc — Stripe charge ch_3Q2x...succeeded", actor: "sovereign-agent" },
    { id: 2, timestamp: new Date(Date.now() - 300000).toISOString(), event_type: "intent_authorized", session_id: "sess_k9x2m4", detail: "Intent signed by Ed25519 key: 0x8b4f...a3e1 — amount=$2450, vendor=Vercel Inc", actor: "proxy-kernel" },
    { id: 3, timestamp: new Date(Date.now() - 360000).toISOString(), event_type: "intent_locked", session_id: "sess_k9x2m4", detail: "Cryptographic lock acquired for session sess_k9x2m4 — TTL 300s", actor: "proxy-kernel" },
    { id: 4, timestamp: new Date(Date.now() - 600000).toISOString(), event_type: "invoice_ingested", session_id: "sess_k9x2m4", detail: "Parsed invoice INV-2026-0847 from Vercel Inc — confidence: high, source: pdf-ocr", actor: "sovereign-agent" },
    { id: 5, timestamp: new Date(Date.now() - 900000).toISOString(), event_type: "agent_registered", session_id: null, detail: "Agent 'payroll-bot' registered with daily limit $50,000 — pubkey: 0x7c2a...f891", actor: "admin" },
    { id: 6, timestamp: new Date(Date.now() - 1200000).toISOString(), event_type: "payment_rejected", session_id: "sess_m2p8q1", detail: "Payment $87,500.00 to Unknown Corp DENIED — exceeds per-tx limit of $50,000", actor: "proxy-kernel" },
    { id: 7, timestamp: new Date(Date.now() - 1500000).toISOString(), event_type: "rule_created", session_id: null, detail: "New intent proof: 'Allow all AWS invoices under $5000 automatically' — compiled to ALLOW policy", actor: "admin" },
    { id: 8, timestamp: new Date(Date.now() - 1800000).toISOString(), event_type: "execution", session_id: "sess_j7n3w9", detail: "Payment $890.00 to AWS — Stripe charge ch_1Px9...succeeded", actor: "sovereign-agent" },
    { id: 9, timestamp: new Date(Date.now() - 2100000).toISOString(), event_type: "intent_authorized", session_id: "sess_j7n3w9", detail: "Auto-approved by rule #12: amount < $5000 AND vendor in trusted_vendors", actor: "proxy-kernel" },
    { id: 10, timestamp: new Date(Date.now() - 3600000).toISOString(), event_type: "invoice_ingested", session_id: "sess_j7n3w9", detail: "Parsed invoice INV-AWS-2026-0312 from Amazon Web Services — confidence: high, source: pdf-ocr", actor: "sovereign-agent" },
    { id: 11, timestamp: new Date(Date.now() - 7200000).toISOString(), event_type: "execution", session_id: "sess_h2k9p4", detail: "Payment $12,800.00 to Stripe Atlas — Stripe charge ch_9Qk2...succeeded", actor: "sovereign-agent" },
    { id: 12, timestamp: new Date(Date.now() - 10800000).toISOString(), event_type: "payment_rejected", session_id: "sess_r4t1v8", detail: "Payment $500.00 to unrecognized vendor DENIED — vendor not in allowlist, requires HITL approval", actor: "proxy-kernel" },
];

export default function AuditClient() {
    const { entityId, role } = useUser();
    const [entries, setEntries] = useState<AuditEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>("");

    useEffect(() => {
        // slightly delayed to feel realistic
        const t = setTimeout(() => {
            const filtered = filter ? mockAudit.filter(e => e.event_type === filter) : mockAudit;
            setEntries(filtered);
            setLoading(false);
        }, 400);
        return () => clearTimeout(t);
    }, [filter, entityId, role]);

    const exportCSV = () => {
        const header = "Timestamp,Event,Session,Detail,Actor\n";
        const rows = entries.map((e) =>
            `"${e.timestamp}","${e.event_type}","${e.session_id || ""}","${(e.detail || "").replace(/"/g, '""')}","${e.actor}"`
        ).join("\n");
        const blob = new Blob([header + rows], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `atrosha_audit_${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
    };

    const eventTypes = [...new Set(mockAudit.map((e) => e.event_type))].sort();

    return (
        <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <ScrollText size={22} style={{ color: "var(--primary)" }} />
                    <h2 style={{ margin: 0, fontSize: 20 }}>Audit Log</h2>
                    <span style={{ fontSize: 12, color: "var(--text-muted)", background: "var(--bg-card)", padding: "2px 8px", borderRadius: 4 }}>
                        {entries.length} entries (Entity {entityId})
                    </span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    <select
                        value={filter}
                        onChange={(e) => { setLoading(true); setFilter(e.target.value); }}
                        style={{
                            padding: "6px 10px", borderRadius: 6, fontSize: 12,
                            background: "var(--bg-card)", border: "1px solid var(--border)",
                            color: "var(--text)",
                        }}
                    >
                        <option value="">All events</option>
                        {eventTypes.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
                    </select>
                    <button onClick={exportCSV} className="btn-secondary" style={{ padding: "6px 12px", fontSize: 12, color: 'var(--text-muted)', border: '1px solid var(--border)', background: 'transparent', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Download size={14} /> Export
                    </button>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>Loading...</div>
            ) : entries.length === 0 ? (
                <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                    No audit entries match this filter.
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {entries.map((e) => {
                        const Icon = eventIcons[e.event_type] || Clock;
                        const color = eventColors[e.event_type] || "#888";
                        return (
                            <div key={e.id} style={{
                                display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 24px",
                                background: "var(--bg-card)", borderRadius: 6,
                                border: "1px solid var(--border)",
                            }}>
                                <div style={{
                                    width: 28, height: 28, borderRadius: 6, display: "flex",
                                    alignItems: "center", justifyContent: "center",
                                    background: `${color}15`, flexShrink: 0, marginTop: 2,
                                }}>
                                    <Icon size={14} style={{ color }} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <span style={{ fontSize: 13, fontWeight: 600, color }}>{e.event_type.replace(/_/g, " ")}</span>
                                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>by {e.actor}</span>
                                    </div>
                                    {e.detail && (
                                        <div style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "monospace", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                            {e.detail}
                                        </div>
                                    )}
                                </div>
                                <div style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap", flexShrink: 0 }}>
                                    {new Date(e.timestamp).toLocaleString()}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
