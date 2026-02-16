import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // DEBUG: No-Op Middleware to verify deployment
    console.log("Middleware: Passing through request:", request.nextUrl.pathname);
    return NextResponse.next();
}

export const config = {
    matcher: '/((?!api|_next/static|_next/image|favicon.ico).*)',
};
