import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

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

    if (path.startsWith('/api/')) {
        const ip = req.headers.get("x-forwarded-for") ?? "anonymous";
        const { success, headers: rlHeaders } = checkRateLimit(ip, 60, 60000);
        
        const allowedOrigins = isProd 
            ? ['https://atrosha.bond', 'https://app.atrosha.bond'] 
            : ['http://localhost:3000'];
            
        const origin = req.headers.get('origin') || "";
        const isAllowedOptions = allowedOrigins.includes(origin);

        const apiRes = success ? NextResponse.next({ request: req }) : new NextResponse("Too Many Requests", { status: 429 });

        if (isAllowedOptions) {
            apiRes.headers.set("Access-Control-Allow-Origin", origin);
        } else {
            apiRes.headers.set("Access-Control-Allow-Origin", allowedOrigins[0]);
        }
        
        apiRes.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        apiRes.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
        apiRes.headers.set("Access-Control-Max-Age", "86400");
        
        Object.entries(rlHeaders).forEach(([k, v]) => apiRes.headers.set(k, v));

        if (req.method === 'OPTIONS') {
            return new NextResponse(null, { headers: apiRes.headers, status: 204 });
        }

        if (!success) return apiRes;
        return apiRes;
    }

    if (SKIP_AUTH.has(path)) return res;

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
