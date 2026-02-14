import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";

// Helper to get admin client
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
    } catch (err: any) {
        console.error(`Webhook signature verification failed.`, err.message);
        return NextResponse.json({ error: err.message }, { status: 400 });
    }

    const admin = getAdmin();

    try {
        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object as any;
                const orgId = session.metadata?.orgId;

                if (orgId) {
                    console.log(`Processing checkout for Org: ${orgId}`);
                    // Update Org status to active
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
                // Good place to update 'current_period_end' if tracking locally
                const invoice = event.data.object as any;
                const subscriptionId = invoice.subscription;

                // Retrieve sub to get orgId if needed, or rely on customer mapping
                // For now, minimal implementation
                console.log(`Invoice paid for subscription: ${subscriptionId}`);
                break;
            }

            case "customer.subscription.deleted": {
                const subscription = event.data.object as any;
                const stripeCustomerId = subscription.customer;

                console.log(`Subscription canceled: ${subscription.id}`);
                // Downgrade to 'canceled' or 'explorer'
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
    } catch (error: any) {
        console.error("Webhook handler failed:", error);
        return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
    }

    return NextResponse.json({ received: true });
}
