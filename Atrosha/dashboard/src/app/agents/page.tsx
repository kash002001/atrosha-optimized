import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import AgentsClient from "./AgentsClient";

export const revalidate = 0;

export default async function AgentsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect(process.env.NEXT_PUBLIC_LOGIN_URL || "/login");
    }

    // Try to fetch agents. If table doesn't exist or is empty, it will return error or empty.
    // Assuming table 'agents' exists from previous phases.
    /* 
      Table schema guess:
      agents (
        id text primary key, -- agent_id
        org_id uuid references organizations,
        created_at timestamptz
      )
    */
    const orgId = user.user_metadata?.org_id;

    const { data: agents, error } = await supabase
        .from('agents')
        .select('*')
        .eq('organization_id', orgId)
        .limit(50);

    if (error) {
        console.warn("Could not fetch agents (table might be missing or permissions):", error.message);
    }

    return (
        <>
            <div className="page-header">
                <h2>Agents</h2>
                <p>Manage your active agents, spending limits, and security policies.</p>
            </div>
            <AgentsClient agents={agents || []} />
        </>
    );
}
