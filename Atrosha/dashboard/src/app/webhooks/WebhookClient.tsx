'use client';

import { useState, useEffect } from "react";
import { Webhook, Plus, Trash2, Activity } from "lucide-react";
import { useUser } from "../context/UserContext";

interface WebhookRecord {
    id: number;
    url: string;
    created_at: string;
}

const seedWebhooks: WebhookRecord[] = [
    { id: 1, url: "https://hooks.slack.com/services/T0x.../B0x.../xyzABC", created_at: "2026-03-15T10:30:00Z" },
    { id: 2, url: "https://api.pagerduty.com/webhooks/atrosha-alerts", created_at: "2026-03-20T14:15:00Z" },
];

let nextId = 10;

export default function WebhookClient() {
    const { entityId, role } = useUser();
    const [webhooks, setWebhooks] = useState<WebhookRecord[]>([]);
    const [newUrl, setNewUrl] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const t = setTimeout(() => {
            setWebhooks(seedWebhooks);
            setLoading(false);
        }, 300);
        return () => clearTimeout(t);
    }, [entityId, role]);

    const addWebhook = () => {
        if (!newUrl.trim()) return;
        setWebhooks(prev => [...prev, { id: nextId++, url: newUrl.trim(), created_at: new Date().toISOString() }]);
        setNewUrl("");
    };

    const deleteWebhook = (id: number) => {
        setWebhooks(prev => prev.filter(w => w.id !== id));
    };

    if (role !== "ADMIN") {
        return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Access Denied. Admins only.</div>;
    }

    return (
        <div style={{ maxWidth: 1000, margin: "0 auto", paddingBottom: 60 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
                <div style={{ padding: 10, background: "var(--bg-secondary)", borderRadius: 8, border: "1px solid var(--border)" }}>
                    <Webhook size={24} style={{ color: "var(--primary)" }} />
                </div>
                <div>
                    <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Developer Webhooks</h2>
                    <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>Subscribe external systems to agent intelligence events (Entity {entityId})</p>
                </div>
            </div>

            <div className="chart-card" style={{ padding: 24, marginBottom: 32 }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 18, borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>Register Endpoint</h3>
                <div style={{ display: "flex", gap: 12 }}>
                    <input
                        placeholder="https://your-api.com/webhooks/atrosha"
                        value={newUrl}
                        onChange={e => setNewUrl(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') addWebhook(); }}
                        style={{ flex: 1, padding: '8px 12px', background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)' }}
                    />
                    <button onClick={addWebhook} style={{ display: "flex", alignItems: "center", gap: 8, padding: '8px 16px', borderRadius: 6, background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                        <Plus size={16} /> Add Webhook
                    </button>
                </div>
            </div>

            <div className="chart-card" style={{ padding: 0, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead style={{ background: "var(--bg-secondary)", fontSize: 13, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>
                        <tr>
                            <th style={{ padding: "16px 24px", fontWeight: 600 }}>Destination URL</th>
                            <th style={{ padding: "16px 24px", fontWeight: 600 }}>Registered On</th>
                            <th style={{ padding: "16px 24px", fontWeight: 600, textAlign: "right" }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && webhooks.length === 0 && (
                            <tr>
                                <td colSpan={3} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
                                    <Activity size={24} style={{ margin: "0 auto 12px" }} />
                                    <p style={{ margin: 0 }}>Loading webhooks...</p>
                                </td>
                            </tr>
                        )}
                        {!loading && webhooks.length === 0 && (
                            <tr>
                                <td colSpan={3} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
                                    <Webhook size={32} style={{ margin: "0 auto 16px", opacity: 0.5 }} />
                                    <p style={{ margin: 0, fontSize: 16 }}>No webhooks registered</p>
                                    <p style={{ margin: "4px 0 0", fontSize: 14 }}>Add an endpoint above to receive event payloads via HTTP POST.</p>
                                </td>
                            </tr>
                        )}
                        {webhooks.map(wh => (
                            <tr key={wh.id} style={{ borderBottom: "1px solid var(--border)" }}>
                                <td style={{ padding: "16px 24px", fontFamily: "monospace", fontSize: 14 }}>
                                    {wh.url}
                                </td>
                                <td style={{ padding: "16px 24px", color: "var(--text-muted)", fontSize: 14 }}>
                                    {new Date(wh.created_at).toLocaleString()}
                                </td>
                                <td style={{ padding: "16px 24px", textAlign: "right" }}>
                                    <button
                                        onClick={() => deleteWebhook(wh.id)}
                                        style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 8, borderRadius: 4 }}
                                        onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
                                        onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
