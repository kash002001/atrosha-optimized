"use client";

import { useState } from "react";
import { CheckCircle2, FileText, Lock, AlertTriangle, Play } from "lucide-react";

export default function APClient() {
    const [invoices, setInvoices] = useState([
        { id: "INV-1029", vendor: "Cloudflare Inc.", amount: 500.00, status: "pending", date: "2026-03-05" },
        { id: "INV-1030", vendor: "OpenAI", amount: 25000.00, status: "pending", date: "2026-03-04" },
    ]);

    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const [signing, setSigning] = useState(false);
    const [signatureResult, setSignatureResult] = useState<any>(null);

    const handleSignIntent = async () => {
        setSigning(true);
        // Simulate hardware-backed cryptography logic
        setTimeout(() => {
            const mockSessionId = "sess_" + Math.random().toString(36).substring(2, 9);
            const intentStr = `I authorize the payment of $${selectedInvoice.amount} to ${selectedInvoice.vendor}.`;

            setSignatureResult({
                intent: intentStr,
                sessionId: mockSessionId,
                status: "Locked",
                signature: "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")
            });

            // Re-render invoice status
            setInvoices(invoices.map(inv =>
                inv.id === selectedInvoice.id ? { ...inv, status: "authorized" } : inv
            ));

            setSigning(false);
        }, 1500);
    };

    return (
        <div className="ap-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            {/* Left Col: Queue */}
            <div className="card">
                <div className="card-header">
                    <h2>Pending Invoices</h2>
                </div>
                <div className="invoice-list">
                    {invoices.map(inv => (
                        <div
                            key={inv.id}
                            style={{
                                padding: '1rem',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                marginBottom: '1rem',
                                cursor: 'pointer',
                                background: selectedInvoice?.id === inv.id ? 'var(--bg-hover)' : 'transparent',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}
                            onClick={() => setSelectedInvoice(inv)}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <FileText className="text-muted" size={24} />
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1rem' }}>{inv.vendor}</h3>
                                    <span className="text-muted" style={{ fontSize: '0.875rem' }}>{inv.id} • {inv.date}</span>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>${inv.amount.toFixed(2)}</div>
                                <span className={`badge ${inv.status === 'authorized' ? 'badge-success' : 'badge-warning'}`}>
                                    {inv.status}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Col: Signing UI */}
            <div className="card">
                <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Lock size={20} className="text-primary" />
                    <h2>Intent Authorization</h2>
                </div>

                {selectedInvoice ? (
                    <div style={{ padding: '1rem 0' }}>
                        <div style={{ background: 'var(--bg-document)', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <span className="text-muted">Payee</span>
                                <strong style={{ color: 'var(--text-primary)' }}>{selectedInvoice.vendor}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <span className="text-muted">Amount</span>
                                <strong style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>${selectedInvoice.amount.toFixed(2)}</strong>
                            </div>

                            <hr style={{ borderColor: 'var(--border)', margin: '1rem 0' }} />

                            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                <AlertTriangle size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-2px' }} />
                                Signing this intent will bind the Agent's execution to this mathematical constraint via Atrosha Kernel.
                            </p>
                        </div>

                        {!signatureResult || selectedInvoice.status !== 'authorized' ? (
                            <button
                                className="btn-primary"
                                style={{ width: '100%', padding: '1rem' }}
                                onClick={handleSignIntent}
                                disabled={signing}
                            >
                                {signing ? "Generating Hardware Proof..." : "Sign & Authorize Intent"}
                            </button>
                        ) : (
                            <div className="card" style={{ background: 'var(--bg-success-light)', border: '1px solid var(--border-success)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-success)', marginBottom: '1rem' }}>
                                    <CheckCircle2 size={20} />
                                    <strong>Intent Locked Cryptographically</strong>
                                </div>

                                <div className="code-block" style={{ fontSize: '0.75rem', marginBottom: '1rem' }}>
                                    Session ID: {signatureResult.sessionId}<br />
                                    Intent: "{signatureResult.intent}"<br />
                                    Sig_Ed25519: {signatureResult.signature.substring(0, 32)}...
                                </div>

                                <button className="btn-secondary" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                                    <Play size={16} />
                                    Deploy Sovereign Agent
                                </button>
                            </div>
                        )}

                    </div>
                ) : (
                    <div className="empty-state" style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Select an invoice from the queue to review and sign.
                    </div>
                )}
            </div>
        </div>
    );
}
