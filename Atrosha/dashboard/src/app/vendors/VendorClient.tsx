'use client';

import { useEffect, useState, useCallback } from "react";
import { Users, Search, Edit2, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { useUser } from "../context/UserContext";
import { createClient } from "@/lib/supabase-client";

interface Vendor {
    id: string;
    name: string;
    auto_approve_below: number;
    first_seen: string;
    last_seen: string;
    total_paid: number;
}

export default function VendorClient() {
    const { orgId } = useUser();
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");
    const [saving, setSaving] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);

    const fetchVendors = useCallback(async () => {
        if (!orgId) return;
        setLoading(true);
        setError(null);
        const supabase = createClient();
        const { data, error: fetchErr } = await supabase
            .from('vendors')
            .select('id, name, auto_approve_below, first_seen, last_seen, total_paid')
            .eq('organization_id', orgId)
            .order('total_paid', { ascending: false });

        if (fetchErr) {
            setError("Failed to load vendor directory.");
            console.error("vendor fetch:", fetchErr);
        } else {
            setVendors(data || []);
        }
        setLoading(false);
    }, [orgId]);

    useEffect(() => {
        fetchVendors();
    }, [fetchVendors]);

    const handleSaveThreshold = async (id: string) => {
        const val = parseFloat(editValue);
        if (isNaN(val) || val < 0) { setSaveError("Invalid amount."); return; }

        setSaving(id);
        setSaveError(null);
        const supabase = createClient();

        const { error: updateErr } = await supabase
            .from('vendors')
            .update({ auto_approve_below: val })
            .eq('id', id)
            .eq('organization_id', orgId); // defense-in-depth — org scope on write too

        if (updateErr) {
            setSaveError("Failed to save threshold. Please try again.");
            console.error("vendor update:", updateErr);
        } else {
            setVendors(prev => prev.map(v => v.id === id ? { ...v, auto_approve_below: val } : v));
            setEditingId(null);
        }
        setSaving(null);
    };

    const filtered = vendors.filter(v =>
        v.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{ maxWidth: 1000, margin: "0 auto", paddingBottom: 60 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ padding: 10, background: "var(--bg-secondary)", borderRadius: 8, border: "1px solid var(--border)" }}>
                        <Users size={24} style={{ color: "var(--primary)" }} />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Vendor Directory</h2>
                        <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>Manage known vendors and auto-approval thresholds</p>
                    </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <button
                        onClick={fetchVendors}
                        disabled={loading}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", opacity: loading ? 0.4 : 1 }}
                        title="Refresh"
                    >
                        <RefreshCw size={16} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
                    </button>
                    <div style={{ position: "relative" }}>
                        <Search size={16} style={{ position: "absolute", left: 12, top: 10, color: "var(--text-muted)" }} />
                        <input
                            type="text"
                            placeholder="Search vendors..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{
                                padding: "8px 12px 8px 36px",
                                borderRadius: 6,
                                background: "var(--bg-card)",
                                border: "1px solid var(--border)",
                                color: "var(--text)",
                                fontSize: 14,
                                width: 250,
                            }}
                        />
                    </div>
                </div>
            </div>

            {error && (
                <div style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
                    marginBottom: 20, borderRadius: 8,
                    background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                    color: "#ef4444", fontSize: 13,
                }}>
                    <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                    {error}
                    <button onClick={fetchVendors} style={{ marginLeft: "auto", fontSize: 12, background: "none", border: "none", color: "#ef4444", cursor: "pointer", textDecoration: "underline" }}>Retry</button>
                </div>
            )}

            {saveError && (
                <div style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
                    marginBottom: 20, borderRadius: 8,
                    background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                    color: "#ef4444", fontSize: 13,
                }}>
                    <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                    {saveError}
                </div>
            )}

            <div className="chart-card" style={{ padding: 0, overflow: "hidden" }}>
                <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}>
                        <tr>
                            <th style={{ padding: "16px 24px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Vendor Name</th>
                            <th style={{ padding: "16px 24px", textAlign: "right", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Auto-Approve Threshold</th>
                            <th style={{ padding: "16px 24px", textAlign: "right", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Total Paid</th>
                            <th style={{ padding: "16px 24px", textAlign: "right", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Last Active</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={4} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>Loading vendors...</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={4} style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>
                                    <Users size={28} style={{ marginBottom: 8, opacity: 0.3 }} />
                                    <div style={{ fontSize: 14, fontWeight: 500 }}>
                                        {searchTerm ? "No vendors match your search." : "No vendors yet — they appear automatically as your agents transact."}
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filtered.map(v => (
                                <tr key={v.id} style={{ borderBottom: "1px solid var(--border)" }}>
                                    <td style={{ padding: "16px 24px", fontWeight: 500 }}>
                                        {v.name}
                                        {v.auto_approve_below > 0 && (
                                            <span style={{ marginLeft: 8, fontSize: 10, background: "var(--green-bg)", color: "var(--green)", padding: "2px 6px", borderRadius: 4, verticalAlign: "middle" }}>
                                                TRUSTED
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ padding: "16px 24px", textAlign: "right" }}>
                                        {editingId === v.id ? (
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
                                                <span style={{ color: "var(--text-muted)" }}>$</span>
                                                <input
                                                    type="number"
                                                    value={editValue}
                                                    onChange={e => setEditValue(e.target.value)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') handleSaveThreshold(v.id);
                                                        if (e.key === 'Escape') { setEditingId(null); setSaveError(null); }
                                                    }}
                                                    min={0}
                                                    step={0.01}
                                                    style={{ width: 80, padding: "4px 8px", background: "var(--bg)", border: "1px solid var(--primary)", borderRadius: 4, color: "var(--text)" }}
                                                    autoFocus
                                                    disabled={saving === v.id}
                                                />
                                                <button
                                                    onClick={() => handleSaveThreshold(v.id)}
                                                    disabled={saving === v.id}
                                                    style={{ background: "none", border: "none", color: "var(--green)", cursor: "pointer", display: "flex", opacity: saving === v.id ? 0.4 : 1 }}
                                                    title="Save"
                                                >
                                                    <CheckCircle2 size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12 }}>
                                                <span style={{ fontFamily: "monospace", fontSize: 14 }}>
                                                    {v.auto_approve_below > 0
                                                        ? `$${v.auto_approve_below.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                                        : "Requires Review"}
                                                </span>
                                                <button
                                                    onClick={() => { setEditingId(v.id); setEditValue(v.auto_approve_below.toString()); setSaveError(null); }}
                                                    style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", opacity: 0.6 }}
                                                    onMouseOver={e => e.currentTarget.style.opacity = "1"}
                                                    onMouseOut={e => e.currentTarget.style.opacity = "0.6"}
                                                    title="Edit Threshold"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ padding: "16px 24px", textAlign: "right", fontFamily: "monospace", color: "var(--text-muted)" }}>
                                        ${(v.total_paid / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td style={{ padding: "16px 24px", textAlign: "right", fontSize: 13, color: "var(--text-muted)" }}>
                                        {new Date(v.last_seen).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
