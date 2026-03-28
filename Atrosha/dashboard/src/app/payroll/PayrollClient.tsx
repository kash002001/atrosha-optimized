'use client';

import React, { useState } from 'react';
import {
    ShieldCheck,
    AlertTriangle,
    User,
    CheckCircle2,
    History,
    FileSearch
} from 'lucide-react';

interface PayrollAnalysis {
    employee_id: number;
    employee_name: string;
    amount: number;
    period: string;
    status: 'low_risk' | 'medium_risk' | 'high_risk';
    reasons: string[];
    z_score: number;
}

export default function PayrollClient() {
    const [draft, setDraft] = useState<string>('');
    const [analysis, setAnalysis] = useState<PayrollAnalysis[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [approving, setApproving] = useState(false);
    const [approved, setApproved] = useState(false);

    const handleVerify = async () => {
        setLoading(true);
        // simulate analysis delay
        await new Promise(r => setTimeout(r, 1800));

        const lines = draft.trim().split('\n');
        const results: PayrollAnalysis[] = lines.map(line => {
            const [id, amt, per] = line.split(',').map(s => s.trim());
            const amount = parseFloat(amt) || 0;
            const empId = parseInt(id) || 1;

            // deterministic mock risk based on amount thresholds
            let status: 'low_risk' | 'medium_risk' | 'high_risk' = 'low_risk';
            let reasons: string[] = [];
            let zScore = Math.round((Math.random() * 2 - 0.5) * 100) / 100;

            if (amount > 15000) {
                status = 'high_risk';
                zScore = 2.8 + Math.random();
                reasons = [`Amount $${amount.toLocaleString()} exceeds 2σ of historical average`, "Requires supervisor approval"];
            } else if (amount > 8000) {
                status = 'medium_risk';
                zScore = 1.5 + Math.random() * 0.8;
                reasons = [`17% above 6-month rolling average for this role`];
            }

            const names = ["Sarah Chen", "Marcus Johnson", "Priya Patel", "James Wilson", "Elena Rodriguez", "David Kim", "Amy Zhang", "Robert Taylor"];

            return {
                employee_id: empId,
                employee_name: names[(empId - 1) % names.length],
                amount,
                period: per || '2026-03',
                status,
                reasons,
                z_score: Math.round(zScore * 100) / 100,
            };
        });

        setAnalysis(results);
        setLoading(false);
    };

    const handleApprove = async () => {
        setApproving(true);
        await new Promise(r => setTimeout(r, 1200));
        setApproved(true);
        setApproving(false);
    };

    const getRiskStyle = (status: string) => {
        if (status === 'high_risk') return { color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)' };
        if (status === 'medium_risk') return { color: '#f59e0b', borderColor: 'rgba(245,158,11,0.2)', background: 'rgba(245,158,11,0.05)' };
        return { color: '#22c55e', borderColor: 'rgba(34,197,94,0.2)', background: 'rgba(34,197,94,0.05)' };
    };

    return (
        <div style={{ maxWidth: 1100, margin: "0 auto", paddingBottom: 60 }}>
            <div style={{ marginBottom: 32 }}>
                <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Payroll Discrepancy Engine</h2>
                <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>Autonomously detect anomalies in payroll drafts using historical data and contract twins.</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                <div className="chart-card" style={{ padding: 24 }}>
                    <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                        <FileSearch size={18} style={{ color: "var(--primary)" }} />
                        Input Payroll Draft
                    </h3>
                    <textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder={"EmployeeID, Amount, Period\n1, 5200, 2026-03\n2, 4800, 2026-03\n3, 18500, 2026-03"}
                        style={{
                            width: "100%", minHeight: 220, padding: 12, borderRadius: 8,
                            background: "var(--bg-body)", border: "1px solid var(--border)",
                            color: "var(--text)", fontFamily: "monospace", fontSize: 13, resize: "vertical",
                        }}
                    />
                    <button
                        onClick={handleVerify}
                        disabled={loading || !draft.trim()}
                        style={{
                            width: "100%", padding: 12, marginTop: 12, borderRadius: 8,
                            background: loading || !draft.trim() ? 'var(--bg-secondary)' : 'var(--primary)',
                            color: loading || !draft.trim() ? 'var(--text-muted)' : '#fff',
                            border: 'none', fontWeight: 700, cursor: loading || !draft.trim() ? 'not-allowed' : 'pointer', fontSize: 13,
                        }}
                    >
                        {loading ? 'Analyzing...' : 'Run Variance Analysis'}
                    </button>
                </div>

                <div className="chart-card" style={{ padding: 24, display: "flex", flexDirection: "column", minHeight: 340 }}>
                    <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                        <ShieldCheck size={18} style={{ color: "#22c55e" }} />
                        Verified Outcomes
                    </h3>

                    {approved ? (
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
                            <CheckCircle2 size={48} style={{ color: "#22c55e" }} />
                            <div style={{ fontSize: 16, fontWeight: 700, color: "#22c55e" }}>Payroll Run Approved & Hashed</div>
                            <div style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "monospace" }}>
                                Hash: 0x{Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}
                            </div>
                            <button onClick={() => { setAnalysis(null); setDraft(""); setApproved(false); }}
                                style={{ marginTop: 12, padding: "8px 20px", borderRadius: 6, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer", fontSize: 13 }}>
                                Start New Run
                            </button>
                        </div>
                    ) : !analysis ? (
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: 0.4, gap: 12 }}>
                            <History size={40} />
                            <p style={{ margin: 0, color: "var(--text-muted)" }}>Analysis results will appear here.</p>
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                            {analysis.map((row, idx) => {
                                const riskStyle = getRiskStyle(row.status);
                                return (
                                    <div key={idx} style={{ padding: 12, borderRadius: 8, border: `1px solid ${riskStyle.borderColor}`, background: riskStyle.background }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                <User size={16} style={{ color: riskStyle.color }} />
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{row.employee_name}</div>
                                                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>ID: {row.employee_id} • {row.period}</div>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: "right" }}>
                                                <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 15 }}>${row.amount.toLocaleString()}</div>
                                                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Z-Score: {row.z_score.toFixed(2)}</div>
                                            </div>
                                        </div>
                                        {row.reasons.length > 0 && (
                                            <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                                                {row.reasons.map((r, i) => (
                                                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 500, color: riskStyle.color }}>
                                                        <AlertTriangle size={12} /> {r}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            <button
                                onClick={handleApprove}
                                disabled={approving}
                                style={{
                                    width: "100%", padding: 12, marginTop: 8, borderRadius: 8,
                                    background: approving ? 'var(--bg-secondary)' : '#22c55e',
                                    color: approving ? 'var(--text-muted)' : '#000',
                                    border: 'none', fontWeight: 700, cursor: approving ? 'not-allowed' : 'pointer',
                                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13,
                                }}
                            >
                                <CheckCircle2 size={16} />
                                {approving ? 'Finalizing...' : 'Approve & Hash Payroll Run'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
