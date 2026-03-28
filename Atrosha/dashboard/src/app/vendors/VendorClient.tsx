'use client';

import { useEffect, useState, useCallback } from "react";
import { Users, Search, Edit2, CheckCircle2 } from "lucide-react";
import { useUser } from "../context/UserContext";

interface Vendor {
    id: number;
    name: string;
    auto_approve_below: number;
    first_seen: string;
    last_seen: string;
    total_paid: number;
}

const seedVendors: Vendor[] = [
    { id: 1, name: "Amazon Web Services", auto_approve_below: 5000, first_seen: "2025-08-12", last_seen: "2026-03-27", total_paid: 142800 },
    { id: 2, name: "Vercel Inc", auto_approve_below: 2000, first_seen: "2025-11-03", last_seen: "2026-03-26", total_paid: 28400 },
    { id: 3, name: "Stripe", auto_approve_below: 10000, first_seen: "2025-06-01", last_seen: "2026-03-27", total_paid: 67200 },
    { id: 4, name: "Google Cloud Platform", auto_approve_below: 8000, first_seen: "2025-09-15", last_seen: "2026-03-25", total_paid: 95600 },
    { id: 5, name: "Supabase Inc", auto_approve_below: 1500, first_seen: "2026-01-10", last_seen: "2026-03-24", total_paid: 4800 },
    { id: 6, name: "OpenAI", auto_approve_below: 3000, first_seen: "2025-12-01", last_seen: "2026-03-27", total_paid: 18900 },
    { id: 7, name: "Cloudflare", auto_approve_below: 500, first_seen: "2025-10-20", last_seen: "2026-03-20", total_paid: 3200 },
    { id: 8, name: "Figma", auto_approve_below: 0, first_seen: "2026-02-14", last_seen: "2026-03-15", total_paid: 1200 },
];

export default function VendorClient() {
    const { entityId, role } = useUser();
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editValue, setEditValue] = useState<string>("");

    useEffect(() => {
        const t = setTimeout(() => {
            setVendors(seedVendors);
            setLoading(false);
        }, 300);
        return () => clearTimeout(t);
    }, [entityId, role]);

    const handleSaveThreshold = (id: number) => {
        const val = parseFloat(editValue);
        if (isNaN(val) || val < 0) return;
        setVendors(prev => prev.map(v => v.id === id ? { ...v, auto_approve_below: val } : v));
        setEditingId(null);
    };

    const filtered = vendors.filter(v => v.name.toLowerCase().includes(searchTerm.toLowerCase()));

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
                            width: 250
                        }}
                    />
                </div>
            </div>

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
                            <tr><td colSpan={4} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>No vendors found.</td></tr>
                        ) : (
                            filtered.map(v => (
                                <tr key={v.id} style={{ borderBottom: "1px solid var(--border)" }}>
                                    <td style={{ padding: "16px 24px", fontWeight: 500 }}>
                                        {v.name}
                                        {v.auto_approve_below > 0 && <span style={{ marginLeft: 8, fontSize: 10, background: "var(--green-bg)", color: "var(--green)", padding: "2px 6px", borderRadius: 4, verticalAlign: "middle" }}>TRUSTED</span>}
                                    </td>
                                    <td style={{ padding: "16px 24px", textAlign: "right" }}>
                                        {editingId === v.id ? (
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
                                                <span style={{ color: "var(--text-muted)" }}>$</span>
                                                <input
                                                    type="number"
                                                    value={editValue}
                                                    onChange={e => setEditValue(e.target.value)}
                                                    onKeyDown={e => { if (e.key === 'Enter') handleSaveThreshold(v.id); if (e.key === 'Escape') setEditingId(null); }}
                                                    style={{ width: 80, padding: "4px 8px", background: "var(--bg)", border: "1px solid var(--primary)", borderRadius: 4, color: "var(--text)" }}
                                                    autoFocus
                                                />
                                                <button onClick={() => handleSaveThreshold(v.id)} style={{ background: "none", border: "none", color: "var(--green)", cursor: "pointer", display: "flex" }} title="Save">
                                                    <CheckCircle2 size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="group" style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12 }}>
                                                <span style={{ fontFamily: "monospace", fontSize: 14 }}>
                                                    {v.auto_approve_below > 0 ? `$${v.auto_approve_below.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "Requires Review"}
                                                </span>
                                                <button
                                                    onClick={() => { setEditingId(v.id); setEditValue(v.auto_approve_below.toString()); }}
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
                                        ${v.total_paid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
        </div>
    );
}
