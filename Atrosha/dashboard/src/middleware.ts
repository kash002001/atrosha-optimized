import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
    let res = NextResponse.next({ request: req });
    // DEBUG: Check what the middleware sees
    if (req.nextUrl.searchParams.has('debug_middleware')) {
        return NextResponse.json({
            message: "Debug Middleware",
            env: process.env.NODE_ENV,
            cookieNames: req.cookies.getAll().map(c => c.name),
            hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            loginUrl: process.env.NEXT_PUBLIC_LOGIN_URL,
        });
    }

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

    const {
        data: { user },
        error
    } = await supabase.auth.getUser();

    if (error) console.error("Dashboard Auth Error:", error.message);
    if (user) console.log("Dashboard User Found:", user.email);

    // no session → bounce to landing page login
    const loginUrl = process.env.NEXT_PUBLIC_LOGIN_URL || "https://atrosha.bond/login";
    if (!user) {
        return NextResponse.redirect(loginUrl);
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
        // gate everything except static assets and api routes
        "/((?!_next/static|_next/image|favicon.ico|api).*)",
    ],
};
