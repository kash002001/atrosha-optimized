import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase";
import { cookies } from "next/headers";

export async function POST(req: Request) {
    try {
        const { priceId, orgId } = await req.json();

        if (!priceId || !orgId) {
            return NextResponse.json({ error: "Missing priceId or orgId" }, { status: 400 });
        }

        // Verify user owns the org (security check)
        const cookieStore = await cookies();
        const supabase = createClient(cookieStore);
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Create Checkout Session
        const session = await stripe.checkout.sessions.create({
            mode: "subscription",
            payment_method_types: ["card"],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            customer_email: user.email,
            client_reference_id: orgId, // Pass orgId to webhook
            metadata: {
                orgId: orgId,
                userId: user.id
            },
            success_url: `${process.env.NEXT_PUBLIC_DASHBOARD_URL}/?success=true`,
            cancel_url: `${process.env.NEXT_PUBLIC_DASHBOARD_URL}/?canceled=true`,
        });

        return NextResponse.json({ url: session.url });
    } catch (err: unknown) {
        console.error('Error creating checkout session:', err);
        return NextResponse.json(
            { error: 'Error creating checkout session', details: err instanceof Error ? err.message : String(err) },
            { status: 500 }
        );
    }
}
