import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
    try {
        const { priceId, orgId } = await req.json();

        if (!priceId || !orgId || !UUID_RE.test(orgId)) {
            return NextResponse.json({ error: "Missing or invalid priceId/orgId" }, { status: 400 });
        }

        const cookieStore = await cookies();
        const supabase = createClient(cookieStore);
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // verify the user actually belongs to this org (M7 fix)
        const admin = createAdmin(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        const { data: membership } = await admin
            .from("organization_members")
            .select("role")
            .eq("org_id", orgId)
            .eq("user_id", user.id)
            .single();

        if (!membership) {
            return NextResponse.json({ error: "Forbidden: not a member of this org" }, { status: 403 });
        }

        const session = await stripe.checkout.sessions.create({
            mode: "subscription",
            payment_method_types: ["card"],
            line_items: [{ price: priceId, quantity: 1 }],
            customer_email: user.email,
            client_reference_id: orgId,
            metadata: { orgId, userId: user.id },
            success_url: `${process.env.NEXT_PUBLIC_DASHBOARD_URL}/?success=true`,
            cancel_url: `${process.env.NEXT_PUBLIC_DASHBOARD_URL}/?canceled=true`,
        });

        return NextResponse.json({ url: session.url });
    } catch (err: unknown) {
        console.error('Error creating checkout session:', err);
        return NextResponse.json(
            { error: 'Error creating checkout session' },
            { status: 500 }
        );
    }
}
