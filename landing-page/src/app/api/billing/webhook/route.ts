import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

function getAdmin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

export async function POST(req: Request) {
    const body = await req.text();
    const signature = (await headers()).get("Stripe-Signature") as string;

    let event;

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
    } catch (err: unknown) {
        console.error(`Webhook signature verification failed.`, err instanceof Error ? err.message : String(err));
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown Error' }, { status: 400 });
    }

    const admin = getAdmin();

    try {
        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object as Stripe.Checkout.Session;
                const orgId = session.metadata?.orgId;

                if (orgId) {
                    console.log(`Processing checkout for Org: ${orgId}`);
                    const { error } = await admin
                        .from("organizations")
                        .update({
                            subscription_status: "active",
                            stripe_customer_id: session.customer,
                            stripe_subscription_id: session.subscription,
                            updated_at: new Date().toISOString(),
                        })
                        .eq("id", orgId);

                    if (error) throw error;
                }
                break;
            }

            case "invoice.payment_succeeded": {
                const invoice = event.data.object as Stripe.Invoice;
                const subId = (invoice as unknown as Record<string, unknown>).subscription as string;
                console.log(`Invoice paid for subscription: ${subId}`);
                break;
            }

            case "customer.subscription.deleted": {
                const subscription = event.data.object as Stripe.Subscription;
                const stripeCustomerId = subscription.customer;

                console.log(`Subscription canceled: ${subscription.id}`);
                const { error } = await admin
                    .from("organizations")
                    .update({
                        subscription_status: "canceled",
                        plan_tier: "explorer"
                    })
                    .eq("stripe_customer_id", stripeCustomerId);

                if (error) console.error("Error canceling sub:", error);
                break;
            }
        }
    } catch (err: unknown) {
        console.error("ONBOARD ERROR:", err);
        return NextResponse.json({ error: err instanceof Error ? err.message : "Internal error" }, { status: 500 });
    }

    return NextResponse.json({ received: true });
}
