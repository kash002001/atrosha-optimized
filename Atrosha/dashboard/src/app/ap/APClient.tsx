"use client";

import { useState, useCallback } from "react";
import { CheckCircle2, FileText, Lock, AlertTriangle, Play, Upload, Loader2, Edit3, X } from "lucide-react";

interface Invoice {
    vendor: string;
    amount: number;
    currency: string;
    due_date: string | null;
    invoice_number: string | null;
    confidence: "high" | "medium" | "low";
    source: string;
}

type Step = "upload" | "review" | "sign" | "execute" | "done";

export default function APClient() {
    const [step, setStep] = useState<Step>("upload");
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [sessionId, setSessionId] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [result, setResult] = useState<Record<string, string> | null>(null);
    const [dragOver, setDragOver] = useState(false);

    const [editVendor, setEditVendor] = useState("");
    const [editAmount, setEditAmount] = useState("");

    // simulated OCR parse from filename
    const handleUpload = useCallback(async (file: File) => {
        setLoading(true);
        setError("");
        await new Promise(r => setTimeout(r, 1500));

        const name = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
        const amount = Math.round((500 + Math.random() * 4500) * 100) / 100;
        const inv: Invoice = {
            vendor: name.length > 3 ? name : "Acme Corp",
            amount,
            currency: "USD",
            due_date: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
            invoice_number: `INV-${Date.now().toString(36).toUpperCase()}`,
            confidence: amount > 3000 ? "medium" : "high",
            source: "pdf-ocr",
        };
        setInvoice(inv);
        setEditVendor(inv.vendor);
        setEditAmount(String(inv.amount));
        setStep("review");
        setLoading(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file?.name.toLowerCase().endsWith(".pdf")) handleUpload(file);
        else setError("only PDF files accepted");
    }, [handleUpload]);

    const handleAuthorize = async () => {
        setLoading(true);
        setError("");
        const sid = "sess_" + Math.random().toString(36).substring(2, 10);
        // simulate authorization delay
        await new Promise(r => setTimeout(r, 1200));
        setSessionId(sid);
        setStep("sign");
        setLoading(false);
    };

    const handleExecute = async () => {
        setLoading(true);
        setError("");
        // simulate execution delay
        await new Promise(r => setTimeout(r, 2000));
        setResult({
            status: "confirmed",
            tx_ref: "ch_" + Math.random().toString(36).substring(2, 14),
            idempotency_key: "idem_" + Math.random().toString(36).substring(2, 10),
        });
        setStep("done");
        setLoading(false);
    };

    const reset = () => {
        setStep("upload");
        setInvoice(null);
        setSessionId("");
        setResult(null);
        setError("");
    };

    const confColor = (c: string) => c === "high" ? "var(--green, #22c55e)" : c === "medium" ? "#f59e0b" : "var(--red, #ef4444)";

    return (
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
            {error && (
                <div style={{
                    background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                    borderRadius: 8, padding: "12px 16px", marginBottom: 20,
                    display: "flex", alignItems: "center", gap: 8, color: "#ef4444", fontSize: 13,
                }}>
                    <AlertTriangle size={16} />
                    {error}
                    <button onClick={() => setError("")} style={{ marginLeft: "auto", background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}>
                        <X size={14} />
                    </button>
                </div>
            )}

            {step === "upload" && (
                <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    style={{
                        border: `2px dashed ${dragOver ? "var(--primary, #3b82f6)" : "var(--border, #333)"}`,
                        borderRadius: 12, padding: "4rem 2rem", textAlign: "center",
                        background: dragOver ? "rgba(59,130,246,0.05)" : "var(--bg-card, #1a1a1a)",
                        transition: "all 0.2s ease", cursor: "pointer",
                    }}
                    onClick={() => {
                        const input = document.createElement("input");
                        input.type = "file";
                        input.accept = ".pdf";
                        input.onchange = (e) => {
                            const f = (e.target as HTMLInputElement).files?.[0];
                            if (f) handleUpload(f);
                        };
                        input.click();
                    }}
                >
                    {loading ? (
                        <Loader2 size={40} className="animate-spin" style={{ color: "var(--primary, #3b82f6)", margin: "0 auto" }} />
                    ) : (
                        <>
                            <Upload size={40} style={{ color: "var(--text-muted, #888)", margin: "0 auto 1rem" }} />
                            <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Drop an invoice PDF here</p>
                            <p style={{ fontSize: 13, color: "var(--text-muted, #888)" }}>or click to browse — processed entirely on-device</p>
                        </>
                    )}
                </div>
            )}

            {step === "review" && invoice && (
                <div className="card" style={{ padding: "1.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                        <Edit3 size={18} style={{ color: "var(--primary, #3b82f6)" }} />
                        <h3 style={{ margin: 0, fontSize: 16 }}>Review Extracted Data</h3>
                        <span style={{
                            marginLeft: "auto", fontSize: 11, fontWeight: 600, padding: "2px 8px",
                            borderRadius: 4, color: confColor(invoice.confidence),
                            background: `${confColor(invoice.confidence)}15`, border: `1px solid ${confColor(invoice.confidence)}40`,
                        }}>
                            {invoice.confidence} confidence ({invoice.source})
                        </span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        <div>
                            <label style={{ fontSize: 11, color: "var(--text-muted, #888)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, display: "block" }}>Vendor</label>
                            <input
                                value={editVendor} onChange={(e) => setEditVendor(e.target.value)}
                                style={{
                                    width: "100%", padding: "10px 12px", background: "var(--bg-card, #1a1a1a)",
                                    border: "1px solid var(--border, #333)", borderRadius: 6,
                                    color: "var(--text, #fff)", fontSize: 14,
                                }}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: 11, color: "var(--text-muted, #888)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, display: "block" }}>Amount (USD)</label>
                            <input
                                type="number" step="0.01" value={editAmount} onChange={(e) => setEditAmount(e.target.value)}
                                style={{
                                    width: "100%", padding: "10px 12px", background: "var(--bg-card, #1a1a1a)",
                                    border: "1px solid var(--border, #333)", borderRadius: 6,
                                    color: "var(--text, #fff)", fontSize: 14,
                                }}
                            />
                        </div>
                        {invoice.due_date && (
                            <div>
                                <label style={{ fontSize: 11, color: "var(--text-muted, #888)", textTransform: "uppercase", letterSpacing: 1 }}>Due Date</label>
                                <div style={{ fontSize: 14, color: "var(--text, #fff)", marginTop: 4 }}>{invoice.due_date}</div>
                            </div>
                        )}
                    </div>

                    <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
                        <button onClick={reset} style={{
                            flex: 1, padding: "10px", borderRadius: 6, border: "1px solid var(--border, #333)",
                            background: "transparent", color: "var(--text-muted, #888)", cursor: "pointer", fontSize: 13,
                        }}>Cancel</button>
                        <button onClick={handleAuthorize} disabled={loading || !editVendor || !editAmount} style={{
                            flex: 2, padding: "10px", borderRadius: 6, border: "none",
                            background: "var(--primary, #3b82f6)", color: "#fff", cursor: "pointer",
                            fontSize: 13, fontWeight: 600, opacity: loading ? 0.6 : 1,
                        }}>
                            {loading ? "Authorizing..." : "Approve & Sign Intent"}
                        </button>
                    </div>
                </div>
            )}

            {step === "sign" && (
                <div className="card" style={{ padding: "1.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                        <Lock size={18} style={{ color: "var(--green, #22c55e)" }} />
                        <h3 style={{ margin: 0, fontSize: 16 }}>Intent Locked Cryptographically</h3>
                    </div>

                    <div style={{ background: "rgba(0,0,0,0.2)", padding: 16, borderRadius: 8, fontSize: 12, fontFamily: "monospace", marginBottom: 20, border: "1px solid var(--border, #333)" }}>
                        <div>Session: {sessionId}</div>
                        <div>Intent: &quot;Pay {editVendor} ${parseFloat(editAmount).toFixed(2)} USD&quot;</div>
                        <div>Status: <span style={{ color: "var(--green, #22c55e)" }}>AUTHORIZED</span></div>
                    </div>

                    <p style={{ fontSize: 13, color: "var(--text-muted, #888)", marginBottom: 20 }}>
                        <AlertTriangle size={14} style={{ display: "inline", verticalAlign: "-2px", marginRight: 4 }} />
                        The Atrosha Kernel will mathematically verify this payment matches the signed intent before execution.
                    </p>

                    <div style={{ display: "flex", gap: 12 }}>
                        <button onClick={reset} style={{
                            flex: 1, padding: "10px", borderRadius: 6, border: "1px solid var(--border, #333)",
                            background: "transparent", color: "var(--text-muted, #888)", cursor: "pointer", fontSize: 13,
                        }}>Cancel</button>
                        <button onClick={handleExecute} disabled={loading} style={{
                            flex: 2, padding: "10px", borderRadius: 6, border: "none",
                            background: "var(--green, #22c55e)", color: "#000", cursor: "pointer",
                            fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                            opacity: loading ? 0.6 : 1,
                        }}>
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                            {loading ? "Executing..." : "Deploy Sovereign Agent"}
                        </button>
                    </div>
                </div>
            )}

            {step === "done" && result && (
                <div className="card" style={{ padding: "1.5rem" }}>
                    <div style={{
                        display: "flex", alignItems: "center", gap: 8, marginBottom: 20,
                        color: result.status === "confirmed" ? "var(--green, #22c55e)" : "var(--red, #ef4444)",
                    }}>
                        {result.status === "confirmed" ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
                        <h3 style={{ margin: 0, fontSize: 16 }}>
                            {result.status === "confirmed" ? "Payment Executed" : `Payment ${result.status}`}
                        </h3>
                    </div>

                    <div style={{ background: "rgba(0,0,0,0.2)", padding: 16, borderRadius: 8, fontSize: 12, fontFamily: "monospace", marginBottom: 20, border: "1px solid var(--border, #333)" }}>
                        {result.tx_ref && <div>TX Ref: {result.tx_ref}</div>}
                        <div>Status: {result.status}</div>
                        {result.reason && <div>Reason: {result.reason}</div>}
                        {result.idempotency_key && <div>Idempotency: {result.idempotency_key}</div>}
                    </div>

                    <button onClick={reset} style={{
                        width: "100%", padding: "10px", borderRadius: 6, border: "1px solid var(--border, #333)",
                        background: "transparent", color: "var(--text, #fff)", cursor: "pointer", fontSize: 13,
                    }}>
                        <FileText size={14} style={{ display: "inline", verticalAlign: "-2px", marginRight: 6 }} />
                        Process Another Invoice
                    </button>
                </div>
            )}
        </div>
    );
}
