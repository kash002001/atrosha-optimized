import { NextResponse, NextRequest } from "next/server";

const ALLOWED_ORIGINS = [
    "https://atrosha.bond",
    "https://app.atrosha.bond",
    "http://localhost:3000",
    "http://localhost:3001",
];

export function checkOrigin(req: Request): NextResponse | null {
    const origin = req.headers.get("origin") || req.headers.get("referer") || "";
    const allowed = ALLOWED_ORIGINS.some(o => origin.startsWith(o));

    if (!allowed && origin) {
        return NextResponse.json(
            { error: "Forbidden: invalid origin" },
            { status: 403 }
        );
    }
    return null;
}
