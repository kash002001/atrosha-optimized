
import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check for Stripe Key at Runtime
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
        console.error("STRIPE_SECRET_KEY is missing");
        return NextResponse.json({ error: "Billing is not configured." }, { status: 500 });
    }

    // Initialize Stripe only when needed (Runtime)
    const stripe = new Stripe(stripeKey, {
        typescript: true,
    });

    // 1. Get Org & Stripe Customer ID
    const { data: org } = await supabase
        .from("organizations")
        .select("stripe_cust")
        .eq("id", user.user_metadata.org_id)
        .single();

    let stripeCustomerId = org?.stripe_cust;

    // lazy-create Stripe customer if none exists yet
    if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
            email: user.email,
            metadata: {
                org_id: user.user_metadata.org_id,
                user_id: user.id,
            },
            name: user.user_metadata.org_name || "Organization",
        });
        stripeCustomerId = customer.id;

        // Save it for next time
        await supabase
            .from("organizations")
            .update({ stripe_cust: stripeCustomerId })
            .eq("id", user.user_metadata.org_id);
    }

    try {
        const session = await stripe.billingPortal.sessions.create({
            customer: stripeCustomerId,
            return_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://app.atrosha.bond"}/settings`,
        });

        return NextResponse.json({ url: session.url });
    } catch (err: unknown) {
        // H4: log full error server-side, return generic message to client
        console.error("billing portal error:", err);
        return NextResponse.json({ error: "Billing portal unavailable. Please try again." }, { status: 500 });
    }
}
