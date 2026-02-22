"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

const toHex = (arr: Uint8Array) => Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');

export async function createAgent(name: string, limit: number) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    const orgId = user.user_metadata?.org_id;

    // Generate Ed25519 Keypair using Web Crypto API (Vercel Edge Compatible)
    const keyPair = await crypto.subtle.generateKey(
        "Ed25519",
        true,
        ["sign", "verify"]
    ) as CryptoKeyPair;

    const pubKeyBuffer = await crypto.subtle.exportKey("raw", keyPair.publicKey);
    const privKeyBuffer = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

    // Extract raw 32-byte private key from PKCS8 envelope
    // Ed25519 PKCS8 DER format has a 16-byte header, so the last 32 bytes are the raw key
    const privBytes = new Uint8Array(privKeyBuffer);
    const rawPrivBytes = privBytes.slice(privBytes.length - 32);

    const pubHex = toHex(new Uint8Array(pubKeyBuffer));
    const privHex = toHex(rawPrivBytes);

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
