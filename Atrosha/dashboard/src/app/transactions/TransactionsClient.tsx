"use client";

import { CreditCard, ArrowRight, CheckCircle2, AlertCircle, Search, Filter } from "lucide-react";
import { useState, useEffect } from "react";
import { useUser } from "../context/UserContext";
import { atroshaFetch } from "@/lib/api-client";

interface Transaction {
    id: number;
    invoice_id: number;
    status: string;
    amount: number;
    currency: string;
    tx_hash: string;
    created_at: string;
}

export default function TransactionsClient() {
    const { entityId, role } = useUser();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const data = await atroshaFetch("/transactions");
            setTransactions(data || []);
        } catch (e) {
            console.error(e);
            setTransactions([]);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchTransactions();
    }, [entityId, role]);

    return (
        <>
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                <div style={{ flex: 1, position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        placeholder="Search by vendor, ID, or hash..."
                        style={{ width: '100%', padding: '10px 10px 10px 36px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-body)', color: 'var(--text)', fontSize: 13 }}
                    />
                </div>
                <button style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', cursor: 'pointer', fontSize: 13 }}>
                    <Filter size={16} /> Filters
                </button>
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Status</th>
                            <th>Transaction ID</th>
                            <th>Amount</th>
                            <th>Invoice ID</th>
                            <th>Tx Hash</th>
                            <th>Execution Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && transactions.length === 0 ? (
                            <tr><td colSpan={6} style={{ textAlign: "center", padding: 40 }}>Loading transactions...</td></tr>
                        ) : transactions.length === 0 ? (
                            <tr><td colSpan={6} style={{ textAlign: "center", padding: 40 }}>No transactions found for this entity.</td></tr>
                        ) : (
                            transactions.map((tx) => (
                                <tr key={tx.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: tx.status === 'completed' ? '#22c55e' : '#eab308' }}>
                                            {tx.status === 'completed' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                                            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>{tx.status}</span>
                                        </div>
                                    </td>
                                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>#{tx.id}</td>
                                    <td style={{ fontWeight: 600 }}>{tx.amount} {tx.currency}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                                            <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
                                            Invoice #{tx.invoice_id}
                                        </div>
                                    </td>
                                    <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>
                                        {tx.tx_hash ? `${tx.tx_hash.substring(0, 10)}...${tx.tx_hash.substring(tx.tx_hash.length - 8)}` : 'N/A'}
                                    </td>
                                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                        {new Date(tx.created_at).toLocaleString()}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </>
    );
}
