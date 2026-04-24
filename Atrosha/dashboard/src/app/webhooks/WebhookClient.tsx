'use client';

import { useState, useEffect, useCallback } from "react";
import { Webhook, Plus, Trash2, Activity, AlertCircle, Loader2 } from "lucide-react";
import { useUser } from "../context/UserContext";
import { createClient } from "@/lib/supabase-client";

interface WebhookRecord {
    id: string;
    url: string;
    created_at: string;
}

export default function WebhookClient() {
    const { orgId, entityId, role } = useUser();
    const [webhooks, setWebhooks] = useState<WebhookRecord[]>([]);
    const [newUrl, setNewUrl] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [urlError, setUrlError] = useState<string | null>(null);

    // C2: fetch from Supabase — no more seed data
    const fetchWebhooks = useCallback(async () => {
        if (!orgId) return;
        setLoading(true);
        try {
            const supabase = createClient();
            const { data, error: dbErr } = await supabase
                .from("webhooks")
                .select("id, url, created_at")
                .eq("organization_id", orgId)
                .order("created_at", { ascending: false });
            if (dbErr) throw dbErr;
            setWebhooks(data || []);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to load webhooks");
        }
        setLoading(false);
    }, [orgId]);

    useEffect(() => {
        fetchWebhooks();
    }, [fetchWebhooks, entityId]);

    const validateUrl = (url: string) => {
        try {
            const parsed = new URL(url);
            return parsed.protocol === "https:" ? null : "Webhook URL must use HTTPS";
        } catch {
            return "Must be a valid URL (e.g. https://your-api.com/hooks)";
        }
    };

    const addWebhook = async () => {
        setUrlError(null);
        setError(null);
        const urlValidation = validateUrl(newUrl.trim());
        if (urlValidation) { setUrlError(urlValidation); return; }
        if (!orgId) { setError("No organization found."); return; }

        setSaving(true);
        try {
            const supabase = createClient();
            const { error: dbErr } = await supabase
                .from("webhooks")
                .insert({ organization_id: orgId, url: newUrl.trim() });
            if (dbErr) throw dbErr;
            setNewUrl("");
            await fetchWebhooks();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to register webhook");
        }
        setSaving(false);
    };

    const deleteWebhook = async (id: string) => {
        if (!confirm("Remove this webhook endpoint?")) return;
        setError(null);
        try {
            const supabase = createClient();
            const { error: dbErr } = await supabase
                .from("webhooks")
                .delete()
                .eq("id", id)
                .eq("organization_id", orgId!);
            if (dbErr) throw dbErr;
            setWebhooks(prev => prev.filter(w => w.id !== id));
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to remove webhook");
        }
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
                    <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>Subscribe external systems to agent intelligence events</p>
                </div>
            </div>

            {error && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", marginBottom: 20, borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: 13 }}>
                    <AlertCircle size={14} /> {error}
                </div>
            )}

            <div className="chart-card" style={{ padding: 24, marginBottom: 32 }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 18, borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>Register Endpoint</h3>
                <div style={{ display: "flex", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                        <input
                            placeholder="https://your-api.com/webhooks/atrosha"
                            value={newUrl}
                            onChange={e => { setNewUrl(e.target.value); setUrlError(null); }}
                            onKeyDown={e => { if (e.key === 'Enter') addWebhook(); }}
                            style={{ width: "100%", padding: '8px 12px', background: 'var(--bg-body)', border: `1px solid ${urlError ? "#ef4444" : "var(--border)"}`, borderRadius: 6, color: 'var(--text)', boxSizing: "border-box" }}
                        />
                        {urlError && <p style={{ margin: "4px 0 0", fontSize: 11, color: "#ef4444" }}>{urlError}</p>}
                    </div>
                    <button
                        onClick={addWebhook}
                        disabled={saving || !newUrl.trim()}
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: '8px 16px', borderRadius: 6, background: 'var(--primary)', color: '#fff', border: 'none', cursor: saving || !newUrl.trim() ? 'not-allowed' : 'pointer', opacity: saving || !newUrl.trim() ? 0.6 : 1 }}
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                        {saving ? "Saving..." : "Add Webhook"}
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
                        {loading && (
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
                                    <p style={{ margin: "4px 0 0", fontSize: 14 }}>Add an HTTPS endpoint above to receive event payloads via HTTP POST.</p>
                                </td>
                            </tr>
                        )}
                        {webhooks.map(wh => (
                            <tr key={wh.id} style={{ borderBottom: "1px solid var(--border)" }}>
                                <td style={{ padding: "16px 24px", fontFamily: "monospace", fontSize: 14, wordBreak: "break-all" }}>
                                    {wh.url}
                                </td>
                                <td style={{ padding: "16px 24px", color: "var(--text-muted)", fontSize: 14, whiteSpace: "nowrap" }}>
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
