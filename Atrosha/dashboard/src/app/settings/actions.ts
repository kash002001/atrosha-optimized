"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function saveAlertConfig(webhookUrl: string, thresholdPct: number, enabled: boolean) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const orgId = user.user_metadata?.org_id;
    if (!orgId) throw new Error("No org");

    // upsert — one config per org
    const { error } = await supabase
        .from("alert_configs")
        .upsert({
            organization_id: orgId,
            webhook_url: webhookUrl,
            threshold_pct: thresholdPct,
            enabled,
        }, { onConflict: "organization_id" });

    if (error) throw new Error(error.message);
    revalidatePath("/settings");
}
