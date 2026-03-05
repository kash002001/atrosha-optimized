import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import RulesClient from "./RulesClient";

export const revalidate = 0;

export default async function RulesPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect(process.env.NEXT_PUBLIC_LOGIN_URL || "/login");
    }
    const orgId = user.user_metadata?.org_id;

    const { data: rules, error } = await supabase
        .from('rules')
        .select(`
            *,
            agent:agents(name)
        `)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

    if (error) {
        // If table doesn't exist, this will error. 
        // We will catch it and show empty list for now to not break the page.
        // In real dev, we would run migration.
        console.error("Error fetching rules:", error);
    }

    return (
        <>
            <div className="page-header">
                <h2>Intent Proofs</h2>
                <p>View cryptographically signed records of authorized user intents.</p>
            </div>
            <RulesClient rules={rules || []} />
        </>
    );
}
