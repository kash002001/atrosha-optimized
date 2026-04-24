import { NextResponse } from "next/server";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function checkOrigin(req: Request): NextResponse | null {
    const origin = req.headers.get("origin") || req.headers.get("referer") || "";

    // For mutation requests, missing origin is suspicious — block it.
    // GET/HEAD/OPTIONS without origin are fine (direct nav, RSS readers, etc).
    if (!origin) {
        if (!SAFE_METHODS.has(req.method.toUpperCase())) {
            return NextResponse.json(
                { error: "Forbidden: origin required for mutations" },
                { status: 403 }
            );
        }
        return null;
    }

    try {
        const originUrl = new URL(origin);
        const host = originUrl.hostname;

        const isAllowed =
            host.endsWith("atrosha.bond") ||
            host === "localhost" ||
            host.endsWith("vercel.app");

        if (!isAllowed) {
            console.error(`Blocked CORS request from: ${origin} (Host: ${host})`);
            return NextResponse.json(
                { error: "Forbidden: invalid origin" },
                { status: 403 }
            );
        }
    } catch {
        return NextResponse.json(
            { error: "Forbidden: invalid origin format" },
            { status: 403 }
        );
    }

    return null;
}
