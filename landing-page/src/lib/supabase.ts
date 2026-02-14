import { createClient as createJsClient, SupabaseClient } from "@supabase/supabase-js";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";


let _client: SupabaseClient | null = null;

export function getSupabase() {
    if (!_client) {
        _client = createJsClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://mock.supabase.co',
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'mock_key'
        );
    }
    return _client;
}

// backwards compat — lazy singleton
export const supabase = new Proxy({} as SupabaseClient, {
    get(_target, prop) {
        return (getSupabase() as any)[prop];
    },
});

export function createClient(cookieStore: any) {
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
            },
            // Shared options for localhost
            cookieOptions: {
                domain: 'localhost',
                path: '/',
                sameSite: 'lax',
                secure: false,
            }
        }
    );
}
