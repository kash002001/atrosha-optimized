import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        status: 'ok',
        app: 'Atrosha Dashboard',
        supabaseUrlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 15),
        loginUrl: process.env.NEXT_PUBLIC_LOGIN_URL,
        timestamp: new Date().toISOString()
    });
}
