import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return allCookies; },
                setAll(cookiesToSet) { }
            }
        }
    );

    const { data: { user }, error } = await supabase.auth.getUser();

    return NextResponse.json({
        status: 'ok',
        app: 'Atrosha Landing Page',
        env: process.env.NODE_ENV,
        host: request.headers.get('host'),
        cookie_domain_config: process.env.NODE_ENV === 'production' ? '.atrosha.bond' : 'localhost',
        cookies_present: allCookies.map(c => c.name),
        auth_check: {
            user_id: user?.id || 'null',
            email: user?.email || 'null',
            session_active: !!user
        }
    });
}
