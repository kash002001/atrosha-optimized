"use client";

import dynamic from "next/dynamic";

export const VolumeChart = dynamic(() => import("./VolumeChart"), { ssr: false });
export const Sparkline = dynamic(() => import("./Sparkline"), { ssr: false });
