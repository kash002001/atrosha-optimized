
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: Request) {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
        return NextResponse.json({ error: 'Stripe key missing' }, { status: 500 });
    }
    const stripe = new Stripe(stripeKey, { typescript: true });

    const body = await req.text();
    const sig = (await headers()).get('stripe-signature');

    let event: Stripe.Event;

    try {
        if (!sig || !endpointSecret) {
            // Development mode: Allow bypassing signature if secret is missing (optional, but risky in prod)
            // Ideally, just fail
            console.error('Missing Stripe signature or secret');
            return NextResponse.json({ error: 'Missing Stripe signature or secret' }, { status: 400 });
        }
        event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
    } catch (err: any) {
        console.error(`Webhook Error: ${err.message}`);
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        switch (event.type) {
            case 'checkout.session.completed':
                const session = event.data.object as Stripe.Checkout.Session;
                const customerId = session.customer as string;
                console.log(`Processing checkout for customer: ${customerId}`);

                // Update org to active
                const { error: checkoutError } = await supabase
                    .from('organizations')
                    .update({
                        subscription_status: 'active',
                        plan_tier: 'growth' // Default upgrade
                    })
                    .eq('stripe_cust', customerId);

                if (checkoutError) console.error('Error updating org (checkout):', checkoutError);
                break;

            case 'customer.subscription.updated':
            case 'customer.subscription.deleted':
                const subscription = event.data.object as Stripe.Subscription;
                const status = subscription.status;
                const custId = subscription.customer as string;
                console.log(`Updating subscription status to ${status} for customer: ${custId}`);

                const { error: subError } = await supabase
                    .from('organizations')
                    .update({ subscription_status: status })
                    .eq('stripe_cust', custId);

                if (subError) console.error('Error updating org (sub):', subError);
                break;

            default:
                // console.log(`Unhandled event type ${event.type}`);
                break;
        }
    } catch (err) {
        console.error('Error processing webhook logic:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }

    return NextResponse.json({ received: true });
}
