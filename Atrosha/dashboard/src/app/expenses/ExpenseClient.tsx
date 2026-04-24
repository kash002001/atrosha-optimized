"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Upload, Receipt, CheckCircle, AlertCircle, Clock, Loader2 } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { createClient } from '@/lib/supabase-client';

interface Expense {
    id: string;
    date: string;
    vendor_name: string;
    amount: number | null;
    currency: string;
    status: string;
    matched_tx_id: string | null;
}

export default function ExpenseClient() {
    const { orgId } = useUser();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // C1: real Supabase fetch — no more seed data
    const fetchExpenses = useCallback(async () => {
        if (!orgId) return;
        setLoading(true);
        try {
            const supabase = createClient();
            const { data, error: dbErr } = await supabase
                .from('expenses')
                .select('id, date, vendor_name, amount, currency, status, matched_tx_id')
                .eq('organization_id', orgId)
                .order('date', { ascending: false });
            if (dbErr) throw dbErr;
            setExpenses(data || []);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed to load expenses');
        }
        setLoading(false);
    }, [orgId]);

    useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !orgId) return;
        setUploading(true);
        setError(null);

        try {
            // derive vendor name from filename — amount is null until manually entered
            // M1: no random amount — amount stays null (pending review) to avoid data integrity trap
            const vendorName = file.name
                .replace(/\.[^/.]+$/, '')
                .replace(/[_-]/g, ' ')
                .trim() || 'Unknown Vendor';

            const supabase = createClient();
            const { error: dbErr } = await supabase
                .from('expenses')
                .insert({
                    organization_id: orgId,
                    date: new Date().toISOString().split('T')[0],
                    vendor_name: vendorName,
                    amount: null,
                    currency: 'USD',
                    status: 'pending',
                    matched_tx_id: null,
                });
            if (dbErr) throw dbErr;
            await fetchExpenses();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Upload failed');
        }

        setUploading(false);
        e.target.value = '';
    };

    const statusIcon = (s: string) => {
        if (s === 'matched') return <CheckCircle size={16} style={{ color: '#22c55e' }} />;
        if (s === 'flagged') return <AlertCircle size={16} style={{ color: '#ef4444' }} />;
        return <Clock size={16} style={{ color: '#eab308' }} />;
    };

    const statusColor = (s: string) => {
        if (s === 'matched') return '#22c55e';
        if (s === 'flagged') return '#ef4444';
        return '#eab308';
    };

    return (
        <div style={{ maxWidth: 1000, margin: "0 auto", paddingBottom: 60 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ padding: 10, background: "var(--bg-secondary)", borderRadius: 8, border: "1px solid var(--border)" }}>
                        <Receipt size={24} style={{ color: "var(--primary)" }} />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Employee Expenses</h2>
                        <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>Manage receipts and match them against corporate card transactions.</p>
                    </div>
                </div>

                <label style={{
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 16px', borderRadius: 6,
                    background: uploading ? 'var(--bg-secondary)' : 'var(--primary)',
                    color: uploading ? 'var(--text-muted)' : '#fff',
                    border: 'none', fontWeight: 600, fontSize: 13,
                }}>
                    {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                    {uploading ? 'Uploading...' : 'Upload Receipt'}
                    <input type="file" style={{ display: 'none' }} onChange={handleUpload} disabled={uploading} accept="image/*,application/pdf" />
                </label>
            </div>

            {error && (
                <div style={{ padding: "10px 14px", marginBottom: 20, borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: 13 }}>
                    {error}
                </div>
            )}

            <div className="chart-card" style={{ padding: 0, overflow: "hidden" }}>
                <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}>
                        <tr>
                            <th style={{ padding: "16px 24px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Date</th>
                            <th style={{ padding: "16px 24px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Vendor</th>
                            <th style={{ padding: "16px 24px", textAlign: "right", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Amount</th>
                            <th style={{ padding: "16px 24px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Status</th>
                            <th style={{ padding: "16px 24px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Match</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={5} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>Loading expenses...</td></tr>
                        ) : expenses.length === 0 ? (
                            <tr><td colSpan={5} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
                                <Receipt size={32} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
                                <div>No expenses found. Upload a receipt to get started.</div>
                            </td></tr>
                        ) : (
                            expenses.map(exp => (
                                <tr key={exp.id} style={{ borderBottom: "1px solid var(--border)" }}>
                                    <td style={{ padding: "16px 24px", color: "var(--text-muted)", fontSize: 13 }}>{exp.date}</td>
                                    <td style={{ padding: "16px 24px", fontWeight: 500 }}>{exp.vendor_name}</td>
                                    <td style={{ padding: "16px 24px", textAlign: "right", fontFamily: "monospace", fontWeight: 600 }}>
                                        {exp.amount != null
                                            ? `${exp.currency} ${exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                                            : <span style={{ color: "var(--text-muted)", fontSize: 12 }}>Pending review</span>
                                        }
                                    </td>
                                    <td style={{ padding: "16px 24px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: statusColor(exp.status), fontWeight: 600, textTransform: "uppercase" }}>
                                            {statusIcon(exp.status)}
                                            {exp.status}
                                        </div>
                                    </td>
                                    <td style={{ padding: "16px 24px" }}>
                                        {exp.matched_tx_id ? (
                                            <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--primary)", background: "rgba(59,130,246,0.1)", padding: "2px 6px", borderRadius: 4 }}>
                                                {exp.matched_tx_id.substring(0, 12)}...
                                            </span>
                                        ) : (
                                            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Unmatched</span>
                                        )}
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
