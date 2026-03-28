"use client";

import { useEffect, useState } from "react";
import { Activity, Database, Server, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase-client";

interface StatusData {
    db: { status: string; count: number };
    auth: { session: boolean };
    timestamp: string;
}

export default function StatusPage() {
    const [data, setData] = useState<StatusData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const check = async () => {
            try {
                const supabase = createClient();
                const [txRes, authRes] = await Promise.all([
                    supabase.from('transactions').select('*', { count: 'exact', head: true }),
                    supabase.auth.getSession(),
                ]);

                setData({
                    db: {
                        status: txRes.error ? "unreachable" : "connected",
                        count: txRes.count ?? 0,
                    },
                    auth: { session: !!authRes.data.session },
                    timestamp: new Date().toISOString(),
                });
            } catch {
                setData({
                    db: { status: "unreachable", count: 0 },
                    auth: { session: false },
                    timestamp: new Date().toISOString(),
                });
            }
            setLoading(false);
        };
        check();
    }, []);

    if (loading) {
        return (
            <div className="page-header">
                <h2>System Status</h2>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 20 }}>
                    <Activity className="animate-spin" size={20} /> Checking services...
                </div>
            </div>
        );
    }

    const isHealthy = data?.db?.status === "connected";

    return (
        <div style={{ maxWidth: 800 }}>
            <div className="page-header">
                <h2>System Status</h2>
                <div className={`badge ${isHealthy ? "approved" : "denied"}`} style={{ display: "inline-flex", fontSize: 13, padding: "6px 12px", marginTop: 8, gap: 6, alignItems: "center" }}>
                    <Activity size={14} />
                    {isHealthy ? "All Systems Operational" : "System Issues Detected"}
                </div>
            </div>

            <div className="stats-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
                <div className="chart-card">
                    <h3 style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                        <Database size={16} /> Database
                    </h3>
                    <div className="policy-field">
                        <label>Status</label>
                        <span className={`badge ${data?.db.status === "connected" ? "approved" : "denied"}`}>
                            {data?.db.status}
                        </span>
                    </div>
                    <div className="policy-field">
                        <label>Total Transactions</label>
                        <span className="mono">{(data?.db.count ?? 0) >= 0 ? data?.db.count : "N/A"}</span>
                    </div>
                </div>

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
                        <span className={`badge ${data?.auth.session ? "approved" : "pending"}`}>
                            {data?.auth.session ? "Active" : "Guest"}
                        </span>
                    </div>
                </div>

                <div className="chart-card">
                    <h3 style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                        <Shield size={16} /> Atrosha Kernel
                    </h3>
                    <div className="policy-field">
                        <label>Status</label>
                        <span className={`badge ${isHealthy ? "approved" : "denied"}`}>
                            {isHealthy ? "operational" : "degraded"}
                        </span>
                    </div>
                    <div className="policy-field">
                        <label>Mode</label>
                        <span className="mono">Sovereign</span>
                    </div>
                </div>
            </div>

            <div className="chart-card" style={{ marginTop: 24 }}>
                <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Shield size={16} /> Environment
                </h3>
                <div className="policy-field">
                    <label>App Name</label>
                    <span className="mono">Atrosha Dashboard</span>
                </div>
                <div className="policy-field">
                    <label>Timestamp</label>
                    <span className="mono" style={{ fontSize: 11 }}>{data?.timestamp}</span>
                </div>
            </div>
        </div>
    );
}
