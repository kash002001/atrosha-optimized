import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();

    // Initialize Supabase to test auth
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return allCookies;
                },
                setAll(cookiesToSet) {
                    // No-op for GET
                }
            }
        }
    );

    const { data: { user }, error } = await supabase.auth.getUser();

    // Check DB Connection & schema
    let dbStatus = "unknown";
    let dbError = null;
    let txCount = -1;

    try {
        const { count, error } = await supabase
            .from('transactions')
            .select('*', { count: 'exact', head: true });

        if (error) {
            dbStatus = "error";
            dbError = error.message;
        } else {
            dbStatus = "connected";
            txCount = count || 0;
        }
    } catch (e: any) {
        dbStatus = "exception";
        dbError = e.message;
    }

    return NextResponse.json({
        status: 'ok',
        app: 'Atrosha Dashboard',
        supabaseUrlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 15),
        loginUrl: process.env.NEXT_PUBLIC_LOGIN_URL,
        timestamp: new Date().toISOString(),
        auth: {
            session: !!user, // Assuming 'session' refers to whether a user is logged in
            user: user?.email || null,
        },
        db: {
            status: dbStatus,
            error: dbError,
            transactions_table_count: txCount
        }
    });
}
