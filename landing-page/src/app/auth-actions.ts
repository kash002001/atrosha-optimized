"use server";

import { createClient } from "@/lib/supabase";
import { cookies } from "next/headers";

export async function loginAction(email: string, password: string) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? { error: error.message } : { error: null };
}
