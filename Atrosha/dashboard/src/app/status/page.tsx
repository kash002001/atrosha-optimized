"use client";

import { useEffect, useState } from "react";
import { Activity, XCircle, Database, Server, Shield } from "lucide-react";

interface StatusData {
    db: { status: string; transactions_table_count: number };
    auth: { session: boolean };
    proxy?: { status: string; latency_ms: number };
    app: string;
    timestamp: string;
}

export default function StatusPage() {
    const [data, setData] = useState<StatusData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        fetch("/api/diagnose")
            .then(res => res.json())
            .then(setData)
            .catch(e => setError(e instanceof Error ? e.message : String(e)))
            .finally(() => setLoading(false));
    }, []);

    if (loading || !data) {
        return (
            <div className="page-header">
                <h2>System Status</h2>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 20 }}>
                    <Activity className="animate-spin" size={20} /> Checking services...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="page-header">
                <h2>System Status</h2>
                <div style={{ color: "var(--red)", marginTop: 20 }}>
                    <XCircle size={20} style={{ verticalAlign: "bottom", marginRight: 8 }} />
                    Error fetching status: {error}
                </div>
            </div>
        );
    }

    const isHealthy = data?.db?.status === "connected";

    return (
        <div style={{ maxWidth: 800 }}>
            <div className="page-header">
                <h2>System Status</h2>
                <div className={`badge ${isHealthy ? "approved" : "denied"}`} style={{ display: "inline-flex", fontSize: 13, padding: "6px 12px", marginTop: 8 }}>
                    <Activity size={14} style={{ marginRight: 6 }} />
                    {isHealthy ? "All Systems Operational" : "System Issues Detected"}
                </div>
            </div>

            <div className="stats-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
                {/* Database */}
                <div className="chart-card">
                    <h3 style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                        <Database size={16} /> Database
                    </h3>
                    <div className="policy-field">
                        <label>Status</label>
                        <span className={`badge ${data.db.status === "connected" ? "approved" : "denied"}`}>
                            {data.db.status}
                        </span>
                    </div>
                    <div className="policy-field">
                        <label>Total Transactions</label>
                        <span className="mono">{data.db.transactions_table_count >= 0 ? data.db.transactions_table_count : "N/A"}</span>
                    </div>
                </div>

                {/* API / Server */}
                <div className="chart-card">
                    <h3 style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                        <Server size={16} /> API Server
                    </h3>
                    <div className="policy-field">
                        <label>Response Time</label>
                        <span className="mono">~10ms</span>
                    </div>
                    <div className="policy-field">
                        <label>Auth Session</label>
                        <span className={`badge ${data.auth.session ? "approved" : "pending"}`}>
                            {data.auth.session ? "Active" : "Guest"}
                        </span>
                    </div>
                </div>

                {/* Proxy / Edge */}
                <div className="chart-card">
                    <h3 style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                        <Shield size={16} /> Proxy / Edge
                    </h3>
                    <div className="policy-field">
                        <label>Status</label>
                        <span className={`badge ${data.proxy?.status === "operational" ? "approved" : "denied"}`}>
                            {data.proxy?.status || "Checking..."}
                        </span>
                    </div>
                    <div className="policy-field">
                        <label>Latency</label>
                        <span className="mono">{(data.proxy?.latency_ms ?? 0) > 0 ? `${data.proxy?.latency_ms}ms` : "N/A"}</span>
                    </div>
                </div>
            </div>

            <div className="chart-card" style={{ marginTop: 24 }}>
                <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Shield size={16} /> Environment
                </h3>
                <div className="policy-field">
                    <label>App Name</label>
                    <span className="mono">{data.app}</span>
                </div>
                <div className="policy-field">
                    <label>Timestamp</label>
                    <span className="mono" style={{ fontSize: 11 }}>{data.timestamp}</span>
                </div>
            </div>
        </div>
    );
}
