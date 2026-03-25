"use client";

import Link from "next/link";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

interface ChartData {
    t: string;
    approved: number;
    denied: number;
}

interface VolumeChartProps {
    data: ChartData[];
    totalTransactions?: number;
}

export default function VolumeChart({ data, totalTransactions }: VolumeChartProps) {
    // If totalTransactions is precisely 0, it means they have never sent a transaction.
    const isEmpty = totalTransactions === 0 || (totalTransactions === undefined && (!data || data.length === 0 || data.every(d => d.approved === 0 && d.denied === 0)));

    // Generate neat 12-hour time labels
    const formatTime = (hour: number) => {
        if (hour === 0 || hour === 24) return "12 AM";
        if (hour === 12) return "12 PM";
        return hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
    };

    // If empty, use a "Skeleton" dataset that looks like a gentle wave covering the background
    const renderData = isEmpty
        ? Array.from({ length: 13 }).map((_, i) => {
            const hour = i * 2; // 0, 2, 4... 24
            return {
                t: formatTime(hour),
                approved: 12 + Math.sin(i / 1.5) * 6, // Wave from 6 to 18
                denied: 5 + Math.cos(i / 1.5) * 3,   // Wave from 2 to 8
            };
        })
        : data;

    return (
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={renderData}
                    // Full bleed for skeleton mode, standard margins for data mode
                    margin={isEmpty ? { top: 0, right: 0, left: 0, bottom: 0 } : { top: 10, right: 30, left: 0, bottom: 0 }}
                >
                    <defs>
                        <linearGradient id="gApproved" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gDenied" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                        {/* Gradients for Skeleton Mode (Light Theme) */}
                        <linearGradient id="gSkeleton" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#e2e8f0" stopOpacity={0.6} />
                            <stop offset="100%" stopColor="#f8fafc" stopOpacity={0.1} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                        dataKey="t"
                        tick={{ fill: "#64748b", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        dy={10}
                        interval={isEmpty ? 1 : 'preserveStartEnd'}
                        hide={isEmpty}
                    />
                    <YAxis
                        tick={{ fill: "#64748b", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        hide={isEmpty}
                        domain={isEmpty ? [0, 20] : ['auto', 'auto']}
                    />
                    {!isEmpty && (
                        <Tooltip
                            contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12, boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}
                            labelStyle={{ color: "#1e293b", fontWeight: 600 }}
                        />
                    )}

                    {isEmpty && <Area type="monotone" dataKey="approved" stroke="#cbd5e1" fill="url(#gSkeleton)" strokeWidth={2} strokeDasharray="6 6" animationDuration={0} isAnimationActive={false} />}
                    {isEmpty && <Area type="monotone" dataKey="denied" stroke="#cbd5e1" fill="url(#gSkeleton)" strokeWidth={2} strokeDasharray="6 6" animationDuration={0} isAnimationActive={false} />}

                    {!isEmpty && <Area type="monotone" dataKey="approved" stroke="#059669" fill="url(#gApproved)" strokeWidth={2} />}
                    {!isEmpty && <Area type="monotone" dataKey="denied" stroke="#dc2626" fill="url(#gDenied)" strokeWidth={2} />}
                </AreaChart>
            </ResponsiveContainer>

            {isEmpty && (
                <div style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(255,255,255,0.4)",
                }}>
                    <div style={{
                        textAlign: "center",
                        background: "rgba(255, 255, 255, 0.95)",
                        padding: "24px 36px",
                        borderRadius: 16,
                        border: "1px solid #e2e8f0",
                        backdropFilter: "blur(4px)",
                        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.05)"
                    }}>
                        <p style={{ color: "#1e293b", fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Start Monitoring</p>
                        <p style={{ color: "#64748b", fontSize: 13, marginBottom: 20 }}>Connect your first agent to see real-time transaction volume.</p>

                        <Link href="/agents" style={{
                            background: "var(--primary)",
                            color: "#fff",
                            padding: "12px 24px",
                            borderRadius: "var(--radius-sm)",
                            fontSize: 14,
                            fontWeight: 600,
                            textDecoration: "none",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 10,
                            boxShadow: "0 4px 15px rgba(6, 78, 59, 0.15)",
                            transition: "all 0.2s ease"
                        }}>
                            <span>+</span> Connect Agent
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
