'use client';

import React, { useState, useEffect } from 'react';
import { atroshaFetch } from '@/lib/api-client';
import {
    ShieldCheck,
    AlertTriangle,
    User,
    DollarSign,
    BarChart3,
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

    const handleVerify = async () => {
        setLoading(true);
        try {
            // parse draft: expecting "EmpID, Amount, Period" per line
            const lines = draft.trim().split('\n');
            const data = lines.map(line => {
                const [id, amt, per] = line.split(',').map(s => s.trim());
                return { employee_id: parseInt(id), amount: parseFloat(amt), period: per };
            });

            const results = await atroshaFetch('/payroll/verify', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            setAnalysis(results);
        } catch (error) {
            alert('Failed to verify payroll draft. Ensure format is: EmployeeID, Amount, Period');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!analysis) return;
        setApproving(true);
        try {
            await atroshaFetch('/payroll/approve', {
                method: 'POST',
                body: JSON.stringify(analysis)
            });
            alert('Payroll run approved and archived.');
            setAnalysis(null);
            setDraft('');
        } catch (error) {
            alert('Failed to approve payroll.');
        } finally {
            setApproving(false);
        }
    };

    const getRiskColor = (status: string) => {
        switch (status) {
            case 'high_risk': return 'text-red-400 border-red-400/20 bg-red-400/10';
            case 'medium_risk': return 'text-yellow-400 border-yellow-400/20 bg-yellow-400/10';
            default: return 'text-green-400 border-green-400/20 bg-green-400/10';
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <header>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
                    Payroll Discrepancy Engine
                </h1>
                <p className="text-gray-400 mt-2">Autonomously detect anomalies in payroll drafts using historical data and contract twins.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Input Area */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
                    <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                        <FileSearch className="w-5 h-5 text-blue-400" />
                        Input Payroll Draft
                    </h3>
                    <div className="space-y-4">
                        <textarea
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            placeholder="EmployeeID, Amount, Period&#10;1, 5200, 2026-03&#10;2, 4800, 2026-03"
                            className="w-full h-64 bg-black/40 border border-white/5 rounded-2xl p-4 font-mono text-sm text-gray-300 focus:outline-none focus:border-blue-500/50 transition-colors resize-none"
                        />
                        <button
                            onClick={handleVerify}
                            disabled={loading || !draft.trim()}
                            className="w-full py-4 bg-white text-black rounded-2xl font-bold hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? 'Analyzing...' : 'Run Variance Analysis'}
                        </button>
                    </div>
                </div>

                {/* Analysis Area */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl flex flex-col min-h-[400px]">
                    <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-green-400" />
                        Verified Outcomes
                    </h3>

                    {!analysis ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-4 opacity-50">
                            <History className="w-12 h-12" />
                            <p>Analysis results will appear here.</p>
                        </div>
                    ) : (
                        <div className="space-y-4 flex-1">
                            {analysis.map((row, idx) => (
                                <div key={idx} className={`p-4 rounded-2xl border ${getRiskColor(row.status)} backdrop-blur-md`}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                                                <User className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-white">{row.employee_name}</div>
                                                <div className="text-xs opacity-70">ID: {row.employee_id} • {row.period}</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-mono font-bold">${row.amount.toLocaleString()}</div>
                                            <div className="text-xs opacity-70">Z-Score: {row.z_score.toFixed(2)}</div>
                                        </div>
                                    </div>
                                    {row.reasons.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-white/5">
                                            {row.reasons.map((r, i) => (
                                                <div key={i} className="flex items-center gap-2 text-xs font-medium">
                                                    <AlertTriangle className="w-3 h-3" />
                                                    {r}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}

                            <button
                                onClick={handleApprove}
                                disabled={approving}
                                className="w-full py-4 bg-green-500 text-white rounded-2xl font-bold hover:bg-green-600 transition-all flex items-center justify-center gap-2 mt-4"
                            >
                                <CheckCircle2 className="w-5 h-5" />
                                {approving ? 'Finalizing...' : 'Approve & Hash Payroll Run'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
