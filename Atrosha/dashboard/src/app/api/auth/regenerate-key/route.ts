import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { randomBytes, createHash } from "crypto";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

function getAdmin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();

        // 1. Verify User Session
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() { return cookieStore.getAll() },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) =>
                                cookieStore.set(name, value, options)
                            )
                        } catch {
                            // The `setAll` method was called from a Server Component.
                            // This can be ignored if you have middleware refreshing
                            // user sessions.
                        }
                    }
                }
            }
        );

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 2. Get User's Org (Simplification: assuming 1 org per user for MVP)
        // In a real app we'd pass org_id in body and verify membership
        const admin = getAdmin();
        const { data: memberData, error: memberError } = await admin
            .from("organization_members")
            .select("org_id, role")
            .eq("user_id", user.id)
            .single();

        if (memberError || !memberData) {
            return NextResponse.json({ error: "Organization not found" }, { status: 404 });
        }

        // 3. Generate New Key
        const rawKey = `atrosha_${randomBytes(24).toString("hex")}`;
        const keyHash = createHash("sha256").update(rawKey).digest("hex");

        // 4. Update DB
        const { error: updateError } = await admin
            .from("organizations")
            .update({ api_key_hash: keyHash, updated_at: new Date().toISOString() })
            .eq("id", memberData.org_id);

        if (updateError) {
            throw new Error(updateError.message);
        }

        // 5. Return Raw Key (Once)
        return NextResponse.json({ api_key: rawKey });

    } catch (err: any) {
        console.error("Regenerate Key Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
