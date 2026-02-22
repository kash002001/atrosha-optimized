"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import nacl from "tweetnacl";

export async function createAgent(name: string, limit: number) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    const orgId = user.user_metadata?.org_id;

    // Generate Ed25519 Keypair for the bot
    const keyPair = nacl.sign.keyPair();
    const pubHex = Buffer.from(keyPair.publicKey).toString('hex');
    const privHex = Buffer.from(keyPair.secretKey).toString('hex');

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
    return { ...data, _privateKey: privHex };
}
