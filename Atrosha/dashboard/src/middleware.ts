import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
    let res = NextResponse.next({ request: req });

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
                    cookiesToSet.forEach(({ name, value, options }) => {
                        // Apply cross-domain cookie logic dynamically here for the server client
                        const customOptions = { ...options };
                        if (req.nextUrl.hostname.endsWith('.atrosha.bond')) {
                            customOptions.domain = '.atrosha.bond';
                        }
                        res.cookies.set(name, value, customOptions);
                    });
                },
            }
        }
    );

    const {
        data: { user },
        error
    } = await supabase.auth.getUser();

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
        "/((?!_next/static|_next/image|favicon.ico|api).*)",
    ],
};
