"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import nacl from "tweetnacl";

const toHex = (arr: Uint8Array) => Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');

export async function createAgent(name: string, limit: number) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    const orgId = user.user_metadata?.org_id;

    // Generate Ed25519 Keypair for the bot
    const keyPair = nacl.sign.keyPair();
    const pubHex = toHex(keyPair.publicKey);
    const privHex = toHex(keyPair.secretKey);

    const { data, error } = await supabase.from('agents').insert({
        name,
        ...(orgId && { organization_id: orgId }),
        pubkey: pubHex,
        daily_limit_cents: limit,
        is_active: true
    }).select().single();

    if (error) {
        throw new Error(error.message);
    }

    revalidatePath("/agents");

    // We only return the private key once. It is never stored in our DB.
    // JSON parse/stringify ensures we don't return complex objects across the Server Action boundary
    const plainData = JSON.parse(JSON.stringify(data));
    return { ...plainData, _privateKey: privHex };
}
