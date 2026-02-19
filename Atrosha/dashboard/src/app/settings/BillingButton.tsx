"use client";

import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";

export default function BillingButton() {
    const [loading, setLoading] = useState(false);

    const handleBilling = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/billing/portal", { method: "POST" });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                alert("Failed to load billing portal: " + (data.error || "Unknown error"));
                setLoading(false);
            }
        } catch (e) {
            alert("Error connecting to server.");
            setLoading(false);
        }
    };

    return (
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
        </button >
    );
}
