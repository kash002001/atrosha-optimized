"use client";

import { useState } from "react";
import { Copy, RefreshCw, Eye, EyeOff, Check, Code, Server } from "lucide-react";

export default function DevelopersPage() {
    const [apiKey, setApiKey] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [showKey, setShowKey] = useState(false);
    const [copied, setCopied] = useState(false);

    const regenerateKey = async () => {
        if (!confirm("Are you sure? This will INVALIDATE your old key immediately.")) return;

        setLoading(true);
        try {
            const res = await fetch("/api/auth/regenerate-key", { method: "POST" });
            const data = await res.json();
            if (data.api_key) {
                setApiKey(data.api_key);
                setShowKey(true);
            } else {
                alert("Failed to generate key: " + data.error);
            }
        } catch {
            alert("Error generating key");
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 40 }}>
            <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div>
                    <h2>Developer Console</h2>
                    <p>Manage API keys and integration settings.</p>
                </div>

            </div>

            <div className="dev-grid">
                {/* Left Column */}
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

                    {/* API Credentials Card */}
                    <div className="chart-card">
                        <h3>
                            API Authority
                            <span>Root Credentials</span>
                        </h3>

                        <div style={{ background: "var(--bg-secondary)", padding: 20, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                            <label style={{ display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8, letterSpacing: "0.5px" }}>
                                Secret Key
                            </label>
                            <div style={{ display: "flex", gap: 8 }}>
                                <div style={{
                                    flex: 1,
                                    background: "#fff",
                                    border: "1px solid var(--border)",
                                    borderRadius: "var(--radius-sm)",
                                    padding: "10px 12px",
                                    fontFamily: "monospace",
                                    fontSize: 13,
                                    color: "var(--text)",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center"
                                }}>
                                    <span style={{ color: !showKey && !apiKey ? "var(--text-dim)" : "var(--text)" }}>
                                        {apiKey ? (
                                            showKey ? apiKey : "sk_live_" + "•".repeat(24)
                                        ) : (
                                            "sk_live_••••••••••••••••••••••••••••••••"
                                        )}
                                    </span>
                                    {apiKey && (
                                        <div style={{ display: "flex", gap: 4 }}>
                                            <button onClick={() => setShowKey(!showKey)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                                                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                                            </button>
                                            <button onClick={() => copyToClipboard(apiKey)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                                                {copied ? <Check size={14} color="var(--green)" /> : <Copy size={14} />}
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={regenerateKey}
                                    disabled={loading}
                                    style={{
                                        background: "var(--red-bg)",
                                        color: "var(--red)",
                                        border: "1px solid rgba(220, 38, 38, 0.1)",
                                        borderRadius: "var(--radius-sm)",
                                        padding: "0 16px",
                                        fontSize: 12,
                                        fontWeight: 600,
                                        cursor: loading ? "wait" : "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 6
                                    }}
                                >
                                    <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                                    {loading ? "Rolling..." : "Roll Key"}
                                </button>
                            </div>
                            <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 12, display: "flex", gap: 6 }}>
                                <span style={{ color: "var(--yellow)" }}>⚠️</span>
                                This key bypasses all policy checks. Never expose it in client-side code.
                            </p>
                        </div>
                    </div>

                    {/* Integration Guide */}
                    <div className="chart-card">
                        <h3>Quick Integration</h3>
                        <div className="quick-integration-card">
                            <div className="quick-integration-left">
                                <div style={{ marginBottom: 16 }}>
                                    <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>1. Authenticate</h4>
                                    <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.4 }}>Sign payloads with your Agent&apos;s Ed25519 Private Key. Provide the `X-Atrosha-Agent-ID` header.</p>
                                </div>
                                <div>
                                    <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>2. Proxy Request</h4>
                                    <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.4 }}>Route LLM / API traffic through our high-speed Rust Edge Proxy.</p>
                                </div>
                            </div>
                            <div className="quick-integration-right">
                                <button
                                    onClick={() => copyToClipboard(`curl -X POST https://proxy.atrosha.com/v1/chat/completions ...`)}
                                    style={{ position: "absolute", top: 12, right: 12, background: "rgba(255,255,255,0.1)", border: "none", padding: 6, borderRadius: 4, cursor: "pointer", color: "#fff" }}
                                >
                                    <Copy size={12} />
                                </button>
                                <pre style={{ fontFamily: "monospace", fontSize: 12, color: "#E2E8F0", lineHeight: 1.6, overflowX: "auto" }}>
                                    <span style={{ color: "#C084FC" }}>curl</span> -X POST https://atrosha.onrender.com/proxy/ \ <br />
                                    &nbsp;&nbsp;-H <span style={{ color: "#4ADE80" }}>&quot;X-Atrosha-Agent-ID: agent_123&quot;</span> \ <br />
                                    &nbsp;&nbsp;-H <span style={{ color: "#4ADE80" }}>&quot;X-Atrosha-Target: https://api.stripe.com/v1/refunds&quot;</span> \ <br />
                                    &nbsp;&nbsp;-H <span style={{ color: "#4ADE80" }}>&quot;X-Atrosha-Signature: 7b8f2c...a91e&quot;</span> \ <br />
                                    &nbsp;&nbsp;-d <span style={{ color: "#FCD34D" }}>{`'{ "charge": "ch_1Oz", "amount": 5000 }'`}</span>
                                </pre>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                    <div className="stat-card">
                        <div className="stat-label"><Code size={14} /> Official SDKs</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                            <a href="#" style={{ display: "flex", alignItems: "center", gap: 10, padding: 8, borderRadius: 6, border: "1px solid var(--border)", textDecoration: "none" }}>
                                <div style={{ width: 24, height: 24, background: "rgba(255, 232, 115, 0.2)", color: "#D6A00A", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>PY</div>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>Python (Recommended)</div>
                                    <div style={{ fontSize: 10, color: "var(--text-dim)" }}>pip install atrosha-sdk</div>
                                </div>
                            </a>
                            <a href="#" style={{ display: "flex", alignItems: "center", gap: 10, padding: 8, borderRadius: 6, border: "1px solid var(--border)", textDecoration: "none" }}>
                                <div style={{ width: 24, height: 24, background: "rgba(49, 120, 198, 0.1)", color: "#3178C6", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>TS</div>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>Node.js</div>
                                    <div style={{ fontSize: 10, color: "var(--text-dim)" }}>npm install @atrosha/sdk</div>
                                </div>
                            </a>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-label"><Server size={14} /> Environment</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
                            <div className="policy-field" style={{ borderTop: "none", padding: 0 }}>
                                <label>Region</label>
                                <span className="mono">us-east-1</span>
                            </div>
                            <div className="policy-field" style={{ padding: 0 }}>
                                <label>Rate Limit</label>
                                <span className="mono">100 req/s</span>
                            </div>
                            <div className="policy-field" style={{ padding: 0 }}>
                                <label>Uptime</label>
                                <span className="badge approved" style={{ padding: "2px 6px" }}>99.99%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
