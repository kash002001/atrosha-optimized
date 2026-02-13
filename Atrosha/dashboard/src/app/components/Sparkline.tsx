"use client";

import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";

const data = [
    { v: 10 }, { v: 15 }, { v: 12 }, { v: 20 }, { v: 18 }, { v: 25 }, { v: 22 },
    { v: 30 }, { v: 28 }, { v: 25 }, { v: 35 }, { v: 40 }, { v: 38 }, { v: 45 },
];

export default function Sparkline({ color = "#059669" }: { color?: string }) {
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
