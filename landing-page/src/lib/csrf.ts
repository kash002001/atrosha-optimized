import { NextResponse } from "next/server";

export function checkOrigin(req: Request): NextResponse | null {
    const origin = req.headers.get("origin") || req.headers.get("referer") || "";

    // If no origin/referer, let it pass (same-origin request without headers)
    if (!origin) return null;

    try {
        const originUrl = new URL(origin);
        const host = originUrl.hostname;

        // Allow any atrosha.bond subdomain (including apex and www), localhost, and vercel.app
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
