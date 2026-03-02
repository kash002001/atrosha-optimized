"use client";

import { useState, useTransition } from "react";
import { X, Play, Loader2, ShieldCheck, ShieldX } from "lucide-react";
import { testRule } from "./actions";

interface TestPanelProps {
    ruleId: string;
    ruleText: string;
    onClose: () => void;
}

export default function TestPanel({ ruleId, ruleText, onClose }: TestPanelProps) {
    const [payload, setPayload] = useState(
        '{"transaction":{"amount":5000,"destination":"api.openai.com","intent":"process payment"}}'
    );
    const [result, setResult] = useState<{ verdict: string; confidence: number; source: string; reason: string; latency_ms: number } | null>(null);
    const [err, setErr] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const run = () => {
        setErr(null);
        setResult(null);
        startTransition(async () => {
            try {
                const res = await testRule(payload);
                setResult(res);
            } catch (e: any) {
                setErr(e.message || "Test failed");
            }
        });
    };

    const isDeny = result?.verdict === "DENY";

    return (
        <div style={{
            position: "fixed", top: 0, right: 0, bottom: 0, width: 440,
            background: "var(--bg-card)", borderLeft: "1px solid var(--border)",
            zIndex: 100, padding: 24, overflowY: "auto",
            boxShadow: "-8px 0 32px rgba(0,0,0,0.35)",
            animation: "slideIn 0.2s ease-out",
            display: "flex", flexDirection: "column", gap: 16,
        }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                    <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Test Rule</h3>
                    <p style={{ fontSize: 11, color: "var(--text-dim)", margin: "4px 0 0", lineHeight: 1.4 }}>{ruleText}</p>
                </div>
                <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4 }}>
                    <X size={18} />
                </button>
            </div>

            <div>
                <label style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, display: "block" }}>
                    Sample Payload (JSON)
                </label>
                <textarea
                    value={payload}
                    onChange={(e) => setPayload(e.target.value)}
                    rows={8}
                    style={{
                        width: "100%", padding: 12,
                        background: "rgba(0,0,0,0.3)",
                        border: "1px solid var(--border)", borderRadius: 6,
                        color: "var(--text)", fontSize: 12,
                        fontFamily: "var(--font-mono, monospace)",
                        resize: "vertical", outline: "none", boxSizing: "border-box",
                    }}
                />
            </div>

            <button
                onClick={run}
                disabled={isPending}
                style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    padding: "10px 0",
                    borderRadius: "var(--radius-sm)", border: "none",
                    background: "var(--primary)", color: "#fff",
                    fontSize: 13, fontWeight: 600, cursor: "pointer",
                    opacity: isPending ? 0.7 : 1,
                }}
            >
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                {isPending ? "Running..." : "Run Test"}
            </button>

            {err && (
                <div style={{ padding: 12, borderRadius: 6, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", fontSize: 12, color: "var(--red)" }}>
                    {err}
                </div>
            )}

            {result && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 4 }}>
                    <div style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "14px 16px", borderRadius: 8,
                        background: isDeny ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)",
                        border: `1px solid ${isDeny ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.2)"}`,
                    }}>
                        {isDeny ? <ShieldX size={20} style={{ color: "var(--red)" }} /> : <ShieldCheck size={20} style={{ color: "var(--green)" }} />}
                        <div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: isDeny ? "var(--red)" : "var(--green)" }}>
                                {result.verdict}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
                                {result.source} · {Math.round(result.confidence * 100)}% confidence · {result.latency_ms}ms
                            </div>
                        </div>
                    </div>

                    <div>
                        <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Reason</div>
                        <div style={{ fontSize: 13, color: "var(--text)" }}>{result.reason || "—"}</div>
                    </div>
                </div>
            )}
        </div>
    );
}
