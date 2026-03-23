import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (code) {
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

        await supabase.auth.exchangeCodeForSession(code);
    }

    // redirect to dashboard after email confirmation
    const dashUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL || "/";
    return NextResponse.redirect(new URL(dashUrl, req.url));
}
