import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// paths where we skip the supabase auth check entirely — only true public assets
const SKIP_AUTH = new Set(["/auth/callback", "/favicon.ico", "/robots.txt", "/sitemap.xml"]);

export async function middleware(req: NextRequest) {
    let res = NextResponse.next({ request: req });
    const path = req.nextUrl.pathname;
    const isProd = process.env.NODE_ENV === 'production';

    // security headers first
    res.headers.set("X-Frame-Options", "DENY");
    res.headers.set("X-Content-Type-Options", "nosniff");
    res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");

    // skip auth for static/public assets
    if (SKIP_AUTH.has(path) || path.startsWith('/api/')) return res;

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
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
                    cookiesToSet.forEach(({ name, value, options }) => {
                        const cookieOptions = {
                            ...options,
                            domain: isProd ? '.atrosha.bond' : undefined,
                            path: '/',
                            sameSite: 'lax' as const,
                            secure: isProd,
                        };
                        req.cookies.set(name, value);
                        res.cookies.set(name, value, cookieOptions);
                    });
                    res = NextResponse.next({ request: req });
                },
            },
        }
    );

    try {
        await supabase.auth.getUser();
    } catch {
        // noop
    }

    return res;
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|api).*)",
    ],
};
