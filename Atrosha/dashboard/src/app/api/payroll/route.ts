import { createClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export const revalidate = 0;

export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

        const orgId = user.user_metadata?.org_id;
        const tab = req.nextUrl.searchParams.get('tab') || 'pending';

        const statusFilter = tab === 'approved' ? 'approved'
            : tab === 'denied' ? 'denied'
            : 'pending';

        // fetch transactions matching the filter
        const { data: txs, error: txErr } = await supabase
            .from('transactions')
            .select('*')
            .eq('organization_id', orgId)
            .eq('status', statusFilter)
            .order('created_at', { ascending: false })
            .limit(100);

        if (txErr) throw txErr;

        // fetch all agents for limit display
        const { data: agents } = await supabase
            .from('agents')
            .select('id, name, daily_limit_cents, per_tx_limit_cents, is_active')
            .eq('organization_id', orgId);

        // M1: filter by this org's agents — same cross-tenant fix as agent-stats H6
        const agentIds = (agents || []).map(a => a.id);
        const { data: aggs } = agentIds.length > 0
            ? await supabase
                .from('daily_aggregates')
                .select('agent_id, total_cents, tx_count, denied_count')
                .eq('day', new Date().toISOString().split('T')[0])
                .in('agent_id', agentIds)
            : { data: [] };

        // L1: typed agent budget map
        interface AgentBudget { name: string; dailyLimit: number; perTxLimit: number; todaySpent: number; remaining: number; }
        const agentMap: Record<string, AgentBudget> = {};
        for (const a of agents || []) {
            const agg = (aggs || []).find(g => g.agent_id === a.id);
            agentMap[a.id] = {
                name: a.name,
                dailyLimit: a.daily_limit_cents,
                perTxLimit: a.per_tx_limit_cents,
                todaySpent: agg?.total_cents ?? 0,
                remaining: a.daily_limit_cents - (agg?.total_cents ?? 0),
            };
        }

        return NextResponse.json({ transactions: txs || [], agents: agentMap });
    } catch (err: unknown) {
        console.error("payroll GET error:", err);
        return NextResponse.json({ error: "internal" }, { status: 500 });
    }
}

const MAX_BATCH = 100;

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

        const orgId = user.user_metadata?.org_id;
        const body = await req.json();
        const { transactionIds, decision, reason } = body as {
            transactionIds: string[];
            decision: 'approved' | 'denied';
            reason?: string;
        };

        if (!transactionIds?.length || !decision) {
            return NextResponse.json({ error: "missing transactionIds or decision" }, { status: 400 });
        }

        // M1: cap batch size — prevents DB hammering and limits blast radius for insider abuse
        if (transactionIds.length > MAX_BATCH) {
            return NextResponse.json(
                { error: `Batch size exceeds maximum of ${MAX_BATCH}` },
                { status: 400 }
            );
        }

        // update transaction status
        const { error: txErr } = await supabase
            .from('transactions')
            .update({ status: decision, updated_at: new Date().toISOString() })
            .in('id', transactionIds)
            .eq('organization_id', orgId);

        if (txErr) throw txErr;

        // write approval records
        const approvalRows = transactionIds.map(txId => ({
            organization_id: orgId,
            tx_id: txId,
            agent_id: body.agentId || null,
            approver: user.email || 'dashboard',
            decision,
            reason: reason || null,
        }));

        const { error: apErr } = await supabase
            .from('approvals')
            .insert(approvalRows);

        if (apErr) console.error("approval insert warning:", apErr);

        return NextResponse.json({ ok: true, count: transactionIds.length });
    } catch (err: unknown) {
        console.error("payroll POST error:", err);
        return NextResponse.json({ error: "internal" }, { status: 500 });
    }
}
