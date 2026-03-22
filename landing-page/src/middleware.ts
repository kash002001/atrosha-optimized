import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// paths where we skip the supabase auth check entirely — only true public assets
const SKIP_AUTH = new Set(["/auth/callback", "/favicon.ico", "/robots.txt", "/sitemap.xml"]);

export async function middleware(req: NextRequest) {
    let res = NextResponse.next({ request: req });
    const path = req.nextUrl.pathname;
    const isProd = process.env.NODE_ENV === 'production';

    res.headers.set("X-Frame-Options", "DENY");
    res.headers.set("X-Content-Type-Options", "nosniff");
    res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");

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
                    cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
                    
                    res = NextResponse.next({ request: req });
                    
                    res.headers.set("X-Frame-Options", "DENY");
                    res.headers.set("X-Content-Type-Options", "nosniff");
                    res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
                    res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");

                    cookiesToSet.forEach(({ name, value, options }) => {
                        res.cookies.set(name, value, {
                            ...options,
                            domain: isProd ? '.atrosha.bond' : undefined,
                            path: '/',
                            sameSite: 'lax',
                            secure: isProd,
                        });
                    });
                },
            },
        }
    );

    try {
        const fetchUser = supabase.auth.getUser();
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000));
        await Promise.race([fetchUser, timeout]);
    } catch {
        // silent fail to avoid edge crashing
    }

    return res;
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|api).*)",
    ],
};
