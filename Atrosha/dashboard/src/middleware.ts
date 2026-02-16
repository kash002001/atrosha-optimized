import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // CRASHER PROBE
    console.error("CRASHER MIDDLEWARE EXECUTING");
    throw new Error("CRASHER_PROBE_ACTIVE");
}

export const config = {
    matcher: '/((?!api|_next/static|_next/image|favicon.ico).*)',
};
