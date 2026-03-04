"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";

async function getIsProd() {
    try {
        const headerList = await headers();
        const host = headerList.get("host") || "";
        return host.includes("atrosha.bond");
    } catch {
        return process.env.NODE_ENV === 'production';
    }
}

export async function loginAction(email: string, password: string) {
    const isProduction = (await getIsProd()) === true;
    const cookieStore = await cookies();

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder",
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            cookieStore.set(name, value, {
                                ...options,
                                domain: isProduction ? '.atrosha.bond' : undefined,
                                path: '/',
                                sameSite: 'lax',
                                secure: isProduction,
                                httpOnly: true,
                            });
                        });
                    } catch {
                    }
                },
            },
        }
    );

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        return { error: error.message };
    }

    return { error: null };
}

export async function signupAction(email: string, password: string, orgName: string, plan: string) {
    const isProduction = (await getIsProd()) === true;
    const cookieStore = await cookies();

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder",
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            cookieStore.set(name, value, {
                                ...options,
                                domain: isProduction ? '.atrosha.bond' : undefined,
                                path: '/',
                                sameSite: 'lax',
                                secure: isProduction,
                                httpOnly: true,
                            });
                        });
                    } catch {
                    }
                },
            },
        }
    );

    const { data, error: authErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { org_name: orgName, plan_tier: plan },
        },
    });

    if (authErr) {
        return { error: authErr.message };
    }

    return { user: data.user, error: null };
}
