import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const WINDOW_MINUTES = 5;
const MIN_TX_FOR_ALERT = 3; // need at least 3 denies before alarming

Deno.serve(async (req: Request) => {
    // Database webhook sends the new row as JSON
    let body: any;
    try {
        body = await req.json();
    } catch {
        return new Response("bad request", { status: 400 });
    }

    const record = body?.record;
    if (!record) return new Response("ok", { status: 200 });

    const org_id = record.organization_id;
    if (!org_id) return new Response("ok", { status: 200 }); // no org, skip

    const supa = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // fetch alert config for this org
    const { data: config } = await supa
        .from("alert_configs")
        .select("*")
        .eq("organization_id", org_id)
        .eq("enabled", true)
        .single();

    if (!config?.webhook_url) return new Response("ok", { status: 200 });

    // count transactions in the last N minutes for this org
    const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();

    const { data: txns, error } = await supa
        .from("transactions")
        .select("status")
        .eq("organization_id", org_id)
        .gte("created_at", windowStart);

    if (error || !txns?.length) return new Response("ok", { status: 200 });

    const total = txns.length;
    const denied = txns.filter((t: any) => t.status === "denied").length;
    const denyRate = Math.round((denied / total) * 100);

    if (denied < MIN_TX_FOR_ALERT || denyRate < config.threshold_pct) {
        return new Response("ok", { status: 200 });
    }

    // fire the webhook
    const payload = {
        event: "atrosha.alert.deny_spike",
        organization_id: org_id,
        deny_rate_pct: denyRate,
        denied_count: denied,
        total_count: total,
        window_minutes: WINDOW_MINUTES,
        window_start: windowStart,
        threshold_pct: config.threshold_pct,
        sample_tx_id: record.id,
        fired_at: new Date().toISOString(),
    };

    try {
        await fetch(config.webhook_url, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Atrosha-Event": "deny_spike" },
            body: JSON.stringify(payload),
        });

        // record last fired timestamp
        await supa
            .from("alert_configs")
            .update({ last_fired_at: new Date().toISOString() })
            .eq("id", config.id);
    } catch (e) {
        console.error("webhook delivery failed:", e);
    }

    return new Response(JSON.stringify({ fired: true, deny_rate_pct: denyRate }), {
        headers: { "Content-Type": "application/json" },
    });
});
