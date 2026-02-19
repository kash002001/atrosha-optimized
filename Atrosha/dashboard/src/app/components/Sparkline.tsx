"use client";

import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";

interface SparklineProps {
    color?: string;
    data: { v: number }[];
}

export default function Sparkline({ color = "#059669", data }: SparklineProps) {
    // Fallback
    if (!data || data.length === 0) return null;
    return (
        <div style={{ width: "100%", height: 40 }}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <Tooltip cursor={false} content={() => null} />
                    <Area
                        type="monotone"
                        dataKey="v"
                        stroke={color}
                        strokeWidth={1.5}
                        fillOpacity={1}
                        fill={`url(#gradient-${color})`}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
