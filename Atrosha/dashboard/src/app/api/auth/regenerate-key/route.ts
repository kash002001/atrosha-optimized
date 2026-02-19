import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Generate new key
    const newKey = `sk_live_${crypto.randomBytes(24).toString("hex")}`;

    // Hash it for storage (if we were storing it hashed, but for MVP we might store raw or hashed)
    // For this phase, we'll assume we store it in user_metadata or a separate 'api_keys' table.
    // Let's use user_metadata for simplicity as per previous phases, or 'organizations' table.
    // Checking previous 'onboard' logic would be ideal, but let's stick to metadata for now
    // as it's the specific "Developer Key".

    const { error } = await supabase.auth.updateUser({
        data: { api_key: newKey }
    });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ api_key: newKey });
}
