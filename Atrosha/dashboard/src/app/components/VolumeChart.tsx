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
}

export default function VolumeChart({ data }: VolumeChartProps) {
    const isEmpty = !data || data.length === 0 || data.every(d => d.approved === 0 && d.denied === 0);

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
                        {/* Gradients for Skeleton Mode (Gray/Muted) */}
                        <linearGradient id="gSkeleton" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2e2e3e" stopOpacity={0.15} />
                            <stop offset="100%" stopColor="#2e2e3e" stopOpacity={0.05} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" vertical={false} />
                    <XAxis
                        dataKey="t"
                        tick={{ fill: "#6b6b80", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        dy={10}
                        interval={isEmpty ? 1 : 'preserveStartEnd'}
                        // Hide Axis labels in skeleton mode for true "background" look? 
                        // Or keep them for scale? Let's keep them but ensure they don't break layout.
                        hide={isEmpty}
                    />
                    <YAxis
                        tick={{ fill: "#6b6b80", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        hide={isEmpty} // Hide Y axis for clean background look
                        domain={isEmpty ? [0, 20] : ['auto', 'auto']} // Ensure wave fits comfortably (max ~18)
                    />
                    {!isEmpty && (
                        <Tooltip
                            contentStyle={{ background: "#16161f", border: "1px solid #1e1e2e", borderRadius: 8, fontSize: 12 }}
                            labelStyle={{ color: "#e4e4ec" }}
                        />
                    )}

                    {isEmpty ? (
                        /* Skeleton Areas - Faint, dashed, full background waves */
                        <>
                            <Area
                                type="monotone"
                                dataKey="approved"
                                stroke="#3f3f4e"
                                fill="url(#gSkeleton)"
                                strokeWidth={2}
                                strokeDasharray="6 6"
                                animationDuration={0}
                                isAnimationActive={false}
                            />
                            <Area
                                type="monotone"
                                dataKey="denied"
                                stroke="#3f3f4e"
                                fill="url(#gSkeleton)"
                                strokeWidth={2}
                                strokeDasharray="6 6"
                                animationDuration={0}
                                isAnimationActive={false}
                            />
                        </>
                    ) : (
                        /* Real Data Areas */
                        <>
                            <Area type="monotone" dataKey="approved" stroke="#6366f1" fill="url(#gApproved)" strokeWidth={2} />
                            <Area type="monotone" dataKey="denied" stroke="#ef4444" fill="url(#gDenied)" strokeWidth={2} />
                        </>
                    )}
                </AreaChart>
            </ResponsiveContainer>

            {isEmpty && (
                <div style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(0,0,0,0.01)", // Almost transparent
                }}>
                    <div style={{
                        textAlign: "center",
                        background: "rgba(22, 22, 31, 0.85)",
                        padding: "24px 36px",
                        borderRadius: 16,
                        border: "1px solid #2e2e3e",
                        backdropFilter: "blur(6px)",
                        boxShadow: "0 12px 40px rgba(0, 0, 0, 0.3)"
                    }}>
                        <p style={{ color: "#e4e4ec", fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Start Monitoring</p>
                        <p style={{ color: "#8b8b9d", fontSize: 13, marginBottom: 20 }}>Connect your first agent to see real-time transaction volume.</p>

                        <Link href="/agents" style={{
                            background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                            color: "#fff",
                            padding: "12px 24px",
                            borderRadius: 10,
                            fontSize: 14,
                            fontWeight: 600,
                            textDecoration: "none",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 10,
                            boxShadow: "0 4px 15px rgba(99, 102, 241, 0.35)",
                            transition: "transform 0.2s ease"
                        }}>
                            <span>+</span> Connect Agent
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
