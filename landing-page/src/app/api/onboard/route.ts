import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomBytes, createHash } from "crypto";
import { sendWelcomeEmail } from "@/lib/email";
import { stripe } from "@/lib/stripe";
import { checkOrigin } from "@/lib/csrf";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function getAdmin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

const PLAN_PRICE_IDS: Record<string, string> = {
    growth: process.env.STRIPE_PRICE_GROWTH || "price_1T0KXIC71o1yQxw3YdHH6cpi",
    scale: process.env.STRIPE_PRICE_SCALE || "price_1T0KYqC71o1yQxw3BySz8bHw",
    enterprise: "",
};

// H4: escape org_name for safe HTML interpolation
function escapeHtml(str: string): string {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

export async function POST(req: Request) {
    const blocked = checkOrigin(req);
    if (blocked) return blocked;

    // H4: rate limit onboard — it's a high-cost endpoint (DB + Stripe + email)
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "anonymous";
    const { success } = checkRateLimit(ip, 5, 3600_000); // 5 per hour
    if (!success) {
        return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const admin = getAdmin();
        const { data: { user }, error: authError } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));

        if (authError || !user) {
            return NextResponse.json({ error: "Invalid user session" }, { status: 401 });
        }

        let { user_id, org_name, slug, plan_tier } = await req.json();

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!user_id || !uuidRegex.test(user_id) || user_id !== user.id) {
            return NextResponse.json({ error: "Invalid or unauthorized user_id" }, { status: 403 });
        }

        // M3: use the verified JWT email, never trust email from the request body
        const email = user.email;

        org_name = org_name?.replace(/<[^>]*>?/gm, "")?.trim();
        slug = slug?.toLowerCase()?.replace(/[^a-z0-9]+/g, "-")?.replace(/(^-|-$)/g, "");

        if (!org_name || !slug) {
            return NextResponse.json({ error: "Valid org_name and slug required" }, { status: 400 });
        }

        if (org_name.length > 100) {
            return NextResponse.json({ error: "org_name too long" }, { status: 400 });
        }

        const rawKey = `atrosha_${randomBytes(24).toString("hex")}`;
        const keyHash = createHash("sha256").update(rawKey).digest("hex");

        const { data: orgData, error: orgError } = await admin.from("organizations").insert({
            name: org_name,
            slug,
            api_key_hash: keyHash,
            plan_tier: plan_tier || "explorer",
        }).select("id").single();

        if (orgError) {
            if (orgError.code === "23505") {
                return NextResponse.json({ error: "Organization name/slug already taken" }, { status: 409 });
            }
            throw new Error(orgError.message);
        }

        const orgId = orgData.id;

        await admin.from("organization_members").insert({
            user_id,
            org_id: orgId,
            role: "owner",
        });

        // M4: escape org_name before HTML interpolation
        if (email) {
            sendWelcomeEmail(email, escapeHtml(org_name)).catch(console.error);
        }

        let checkoutUrl = null;
        if (plan_tier && plan_tier !== "explorer" && PLAN_PRICE_IDS[plan_tier]) {
            try {
                const customer = await stripe.customers.create({
                    email,
                    name: org_name,
                    metadata: { orgId, userId: user_id }
                });

                await admin.from("organizations").update({
                    stripe_customer_id: customer.id
                }).eq("id", orgId);

                const session = await stripe.checkout.sessions.create({
                    customer: customer.id,
                    mode: "subscription",
                    payment_method_types: ["card"],
                    line_items: [{ price: PLAN_PRICE_IDS[plan_tier], quantity: 1 }],
                    metadata: { orgId },
                    success_url: `${process.env.NEXT_PUBLIC_DASHBOARD_URL}/?success=true`,
                    cancel_url: `${process.env.NEXT_PUBLIC_DASHBOARD_URL}/?canceled=true`,
                });

                checkoutUrl = session.url;
            } catch (stripeError) {
                console.error("Stripe Error:", stripeError);
            }
        }

        return NextResponse.json({
            org_id: orgId,
            api_key: rawKey,
            checkout_url: checkoutUrl,
            message: "Organization successfully created and linked.",
        });

    } catch (err: unknown) {
        console.error("ONBOARD ERROR:", err);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
