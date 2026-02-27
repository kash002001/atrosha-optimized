"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function addRule(nl: string, compiled: string, agentName: string) {
    const supabase = await createClient();

    // We need to resolve Agent Name to Agent ID. 
    // This is a bit tricky if we only have the name.
    // Ideally the UI passes the ID.
    // For now, let's try to find the agent by name, or insert without ID (Global).

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    let orgId = user.user_metadata?.org_id;

    let agentId = null;
    if (agentName && agentName !== "Global") {
        const { data: agent } = await supabase
            .from("agents")
            .select("id")
            .eq("organization_id", orgId)
            .ilike("name", agentName)
            .single();
        if (agent) agentId = agent.id;
    }

    // In a real app, 'compiled' comes from the "Compiler" (LLM). 
    // The UI is sending a JSON string.

    let compiledPolicy = {};
    try {
        compiledPolicy = JSON.parse(compiled);
    } catch (e) {
        console.error("Invalid JSON policy:", e);
        throw new Error("Invalid policy JSON");
    }

    const { error } = await supabase.from("rules").insert({
        organization_id: user.user_metadata.org_id, // Assuming metadata has it, or trigger handles it
        // Actually, RLS usually handles org_id via auth.uid() -> users table -> org_id.
        // Let's assume RLS or trigger, or we fetch it.
        // Since we don't have robust user implementation yet, we might fail here if column is not nullable.
        // Fallback: Let's assume the table has default function or we have it in metadata.
        // Re-reading page.tsx: user_metadata.org_id.
        nl_text: nl,
        compiled_policy: compiledPolicy,
        agent_id: agentId,
        status: "active",
        effect: "allow", // Default, could be parsed from JSON
        priority: 10
    });

    if (error) {
        throw new Error(error.message);
    }

    revalidatePath("/rules");
}

export async function deleteRule(id: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const orgId = user.user_metadata?.org_id;

    const { error } = await supabase.from("rules").delete().eq("id", id).eq("organization_id", orgId);
    if (error) throw new Error(error.message);
    revalidatePath("/rules");
}
