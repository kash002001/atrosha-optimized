import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export const revalidate = 0;

export async function GET() {
    try {
        const supabase = await createClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

        const orgId = user.user_metadata?.org_id;
        if (!orgId) return NextResponse.json({ error: "onboarding incomplete" }, { status: 403 });

        const [txRes, agentRes, ruleRes, pendingRes] = await Promise.all([
            supabase
                .from('transactions')
                .select('id, amount, status', { count: 'exact' })
                .eq('organization_id', orgId),
            supabase
                .from('agents')
                .select('id, name, daily_limit_cents, per_tx_limit_cents, is_active, rate_limit_rpm')
                .eq('organization_id', orgId),
            supabase
                .from('rules')
                .select('*', { count: 'exact', head: true })
                .eq('organization_id', orgId)
                .eq('status', 'active'),
            supabase
                .from('transactions')
                .select('*', { count: 'exact', head: true })
                .eq('organization_id', orgId)
                .eq('status', 'pending'),
        ]);

        const txs = txRes.data || [];
        const agents = agentRes.data || [];

        // H6: filter daily_aggregates by agent IDs from this org only — prevents cross-org data leakage
        const agentIds = agents.map(a => a.id);
        const dailyRes = agentIds.length > 0
            ? await supabase
                .from('daily_aggregates')
                .select('agent_id, total_cents, tx_count, denied_count')
                .eq('day', new Date().toISOString().split('T')[0])
                .in('agent_id', agentIds)
            : { data: [] };

        const dailyAggs = dailyRes.data || [];

        const totalSpendCents = txs
            .filter(t => t.status === 'approved')
            .reduce((s, t) => s + (t.amount || 0), 0);

        const deniedCents = txs
            .filter(t => t.status === 'denied')
            .reduce((s, t) => s + (t.amount || 0), 0);

        const agentBurn = new Map<string, { spent: number; count: number }>();
        for (const agg of dailyAggs) {
            agentBurn.set(agg.agent_id, { spent: agg.total_cents, count: agg.tx_count });
        }

        const enrichedAgents = agents.map(a => ({
            id: a.id,
            name: a.name,
            dailyLimit: a.daily_limit_cents,
            perTxLimit: a.per_tx_limit_cents,
            active: a.is_active,
            rateLimit: a.rate_limit_rpm,
            todaySpent: agentBurn.get(a.id)?.spent ?? 0,
            todayTxCount: agentBurn.get(a.id)?.count ?? 0,
        }));

        return NextResponse.json({
            totalTransactions: txRes.count ?? txs.length,
            activeAgents: agents.filter(a => a.is_active).length,
            totalAgents: agents.length,
            activeRules: ruleRes.count ?? 0,
            pendingApprovals: pendingRes.count ?? 0,
            totalSpendCents,
            deniedCents,
            agents: enrichedAgents,
            ts: Date.now(),
        });
    } catch (err: unknown) {
        console.error("agent-stats error:", err);
        return NextResponse.json({ error: "internal" }, { status: 500 });
    }
}
