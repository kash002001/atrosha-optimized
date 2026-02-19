import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomBytes, createHash } from "crypto";
import { sendWelcomeEmail } from "@/lib/email";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

function getAdmin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

// Map plan names to Stripe Price IDs (Supports both Test and Live via Env Vars)
const PLAN_PRICE_IDS: Record<string, string> = {
    growth: process.env.STRIPE_PRICE_GROWTH || "price_1T0KXIC71o1yQxw3YdHH6cpi", // Default to Test ID if missing
    scale: process.env.STRIPE_PRICE_SCALE || "price_1T0KYqC71o1yQxw3BySz8bHw",
    enterprise: "", // Custom flow
};

export async function POST(req: Request) {
    try {
        const { user_id, org_name, slug, email, plan_tier } = await req.json();

        if (!org_name || !slug) {
            return NextResponse.json({ error: "org_name and slug required" }, { status: 400 });
        }

        const rawKey = `atrosha_${randomBytes(24).toString("hex")}`;
        const keyHash = createHash("sha256").update(rawKey).digest("hex");

        const admin = getAdmin();

        // 1. Create Organization in Supabase
        const { data: orgData, error: orgError } = await admin.from("organizations").insert({
            name: org_name,
            slug,
            api_key_hash: keyHash,
            plan_tier: plan_tier || "explorer",
        }).select("id").single();

        if (orgError) {
            if (orgError.code === "23505") { // Unique violation
                return NextResponse.json({ error: "Organization name/slug already taken" }, { status: 409 });
            }
            throw new Error(orgError.message);
        }

        const orgId = orgData.id;

        // 2. Link User to Org
        if (user_id) {
            await admin.from("organization_members").insert({
                user_id,
                org_id: orgId,
                role: "owner",
            });
        }

        // 3. Send Welcome Email (Async, don't block)
        if (email) {
            sendWelcomeEmail(email, org_name).catch(console.error);
        }

        // 4. Handle Stripe for Paid Plans
        let checkoutUrl = null;
        if (plan_tier && plan_tier !== "explorer" && PLAN_PRICE_IDS[plan_tier]) {
            try {
                // Create Stripe Customer
                const customer = await stripe.customers.create({
                    email,
                    name: org_name,
                    metadata: {
                        orgId: orgId,
                        userId: user_id
                    }
                });

                // Update Org with Stripe Customer ID
                await admin.from("organizations").update({
                    stripe_customer_id: customer.id
                }).eq("id", orgId);

                // Create Checkout Session
                const session = await stripe.checkout.sessions.create({
                    customer: customer.id,
                    mode: "subscription",
                    payment_method_types: ["card"],
                    line_items: [{ price: PLAN_PRICE_IDS[plan_tier], quantity: 1 }],
                    metadata: { orgId: orgId },
                    success_url: `${process.env.NEXT_PUBLIC_DASHBOARD_URL}/?success=true`,
                    cancel_url: `${process.env.NEXT_PUBLIC_DASHBOARD_URL}/?canceled=true`,
                });

                checkoutUrl = session.url;
            } catch (stripeError) {
                console.error("Stripe Error:", stripeError);
                // Continue, don't fail onboarding. User can upgrade later.
            }
        }

        return NextResponse.json({
            org_id: orgId,
            api_key: rawKey,
            checkout_url: checkoutUrl,
            message: "Organization created",
        });

    } catch (err: any) {
        console.error("ONBOARD ERROR:", err);
        return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
    }
}
