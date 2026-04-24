import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (code) {
        // reject obviously malformed codes before hitting supabase
        if (code.length > 512 || !/^[\w\-]+$/.test(code)) {
            const dashUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL || "/";
            return NextResponse.redirect(new URL(dashUrl, req.url));
        }
        const hostname = req.headers.get('host') || 'localhost';
        const isProd = hostname.includes('atrosha.bond');
        const cookieDomain = isProd ? '.atrosha.bond' : undefined;
        
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() { return cookieStore.getAll(); },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            cookieStore.set(name, value, {
                                ...options,
                                domain: cookieDomain,
                                path: '/',
                                sameSite: 'lax',
                                secure: isProd,
                            });
                        });
                    },
                },
            }
        );

        const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
        // M4: expired/replayed codes must not silently redirect to the dashboard
        if (exchangeErr) {
            console.error("auth callback exchange failed:", exchangeErr.message);
            return NextResponse.redirect(new URL("/login?error=auth_failed", req.url));
        }
    }

    // redirect to dashboard after successful exchange / email confirmation
    let dashUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL || "/";
    const reqHost = req.headers.get('host') || 'localhost';
    if (!reqHost.includes('atrosha.bond') && dashUrl.includes('atrosha.bond')) {
        dashUrl = "http://localhost:3001";
    }
    return NextResponse.redirect(new URL(dashUrl, req.url));
}
