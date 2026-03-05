"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function addRule(nl: string, compiled: string, agentName: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const orgId = user.user_metadata?.org_id;
    let agentId = null;
    if (agentName && agentName !== "Global") {
        const { data: agent } = await supabase
            .from("agents").select("id")
            .eq("organization_id", orgId).ilike("name", agentName).single();
        if (agent) agentId = agent.id;
    }

    let compiledPolicy = {};
    try { compiledPolicy = JSON.parse(compiled); }
    catch { throw new Error("Invalid policy JSON"); }

    const { error } = await supabase.from("rules").insert({
        organization_id: orgId,
        nl_text: nl,
        compiled_policy: compiledPolicy,
        agent_id: agentId,
        status: "active",
        effect: "allow",
        priority: 10
    });

    if (error) throw new Error(error.message);
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

export async function toggleRule(id: string, currentStatus: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const orgId = user.user_metadata?.org_id;
    const newStatus = currentStatus === "active" ? "disabled" : "active";

    const { error } = await supabase
        .from("rules")
        .update({ status: newStatus })
        .eq("id", id)
        .eq("organization_id", orgId);

    if (error) throw new Error(error.message);
    revalidatePath("/rules");
}

export async function testRule(payloadStr: string): Promise<{
    verdict: string;
    confidence: number;
    source: string;
    reason: string;
    latency_ms: number;
}> {
    const engineUrl = process.env.SEMANTIC_ENGINE_URL || "https://atrosha-engine.onrender.com";

    let payload: Record<string, unknown>;
    try { payload = JSON.parse(payloadStr) as Record<string, unknown>; }
    catch { throw new Error("Invalid JSON payload"); }

    const res = await fetch(`${engineUrl}/classify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            target_url: ((payload?.transaction as Record<string, unknown>)?.destination as string) ?? "test",
            payload,
        }),
        // next.js server can talk to render directly
        cache: "no-store",
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Engine returned ${res.status}: ${text}`);
    }

    const data = await res.json();
    return {
        verdict: data.verdict,
        confidence: data.confidence,
        source: data.source ?? "semantic_v3",
        reason: data.reason ?? "",
        latency_ms: data.latency_ms,
    };
}
