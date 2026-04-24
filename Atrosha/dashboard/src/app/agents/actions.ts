"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import nacl from "tweetnacl";

const toHex = (arr: Uint8Array) => Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');

export async function createAgent(name: string, limit: number) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return { error: "Unauthorized: User session missing" };

        // C2: hard-fail if org_id is missing — no DB fallback to prevent org escalation
        const orgId = user.user_metadata?.org_id;
        if (!orgId) {
            return { error: "Organization not found. Please complete onboarding before creating agents." };
        }

        const keyPair = nacl.sign.keyPair();
        const pubHex = toHex(keyPair.publicKey);
        const privHex = toHex(keyPair.secretKey.slice(0, 32));

        const { data, error } = await supabase.from('agents').insert({
            name,
            organization_id: orgId,
            pubkey: pubHex,
            daily_limit_cents: limit,
            is_active: true
        }).select().single();

        if (error) {
            return { error: `Database error: ${error.message}` };
        }

        // C1: fail hard if ADMIN_SECRET is not set — no "change-me" fallback
        const adminSecret = process.env.ADMIN_SECRET;
        if (!adminSecret) {
            console.error("ADMIN_SECRET env var is not set — agent created in DB but not synced to proxy");
            const plainData = JSON.parse(JSON.stringify(data));
            return { data: { ...plainData, _privateKey: privHex }, warning: "Proxy sync skipped: ADMIN_SECRET not configured" };
        }

        const proxyUrl = process.env.NEXT_PUBLIC_PROXY_URL || "https://atrosha.onrender.com";

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);

            const syncRes = await fetch(`${proxyUrl}/admin/agents`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Atrosha-Admin-Secret": adminSecret,
                    "X-Atrosha-Org-ID": orgId
                },
                body: JSON.stringify({
                    agent_id: data.id,
                    pub_hex: pubHex,
                    role: "General Purpose"
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!syncRes.ok) {
                console.error("Failed to sync agent to Proxy", await syncRes.text());
            }
        } catch (syncErr: unknown) {
            console.warn("Network error or timeout syncing to proxy. Agent created in DB.", syncErr instanceof Error ? syncErr.message : String(syncErr));
        }

        revalidatePath("/agents");

        const plainData = JSON.parse(JSON.stringify(data));
        return { data: { ...plainData, _privateKey: privHex } };
    } catch (err: unknown) {
        return { error: `Server crash: ${err instanceof Error ? err.message : String(err)}` };
    }
}
