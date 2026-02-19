"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function createAgent(name: string, limit: number) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    // Since we don't have an 'organizations' table fully wired with RLS in previous steps (we used mocks or partials),
    // we'll assume the user has an 'org_id' in metadata, OR we just insert without it if nullable.
    // Ideally we should have it.
    const orgId = user.user_metadata.org_id;

    const { data, error } = await supabase.from('agents').insert({
        name,
        // org_id: orgId, // Commented out in case it's not set up, relying on default or nullable. 
        // Un-comment if you know it's strict. 
        // Safe bet: if schema requires it, this will fail. Let's try to include if present.
        ...(orgId && { organization_id: orgId }),
        daily_limit_cents: limit,
        is_active: true
    }).select().single();

    if (error) {
        throw new Error(error.message);
    }

    revalidatePath("/agents");
    return data;
}
