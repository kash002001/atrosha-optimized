"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

export default function BillingButton() {
    const [loading, setLoading] = useState(false);
    // L2: inline error state instead of alert()
    const [error, setError] = useState<string | null>(null);

    const handleBilling = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/billing/portal", { method: "POST" });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                setError(data.error || "Failed to open billing portal.");
                setLoading(false);
            }
        } catch {
            setError("Could not reach server. Please try again.");
            setLoading(false);
        }
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            <button
                onClick={handleBilling}
                disabled={loading}
                style={{
                    background: "var(--text)",
                    color: "#fff",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: "var(--radius-sm)",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: loading ? "wait" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8
                }}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : "Manage Billing"}
            </button>
            {error && (
                <span style={{ fontSize: 11, color: "#ef4444", maxWidth: 220, textAlign: "right" }}>
                    {error}
                </span>
            )}
        </div>
    );
}
