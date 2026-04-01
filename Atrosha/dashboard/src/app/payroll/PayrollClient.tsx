'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    ShieldCheck,
    AlertTriangle,
    User,
    CheckCircle2,
    XCircle,
    History,
    Loader2,
    RefreshCcw,
    DollarSign,
    Gauge,
    ChevronDown,
} from 'lucide-react';

type Tab = 'pending' | 'approved' | 'denied';

interface Transaction {
    id: string;
    agent_id: string;
    amount: number;
    currency: string;
    status: string;
    created_at: string;
    target_url?: string;
    verdict_reason?: string;
    denial_reason?: string;
}

interface AgentBudget {
    name: string;
    dailyLimit: number;
    perTxLimit: number;
    todaySpent: number;
    remaining: number;
}

export default function PayrollClient() {
    const [tab, setTab] = useState<Tab>('pending');
    const [txs, setTxs] = useState<Transaction[]>([]);
    const [agents, setAgents] = useState<Record<string, AgentBudget>>({});
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [acting, setActing] = useState<string | null>(null); // 'approve' | 'deny' | txId for single
    const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
    const [expandedTx, setExpandedTx] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setErr(null);
        try {
            const res = await fetch(`/api/payroll?tab=${tab}`, { cache: "no-store" });
            if (!res.ok) throw new Error(`${res.status}`);
            const data = await res.json();
            setTxs(data.transactions || []);
            setAgents(data.agents || {});
            setSelected(new Set());
        } catch (e: any) {
            setErr(e.message || "Failed to load");
        } finally {
            setLoading(false);
        }
    }, [tab]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // auto-dismiss toast
    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 3500);
        return () => clearTimeout(t);
    }, [toast]);

    const handleAction = async (ids: string[], decision: 'approved' | 'denied') => {
        const key = ids.length === 1 ? ids[0] : decision;
        setActing(key);
        try {
            const res = await fetch('/api/payroll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transactionIds: ids, decision }),
            });
            if (!res.ok) throw new Error(`${res.status}`);
            const data = await res.json();
            setToast({ msg: `${data.count} transaction(s) ${decision}`, type: 'ok' });
            fetchData();
        } catch (e: any) {
            setToast({ msg: `Failed: ${e.message}`, type: 'err' });
        } finally {
            setActing(null);
        }
    };

    const toggleSelect = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const selectAll = () => {
        if (selected.size === txs.length) setSelected(new Set());
        else setSelected(new Set(txs.map(t => t.id)));
    };

    const fmt = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

    const riskLevel = (tx: Transaction, agent?: AgentBudget) => {
        if (!agent) return 'unknown';
        if (tx.amount > agent.perTxLimit && agent.perTxLimit > 0) return 'high';
        if (agent.remaining < tx.amount) return 'high';
        const pct = agent.dailyLimit > 0 ? (agent.todaySpent / agent.dailyLimit) : 0;
        return pct > 0.8 ? 'medium' : 'low';
    };

    const riskColor = (level: string) => {
        if (level === 'high') return { bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.18)', text: '#ef4444' };
        if (level === 'medium') return { bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.18)', text: '#f59e0b' };
        return { bg: 'rgba(34,197,94,0.06)', border: 'rgba(34,197,94,0.18)', text: '#22c55e' };
    };

    const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
        { key: 'pending', label: 'Pending', icon: <History size={14} /> },
        { key: 'approved', label: 'Approved', icon: <CheckCircle2 size={14} /> },
        { key: 'denied', label: 'Denied', icon: <XCircle size={14} /> },
    ];

    return (
        <div style={{ maxWidth: 1100, margin: "0 auto", paddingBottom: 60 }}>
            {/* header */}
            <div style={{ marginBottom: 24 }}>
                <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Agent Payroll</h2>
                <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>
                    Review, approve, or deny agent spending transactions with real-time budget visibility.
                </p>
            </div>

            {/* budget summary cards */}
            {Object.keys(agents).length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginBottom: 24 }}>
                    {Object.entries(agents).slice(0, 6).map(([id, a]) => {
                        const pct = a.dailyLimit > 0 ? Math.min(100, (a.todaySpent / a.dailyLimit) * 100) : 0;
                        const barColor = pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#22c55e';
                        return (
                            <div key={id} className="chart-card" style={{ padding: 14 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                    <Gauge size={13} style={{ color: barColor }} />
                                    <span style={{ fontSize: 12, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>
                                    <span>{fmt(a.todaySpent)} spent</span>
                                    <span>{fmt(a.dailyLimit)} limit</span>
                                </div>
                                <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 2, transition: 'width 0.4s ease' }} />
                                </div>
                                <div style={{ fontSize: 10, color: barColor, marginTop: 4, fontWeight: 600 }}>
                                    {fmt(Math.max(0, a.remaining))} remaining
                                    {a.perTxLimit > 0 && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> • max {fmt(a.perTxLimit)}/tx</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* tab bar */}
            <div style={{ display: 'flex', gap: 2, marginBottom: 20, background: 'var(--bg-secondary)', borderRadius: 8, padding: 3 }}>
                {tabs.map(t => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        style={{
                            flex: 1, padding: '10px 0', borderRadius: 6, border: 'none', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            fontSize: 13, fontWeight: tab === t.key ? 700 : 500,
                            background: tab === t.key ? 'var(--bg-body)' : 'transparent',
                            color: tab === t.key ? 'var(--text)' : 'var(--text-muted)',
                            boxShadow: tab === t.key ? 'var(--shadow-soft)' : 'none',
                            transition: 'all 0.15s ease',
                        }}
                    >
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {/* toast */}
            {toast && (
                <div style={{
                    position: 'fixed', bottom: 24, right: 24, zIndex: 999,
                    padding: '12px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                    background: toast.type === 'ok' ? '#22c55e' : '#ef4444', color: '#fff',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    animation: 'slideUp 0.3s ease',
                }}>
                    <style>{`@keyframes slideUp { from { translate: 0 20px; opacity: 0; } to { translate: 0 0; opacity: 1; } }`}</style>
                    {toast.msg}
                </div>
            )}

            {/* content */}
            <div className="chart-card" style={{ padding: 0, overflow: 'hidden' }}>
                {/* toolbar for pending tab */}
                {tab === 'pending' && txs.length > 0 && (
                    <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '10px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', color: 'var(--text-muted)' }}>
                                <input type="checkbox" checked={selected.size === txs.length && txs.length > 0} onChange={selectAll} style={{ accentColor: 'var(--primary)' }} />
                                Select All ({txs.length})
                            </label>
                            {selected.size > 0 && (
                                <span style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>
                                    {selected.size} selected
                                </span>
                            )}
                        </div>
                        {selected.size > 0 && (
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                    onClick={() => handleAction([...selected], 'approved')}
                                    disabled={acting !== null}
                                    style={{
                                        padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700,
                                        background: '#22c55e', color: '#000', border: 'none', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: 4,
                                        opacity: acting ? 0.6 : 1,
                                    }}
                                >
                                    {acting === 'approved' ? <Loader2 size={12} style={{ animation: 'spin 1s infinite linear' }} /> : <CheckCircle2 size={12} />}
                                    Approve ({selected.size})
                                </button>
                                <button
                                    onClick={() => handleAction([...selected], 'denied')}
                                    disabled={acting !== null}
                                    style={{
                                        padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700,
                                        background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: 4,
                                        opacity: acting ? 0.6 : 1,
                                    }}
                                >
                                    {acting === 'denied' ? <Loader2 size={12} style={{ animation: 'spin 1s infinite linear' }} /> : <XCircle size={12} />}
                                    Deny ({selected.size})
                                </button>
                                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                            </div>
                        )}
                    </div>
                )}

                {/* header row */}
                <div style={{
                    display: 'grid', gridTemplateColumns: tab === 'pending' ? '36px 1fr 140px 140px 100px 180px' : '1fr 140px 140px 100px 160px',
                    padding: '10px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)',
                    fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)',
                }}>
                    {tab === 'pending' && <div />}
                    <div>Agent</div>
                    <div style={{ textAlign: 'right' }}>Amount</div>
                    <div style={{ textAlign: 'right' }}>Budget</div>
                    <div style={{ textAlign: 'center' }}>Risk</div>
                    <div style={{ textAlign: 'right' }}>{tab === 'pending' ? 'Actions' : 'Date'}</div>
                </div>

                {/* loading */}
                {loading && (
                    <div style={{ padding: 48, textAlign: 'center' }}>
                        <Loader2 size={24} style={{ animation: 'spin 1s infinite linear', color: 'var(--text-muted)' }} />
                        <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-muted)' }}>Loading transactions...</div>
                    </div>
                )}

                {/* error */}
                {err && !loading && (
                    <div style={{ padding: 48, textAlign: 'center' }}>
                        <AlertTriangle size={28} style={{ color: '#ef4444' }} />
                        <div style={{ marginTop: 8, fontSize: 13, color: '#ef4444' }}>Failed to load: {err}</div>
                        <button onClick={fetchData} style={{
                            marginTop: 12, padding: '6px 16px', borderRadius: 6, fontSize: 12,
                            background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer',
                        }}>
                            <RefreshCcw size={12} style={{ marginRight: 4 }} /> Retry
                        </button>
                    </div>
                )}

                {/* empty state */}
                {!loading && !err && txs.length === 0 && (
                    <div style={{ padding: 64, textAlign: 'center', opacity: 0.5 }}>
                        <ShieldCheck size={36} />
                        <div style={{ marginTop: 8, fontSize: 14, fontWeight: 600 }}>No {tab} transactions</div>
                        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                            {tab === 'pending' ? 'All clear — nothing needs your review.' : `No ${tab} transactions to show.`}
                        </p>
                    </div>
                )}

                {/* transaction rows */}
                {!loading && !err && txs.map(tx => {
                    const agent = agents[tx.agent_id];
                    const risk = riskLevel(tx, agent);
                    const rc = riskColor(risk);
                    const isExpanded = expandedTx === tx.id;

                    return (
                        <div key={tx.id}>
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: tab === 'pending' ? '36px 1fr 140px 140px 100px 180px' : '1fr 140px 140px 100px 160px',
                                    padding: '12px 20px', alignItems: 'center',
                                    borderBottom: '1px solid var(--border)',
                                    background: selected.has(tx.id) ? 'rgba(59,130,246,0.04)' : 'transparent',
                                    transition: 'background 0.15s ease',
                                    cursor: 'pointer',
                                }}
                                onClick={() => setExpandedTx(isExpanded ? null : tx.id)}
                            >
                                {tab === 'pending' && (
                                    <div onClick={e => { e.stopPropagation(); toggleSelect(tx.id); }}>
                                        <input type="checkbox" checked={selected.has(tx.id)} readOnly style={{ accentColor: 'var(--primary)', cursor: 'pointer' }} />
                                    </div>
                                )}

                                {/* agent */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <User size={14} style={{ color: rc.text, flexShrink: 0 }} />
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 600 }}>{agent?.name || tx.agent_id}</div>
                                        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                            {tx.id.slice(0, 8)}...
                                        </div>
                                    </div>
                                </div>

                                {/* amount */}
                                <div style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, fontSize: 14 }}>
                                    {fmt(tx.amount)}
                                </div>

                                {/* budget */}
                                <div style={{ textAlign: 'right' }}>
                                    {agent ? (
                                        <>
                                            <div style={{ fontSize: 12, fontWeight: 600 }}>{fmt(Math.max(0, agent.remaining))}</div>
                                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>of {fmt(agent.dailyLimit)}</div>
                                        </>
                                    ) : (
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
                                    )}
                                </div>

                                {/* risk badge */}
                                <div style={{ textAlign: 'center' }}>
                                    <span style={{
                                        display: 'inline-block', padding: '2px 10px', borderRadius: 4,
                                        fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                                        background: rc.bg, color: rc.text, border: `1px solid ${rc.border}`,
                                    }}>
                                        {risk}
                                    </span>
                                </div>

                                {/* actions or date */}
                                <div style={{ textAlign: 'right' }}>
                                    {tab === 'pending' ? (
                                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
                                            <button
                                                onClick={() => handleAction([tx.id], 'approved')}
                                                disabled={acting !== null}
                                                style={{
                                                    padding: '5px 12px', borderRadius: 5, fontSize: 11, fontWeight: 700,
                                                    background: '#22c55e', color: '#000', border: 'none', cursor: 'pointer',
                                                    opacity: acting ? 0.5 : 1,
                                                }}
                                            >
                                                {acting === tx.id ? '...' : 'Approve'}
                                            </button>
                                            <button
                                                onClick={() => handleAction([tx.id], 'denied')}
                                                disabled={acting !== null}
                                                style={{
                                                    padding: '5px 12px', borderRadius: 5, fontSize: 11, fontWeight: 700,
                                                    background: 'transparent', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)', cursor: 'pointer',
                                                    opacity: acting ? 0.5 : 1,
                                                }}
                                            >
                                                Deny
                                            </button>
                                        </div>
                                    ) : (
                                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                            {new Date(tx.created_at).toLocaleDateString()}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* expanded detail */}
                            {isExpanded && (
                                <div style={{
                                    padding: '12px 20px 12px 56px', borderBottom: '1px solid var(--border)',
                                    background: 'var(--bg-secondary)', fontSize: 12, color: 'var(--text-muted)',
                                    display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16,
                                    animation: 'fadeIn 0.2s ease',
                                }}>
                                    <style>{`@keyframes fadeIn { from { opacity:0; translate: 0 -4px; } to { opacity:1; translate: 0 0; } }`}</style>
                                    <div>
                                        <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>Transaction ID</div>
                                        <div style={{ fontFamily: 'monospace', fontSize: 11 }}>{tx.id}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>Target</div>
                                        <div style={{ fontSize: 11 }}>{tx.target_url || '—'}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>Verdict</div>
                                        <div style={{ fontSize: 11 }}>{tx.verdict_reason || tx.denial_reason || '—'}</div>
                                    </div>
                                    {agent && (
                                        <>
                                            <div>
                                                <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>Per-TX Limit</div>
                                                <div>{fmt(agent.perTxLimit)}</div>
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>Today's Spend</div>
                                                <div>{fmt(agent.todaySpent)}</div>
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>Remaining Budget</div>
                                                <div style={{ color: agent.remaining < tx.amount ? '#ef4444' : '#22c55e', fontWeight: 600 }}>
                                                    {fmt(Math.max(0, agent.remaining))}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* refresh footer */}
                {!loading && !err && txs.length > 0 && (
                    <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'center' }}>
                        <button
                            onClick={fetchData}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '6px 16px', borderRadius: 6, fontSize: 12,
                                background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)',
                                cursor: 'pointer', fontWeight: 500,
                            }}
                        >
                            <RefreshCcw size={12} /> Refresh
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
