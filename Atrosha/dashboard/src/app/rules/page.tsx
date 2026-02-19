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

    const { data: rules, error } = await supabase
        .from('rules')
        .select(`
            *,
            agent:agents(name)
        `)
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
                <h2>Rules</h2>
                <p>Define natural-language rules — they&apos;re compiled into enforceable agent policies automatically.</p>
            </div>
            <RulesClient rules={rules || []} />
        </>
    );
}
