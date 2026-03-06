"use client";

import { useEffect, useState } from "react";
import { ScrollText, Download, Clock, Zap, ShieldAlert, FileText, Lock } from "lucide-react";
import { useUser } from "../context/UserContext";
import { atroshaFetch } from "@/lib/api-client";

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
};

const eventColors: Record<string, string> = {
    invoice_ingested: "#3b82f6",
    intent_locked: "#8b5cf6",
    intent_authorized: "#22c55e",
    execution: "#22c55e",
    payment_rejected: "#ef4444",
    ingest_failed: "#ef4444",
};

export default function AuditClient() {
    const { entityId, role } = useUser();
    const [entries, setEntries] = useState<AuditEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>("");

    const fetchAudit = () => {
        setLoading(true);
        atroshaFetch(`/audit?limit=200${filter ? `&event_type=${filter}` : ""}`)
            .then(setEntries)
            .catch(() => setEntries([]))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchAudit();
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

    const eventTypes = [...new Set(entries.map((e) => e.event_type))].sort();

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
                        onChange={(e) => { setFilter(e.target.value); }}
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
                    No audit entries yet for this entity.
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
