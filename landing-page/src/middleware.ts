import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
    let res = NextResponse.next({ request: req });
    console.log("Middleware request:", req.nextUrl.pathname);

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.warn("Middleware: Missing Supabase Env Vars - Skipping Auth Check");
        return res;
    }

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                getAll() {
                    return req.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        req.cookies.set(name, value)
                    );
                    res = NextResponse.next({ request: req });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        res.cookies.set(name, value, options)
                    );
                },
            },
            // Shared options for localhost
            cookieOptions: {
                domain: process.env.NODE_ENV === 'production' ? '.atrosha.bond' : 'localhost',
                path: '/',
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
            }
        }
    );

    try {
        await supabase.auth.getUser();
        console.log("Middleware auth check done for:", req.nextUrl.pathname);
    } catch (e) {
        console.error("Middleware error:", e);
    }

    // Security Headers
    res.headers.set("X-Frame-Options", "DENY");
    res.headers.set("X-Content-Type-Options", "nosniff");
    res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");

    return res;
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|api).*)",
    ],
};
