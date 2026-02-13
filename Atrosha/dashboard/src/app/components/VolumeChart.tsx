"use client";

import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

const data = [
    { t: "00:00", approved: 42, denied: 3 },
    { t: "04:00", approved: 28, denied: 5 },
    { t: "08:00", approved: 85, denied: 12 },
    { t: "12:00", approved: 127, denied: 8 },
    { t: "16:00", approved: 156, denied: 15 },
    { t: "20:00", approved: 98, denied: 6 },
    { t: "Now", approved: 112, denied: 4 },
];

export default function VolumeChart() {
    return (
        <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data}>
                <defs>
                    <linearGradient id="gApproved" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gDenied" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
                <XAxis dataKey="t" tick={{ fill: "#6b6b80", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#6b6b80", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                    contentStyle={{ background: "#16161f", border: "1px solid #1e1e2e", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "#e4e4ec" }}
                />
                <Area type="monotone" dataKey="approved" stroke="#6366f1" fill="url(#gApproved)" strokeWidth={2} />
                <Area type="monotone" dataKey="denied" stroke="#ef4444" fill="url(#gDenied)" strokeWidth={2} />
            </AreaChart>
        </ResponsiveContainer>
    );
}
