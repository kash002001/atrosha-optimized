import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";

function getAdmin() {
    const { createClient: createSBClient } = require("@supabase/supabase-js");
    return createSBClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

export async function POST() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = user.user_metadata?.org_id;
    if (!orgId) {
        return NextResponse.json({ error: "No organization found. Complete onboarding first." }, { status: 403 });
    }

    // C2: generate key, store only the SHA-256 hash in the organizations table
    const rawKey = `atrosha_${randomBytes(24).toString("hex")}`;
    const keyHash = createHash("sha256").update(rawKey).digest("hex");

    const admin = getAdmin();
    const { error } = await admin
        .from("organizations")
        .update({ api_key_hash: keyHash, updated_at: new Date().toISOString() })
        .eq("id", orgId);

    if (error) {
        console.error("regenerate-key DB error:", error.message);
        return NextResponse.json({ error: "Failed to rotate key" }, { status: 500 });
    }

    // return the raw key once — it will never be stored or retrievable again
    return NextResponse.json({ api_key: rawKey });
}
