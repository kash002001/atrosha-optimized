"use client";

import { useState, useCallback } from "react";
import { Upload, FileText, CheckCircle2, AlertTriangle, ShieldCheck, Layers } from "lucide-react";

interface BatchResult {
    file_name: string;
    status: 'uploading' | 'parsing' | 'success' | 'review' | 'error';
    invoice?: { vendor: string; amount: number; currency: string };
    auto_approved?: boolean;
    session_id?: string;
    message?: string;
}

export default function BatchClient() {
    const [isDragging, setIsDragging] = useState(false);
    const [results, setResults] = useState<BatchResult[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files).filter(f => f.type === "application/pdf");
        if (files.length === 0) return;
        processFiles(files);
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        const files = Array.from(e.target.files).filter(f => f.type === "application/pdf");
        if (files.length === 0) return;
        processFiles(files);
    };

    const processFiles = async (files: File[]) => {
        if (files.length > 50) { alert("Maximum 50 files allowed per batch."); return; }
        setIsProcessing(true);

        const initial: BatchResult[] = files.map(f => ({ file_name: f.name, status: 'parsing' }));
        setResults(prev => [...prev, ...initial]);

        // simulate OCR for each file sequentially
        await new Promise(r => setTimeout(r, 2000));

        setResults(prev => {
            const updated = [...prev];
            updated.forEach((r, i) => {
                if (r.status !== 'parsing') return;
                const amount = Math.round((200 + Math.random() * 8000) * 100) / 100;
                const vendor = r.file_name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
                const autoApprove = amount < 5000;
                updated[i] = {
                    ...r,
                    status: autoApprove ? 'success' : 'review',
                    invoice: { vendor, amount, currency: "USD" },
                    auto_approved: autoApprove,
                    session_id: "sess_" + Math.random().toString(36).substring(2, 10),
                    message: autoApprove ? "Below $5,000 — auto-approved by policy" : "Above threshold — manual review required",
                };
            });
            return updated;
        });
        setIsProcessing(false);
    };

    const handleAuthorize = async (index: number) => {
        setResults(prev => {
            const n = [...prev];
            n[index] = { ...n[index], status: 'uploading' };
            return n;
        });
        await new Promise(r => setTimeout(r, 1000));
        setResults(prev => {
            const n = [...prev];
            n[index] = { ...n[index], status: 'success', message: "Authorized manually" };
            return n;
        });
    };

    const updateInvoiceField = (index: number, field: string, value: any) => {
        setResults(prev => {
            const n = [...prev];
            if (n[index].invoice) (n[index].invoice as any)[field] = value;
            return n;
        });
    };

    return (
        <div style={{ maxWidth: 1000, margin: "0 auto", paddingBottom: 60 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
                <div style={{ padding: 10, background: "var(--bg-secondary)", borderRadius: 8, border: "1px solid var(--border)" }}>
                    <Layers size={24} style={{ color: "var(--primary)" }} />
                </div>
                <div>
                    <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Batch Processing</h2>
                    <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>Process multiple invoices at once with zero-knowledge OCR</p>
                </div>
            </div>

            <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                style={{
                    border: `2px dashed ${isDragging ? "var(--primary)" : "var(--border)"}`,
                    background: isDragging ? "var(--bg-secondary)" : "var(--bg-card)",
                    borderRadius: "var(--radius-lg)",
                    padding: "60px 20px",
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    marginBottom: 32,
                    position: "relative"
                }}
            >
                <input
                    type="file" multiple accept=".pdf"
                    onChange={handleFileSelect}
                    style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
                    disabled={isProcessing}
                />
                <div style={{ background: "var(--bg-secondary)", width: 64, height: 64, borderRadius: 32, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                    <Upload size={28} style={{ color: "var(--text-muted)" }} />
                </div>
                <h3 style={{ margin: "0 0 8px" }}>Drop PDF Invoices Here</h3>
                <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 14 }}>or click to browse multiple files</p>
            </div>

            {results.length > 0 && (
                <div className="chart-card" style={{ padding: 0, overflow: "hidden" }}>
                    <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-secondary)" }}>
                        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-dim)" }}>
                            Processing Queue ({results.length})
                        </h3>
                    </div>
                    <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}>
                                <th style={{ padding: "12px 24px", textAlign: "left", fontSize: 12, color: "var(--text-muted)", width: "30%" }}>File</th>
                                <th style={{ padding: "12px 24px", textAlign: "left", fontSize: 12, color: "var(--text-muted)", width: "25%" }}>Extracted Data</th>
                                <th style={{ padding: "12px 24px", textAlign: "left", fontSize: 12, color: "var(--text-muted)" }}>Status</th>
                                <th style={{ padding: "12px 24px", textAlign: "right", fontSize: 12, color: "var(--text-muted)" }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.map((r, i) => (
                                <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                                    <td style={{ padding: "16px 24px", fontSize: 13, color: "var(--text-muted)", verticalAlign: "top" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <FileText size={14} />
                                            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: 220 }}>
                                                {r.file_name}
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ padding: "16px 24px", verticalAlign: "top" }}>
                                        {r.status === 'parsing' ? (
                                            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Processing OCR...</span>
                                        ) : r.invoice ? (
                                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                                <input
                                                    value={r.invoice.vendor}
                                                    onChange={e => updateInvoiceField(i, "vendor", e.target.value)}
                                                    disabled={r.status === 'success'}
                                                    style={{ padding: "4px 8px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--text)", fontSize: 13 }}
                                                />
                                                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                                    <span style={{ color: "var(--text-muted)", fontSize: 13 }}>$</span>
                                                    <input
                                                        type="number"
                                                        value={r.invoice.amount}
                                                        onChange={e => updateInvoiceField(i, "amount", parseFloat(e.target.value) || 0)}
                                                        disabled={r.status === 'success'}
                                                        style={{ padding: "4px 8px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--text)", fontSize: 13, width: "100%" }}
                                                    />
                                                </div>
                                            </div>
                                        ) : null}
                                    </td>
                                    <td style={{ padding: "16px 24px", verticalAlign: "top" }}>
                                        {r.status === 'success' && r.auto_approved ? (
                                            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--green)" }}>
                                                <ShieldCheck size={16} /> <span style={{ fontSize: 13, fontWeight: 500 }}>Auto-Approved</span>
                                            </div>
                                        ) : r.status === 'success' ? (
                                            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--green)" }}>
                                                <CheckCircle2 size={16} /> <span style={{ fontSize: 13, fontWeight: 500 }}>Signed & Locked</span>
                                            </div>
                                        ) : r.status === 'review' ? (
                                            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#f59e0b" }}>
                                                <AlertTriangle size={16} /> <span style={{ fontSize: 13, fontWeight: 500 }}>Needs Review</span>
                                            </div>
                                        ) : r.status === 'error' ? (
                                            <div style={{ color: "var(--red)", fontSize: 13 }}>{r.message || "Failed"}</div>
                                        ) : (
                                            <div style={{ color: "var(--text-muted)", fontSize: 13 }}>{r.status}...</div>
                                        )}
                                        {r.message && r.status !== 'error' && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{r.message}</div>}
                                    </td>
                                    <td style={{ padding: "16px 24px", textAlign: "right", verticalAlign: "top" }}>
                                        {r.status === 'review' && (
                                            <button
                                                onClick={() => handleAuthorize(i)}
                                                className="btn-primary"
                                                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", fontSize: 12, borderRadius: 4 }}
                                            >
                                                Sign & Lock
                                            </button>
                                        )}
                                        {r.status === 'success' && (
                                            <button
                                                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", fontSize: 12, borderRadius: 4, opacity: 0.5, cursor: "not-allowed", background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
                                                disabled
                                            >
                                                Locked
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
    );
}
