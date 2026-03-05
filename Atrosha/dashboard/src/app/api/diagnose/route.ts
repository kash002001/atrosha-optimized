import { NextResponse } from 'next/server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET() {
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
                setAll() {
                    // No-op for GET
                }
            }
        }
    );

    const { data: { user } } = await supabase.auth.getUser();

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
    } catch (e: unknown) {
        dbStatus = "exception";
        dbError = e instanceof Error ? e.message : String(e);
    }

    // Check Proxy Status
    let proxyStatus = "unknown";
    let proxyLatency = -1;
    const proxyUrl = process.env.PROXY_URL;

    if (proxyUrl) {
        try {
            const start = Date.now();
            const res = await fetch(`${proxyUrl}/health`, {
                method: 'GET',
                signal: AbortSignal.timeout(3000) // 3s timeout
            });
            proxyLatency = Date.now() - start;
            if (res.ok) {
                proxyStatus = "operational";
            } else {
                proxyStatus = `error_${res.status}`;
            }
        } catch {
            proxyStatus = "unreachable";
        }
    } else {
        proxyStatus = "not_configured";
    }

    return NextResponse.json({
        status: 'ok',
        app: 'Atrosha Dashboard',
        supabaseUrlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 15),
        loginUrl: process.env.NEXT_PUBLIC_LOGIN_URL,
        timestamp: new Date().toISOString(),
        auth: {
            session: !!user,
            user: user?.email || null,
        },
        db: {
            status: dbStatus,
            error: dbError,
            transactions_table_count: txCount
        },
        proxy: {
            status: proxyStatus,
            url: proxyUrl || null,
            latency_ms: proxyLatency
        }
    });
}
