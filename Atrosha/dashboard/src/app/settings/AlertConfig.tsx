"use client";

import { useState, useTransition } from "react";
import { Bell, BellOff, Webhook, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { saveAlertConfig } from "./actions";

interface AlertConfigProps {
    initialConfig: {
        id?: string;
        webhook_url: string;
        threshold_pct: number;
        enabled: boolean;
        last_fired_at?: string | null;
    } | null;
}

const THRESHOLD_OPTIONS = [
    { label: "10%", value: 10, desc: "High sensitivity" },
    { label: "25%", value: 25, desc: "Balanced" },
    { label: "50%", value: 50, desc: "Attack only" },
];

export default function AlertConfig({ initialConfig }: AlertConfigProps) {
    const [url, setUrl] = useState(initialConfig?.webhook_url ?? "");
    const [threshold, setThreshold] = useState(initialConfig?.threshold_pct ?? 25);
    const [enabled, setEnabled] = useState(initialConfig?.enabled ?? true);
    const [saved, setSaved] = useState(false);
    const [isPending, startTransition] = useTransition();

    const handleSave = () => {
        startTransition(async () => {
            await saveAlertConfig(url, threshold, enabled);
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        });
    };

    return (
        <div className="chart-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h3 style={{ display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
                    <Bell size={16} style={{ color: "var(--primary)" }} />
                    Alert Configuration
                </h3>
                {/* enable/disable toggle */}
                <button
                    onClick={() => setEnabled(!enabled)}
                    style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "6px 12px",
                        borderRadius: "var(--radius-sm)",
                        border: `1px solid ${enabled ? "var(--green)" : "var(--border)"}`,
                        background: enabled ? "rgba(34,197,94,0.08)" : "var(--bg-card)",
                        color: enabled ? "var(--green)" : "var(--text-muted)",
                        fontSize: 12, fontWeight: 600, cursor: "pointer",
                        transition: "all 0.2s ease",
                    }}
                >
                    {enabled ? <Bell size={13} /> : <BellOff size={13} />}
                    {enabled ? "Alerts On" : "Alerts Off"}
                </button>
            </div>

            {initialConfig?.last_fired_at && (
                <div style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "8px 12px", borderRadius: "var(--radius-sm)",
                    background: "rgba(245,158,11,0.08)",
                    border: "1px solid rgba(245,158,11,0.2)",
                    marginBottom: 16, fontSize: 12, color: "#f59e0b",
                }}>
                    <AlertTriangle size={13} />
                    Last alert fired {new Date(initialConfig.last_fired_at).toLocaleString()}
                </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {/* webhook URL */}
                <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, display: "block" }}>
                        Webhook URL
                    </label>
                    <div style={{ display: "flex", gap: 8 }}>
                        <div style={{ position: "relative", flex: 1 }}>
                            <Webhook size={14} style={{ position: "absolute", left: 12, top: 11, color: "var(--text-dim)" }} />
                            <input
                                type="url"
                                placeholder="https://hooks.slack.com/... or https://your-server.com/alert"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                style={{
                                    width: "100%",
                                    padding: "10px 12px 10px 34px",
                                    background: "var(--bg)",
                                    border: "1px solid var(--border)",
                                    borderRadius: "var(--radius-sm)",
                                    color: "var(--text)", fontSize: 13,
                                    outline: "none", boxSizing: "border-box",
                                }}
                            />
                        </div>
                    </div>
                    <p style={{ fontSize: 11, color: "var(--text-dim)", margin: "6px 0 0" }}>
                        Fires a POST with JSON payload when the DENY rate crosses the threshold in a 5-minute window.
                    </p>
                </div>

                {/* threshold picker */}
                <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, display: "block" }}>
                        Alert Threshold (DENY Rate)
                    </label>
                    <div style={{ display: "flex", gap: 8 }}>
                        {THRESHOLD_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => setThreshold(opt.value)}
                                style={{
                                    flex: 1, padding: "10px 8px",
                                    borderRadius: "var(--radius-sm)",
                                    border: threshold === opt.value ? "1px solid var(--primary)" : "1px solid var(--border)",
                                    background: threshold === opt.value ? "var(--primary-glow)" : "var(--bg)",
                                    color: threshold === opt.value ? "var(--primary-hover)" : "var(--text-muted)",
                                    cursor: "pointer", transition: "all 0.15s ease",
                                    display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                                }}
                            >
                                <span style={{ fontSize: 16, fontWeight: 700 }}>{opt.label}</span>
                                <span style={{ fontSize: 10 }}>{opt.desc}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* save button */}
                <button
                    onClick={handleSave}
                    disabled={isPending || !url.trim()}
                    style={{
                        alignSelf: "flex-end",
                        padding: "9px 20px",
                        borderRadius: "var(--radius-sm)",
                        border: "none",
                        background: saved ? "var(--green)" : "var(--primary)",
                        color: "#fff",
                        fontSize: 13, fontWeight: 600,
                        cursor: isPending || !url.trim() ? "not-allowed" : "pointer",
                        display: "flex", alignItems: "center", gap: 6,
                        opacity: !url.trim() ? 0.5 : 1,
                        transition: "background 0.2s ease",
                    }}
                >
                    {isPending ? <Loader2 size={14} className="animate-spin" /> : saved ? <CheckCircle size={14} /> : null}
                    {isPending ? "Saving..." : saved ? "Saved!" : "Save Config"}
                </button>
            </div>
        </div>
    );
}
