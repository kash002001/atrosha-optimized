import { createClient as createJsClient, SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";


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
        return (getSupabase() as unknown as Record<string | symbol, unknown>)[prop];
    },
});

export function createClient(cookieStore: { get: (name: string) => { value: string } | undefined }) {
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
            },
            // Shared options
            cookieOptions: {
                domain: process.env.NODE_ENV === 'production' ? '.atrosha.bond' : undefined,
                path: '/',
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
            }
        }
    );
}
