'use client';

import React, { useState, useEffect } from 'react';
import { Upload, Receipt, CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface Expense {
    id: number;
    date: string;
    vendor_name: string;
    amount: number;
    currency: string;
    status: string;
    matched_tx_id: string | null;
}

const seedExpenses: Expense[] = [
    { id: 1, date: "2026-03-25", vendor_name: "AWS", amount: 2847.50, currency: "USD", status: "matched", matched_tx_id: "ch_3Qk9x2mP" },
    { id: 2, date: "2026-03-24", vendor_name: "Vercel Inc", amount: 420.00, currency: "USD", status: "matched", matched_tx_id: "ch_1Px8y4nQ" },
    { id: 3, date: "2026-03-23", vendor_name: "OpenAI", amount: 1250.00, currency: "USD", status: "pending", matched_tx_id: null },
    { id: 4, date: "2026-03-22", vendor_name: "Figma", amount: 75.00, currency: "USD", status: "matched", matched_tx_id: "ch_7Rw2k5pA" },
    { id: 5, date: "2026-03-20", vendor_name: "Unknown Vendor Co", amount: 9800.00, currency: "USD", status: "flagged", matched_tx_id: null },
    { id: 6, date: "2026-03-18", vendor_name: "Google Cloud", amount: 3150.00, currency: "USD", status: "matched", matched_tx_id: "ch_4Tx9m3qB" },
];

let nid = 100;

export default function ExpenseClient() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => { setExpenses(seedExpenses); setLoading(false); }, 350);
        return () => clearTimeout(t);
    }, []);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);

        // simulate OCR processing
        await new Promise(r => setTimeout(r, 1500));

        const newExp: Expense = {
            id: nid++,
            date: new Date().toISOString().split('T')[0],
            vendor_name: file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " "),
            amount: Math.round(Math.random() * 5000 * 100) / 100,
            currency: "USD",
            status: "pending",
            matched_tx_id: null,
        };
        setExpenses(prev => [newExp, ...prev]);
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
                    <Upload size={16} />
                    {uploading ? 'Processing...' : 'Upload Receipt'}
                    <input type="file" style={{ display: 'none' }} onChange={handleUpload} disabled={uploading} accept="image/*,application/pdf" />
                </label>
            </div>

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
                                <div>No expenses found. Start by uploading your first receipt.</div>
                            </td></tr>
                        ) : (
                            expenses.map(exp => (
                                <tr key={exp.id} style={{ borderBottom: "1px solid var(--border)" }}>
                                    <td style={{ padding: "16px 24px", color: "var(--text-muted)", fontSize: 13 }}>{exp.date}</td>
                                    <td style={{ padding: "16px 24px", fontWeight: 500 }}>{exp.vendor_name}</td>
                                    <td style={{ padding: "16px 24px", textAlign: "right", fontFamily: "monospace", fontWeight: 600 }}>
                                        {exp.currency} {exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                                            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Manual Match</span>
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
