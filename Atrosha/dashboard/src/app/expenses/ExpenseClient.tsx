'use client';

import React, { useState, useEffect } from 'react';
import { atroshaFetch } from '@/lib/api-client';
import { Upload, Receipt, CheckCircle, AlertCircle, Clock } from 'lucide-react';

export default function ExpenseClient() {
    const [expenses, setExpenses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    const fetchExpenses = async () => {
        try {
            const data = await atroshaFetch('/expenses');
            setExpenses(data);
        } catch (error) {
            console.error('Failed to fetch expenses:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExpenses();
    }, []);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            // Using a direct fetch for multipart/form-data as atroshaFetch assumes JSON
            const token = localStorage.getItem('atrosha_token');
            const entityId = localStorage.getItem('atrosha_entity_id') || '1';
            const role = localStorage.getItem('atrosha_role') || 'ADMIN';

            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/expenses/upload`, {
                method: 'POST',
                headers: {
                    'X-Atrosha-Role': role,
                    'X-Atrosha-Entity-ID': entityId,
                    // Note: Browser will automatically set boundary for FormData
                },
                body: formData,
            });

            if (!response.ok) throw new Error('Upload failed');
            
            fetchExpenses();
        } catch (error) {
            alert('Failed to upload receipt');
        } finally {
            setUploading(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'matched': return <CheckCircle className="text-green-500 w-4 h-4" />;
            case 'flagged': return <AlertCircle className="text-red-500 w-4 h-4" />;
            default: return <Clock className="text-yellow-500 w-4 h-4" />;
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
                        Employee Expenses
                    </h1>
                    <p className="text-gray-400 mt-2">Manage receipts and match them against corporate card transactions.</p>
                </div>
                
                <label className={`
                    cursor-pointer flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all
                    ${uploading ? 'bg-gray-800 text-gray-400 cursor-not-allowed' : 'bg-white text-black hover:bg-gray-200'}
                `}>
                    <Upload className="w-5 h-5" />
                    {uploading ? 'Processing...' : 'Upload Receipt'}
                    <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} accept="image/*,application/pdf" />
                </label>
            </header>

            <div className="grid grid-cols-1 gap-4">
                {loading ? (
                    <div className="p-12 text-center text-gray-500">Loading expenses...</div>
                ) : expenses.length === 0 ? (
                    <div className="p-20 text-center border border-dashed border-white/10 rounded-3xl text-gray-500 flex flex-col items-center gap-4">
                        <Receipt className="w-12 h-12 opacity-20" />
                        <div>No expenses found. Start by uploading your first receipt.</div>
                    </div>
                ) : (
                    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md">
                        <table className="w-full text-left">
                            <thead className="bg-white/5 text-xs uppercase tracking-wider text-gray-400">
                                <tr>
                                    <th className="p-4 font-medium">Date</th>
                                    <th className="p-4 font-medium">Vendor</th>
                                    <th className="p-4 font-medium text-right">Amount</th>
                                    <th className="p-4 font-medium">Status</th>
                                    <th className="p-4 font-medium">Match</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {expenses.map((exp) => (
                                    <tr key={exp.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="p-4 text-gray-300">{exp.date || 'Pending OCR'}</td>
                                        <td className="p-4 font-medium text-white">{exp.vendor_name}</td>
                                        <td className="p-4 text-right font-mono text-white">
                                            {exp.amount > 0 ? `${exp.currency} ${exp.amount}` : '---'}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2 text-sm capitalize">
                                                {getStatusIcon(exp.status)}
                                                {exp.status.replace('_', ' ')}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            {exp.matched_tx_id ? (
                                                <span className="text-xs text-blue-400 font-mono bg-blue-400/10 px-2 py-1 rounded">
                                                    {exp.matched_tx_id.substring(0, 8)}...
                                                </span>
                                            ) : (
                                                <button className="text-xs text-gray-500 hover:text-white transition-colors">
                                                    Manual Match
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
