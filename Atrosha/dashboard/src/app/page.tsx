import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import {
  Plus, FileText
} from "lucide-react";
import { redirect } from "next/navigation";
import { VolumeChart, Sparkline } from "./components/DashboardCharts";
import DashboardAgentStats from "./components/DashboardAgentStats";


export const revalidate = 0; // Ensure dynamic data

export default async function Overview() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(process.env.NEXT_PUBLIC_LOGIN_URL || "/login");
  }
  const orgId = user.user_metadata?.org_id;

  // Fetch Transactions
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('id, amount, status, created_at, currency')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(1000); // Reasonable limit for overview

  if (error) {
    console.error("Error fetching transactions:", error);
    // Do not throw, just show empty state
  }

  const txs = transactions || [];

  // --- Calculate Metrics ---

  // 1. Total Transactions
  const totalTransactions = txs.length;

  // 2. Amount Saved (Sum of 'denied' transactions)
  const amountSaved = txs
    .filter(t => t.status === 'denied')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  // 3. Active Agents
  const { count: agentCount } = await supabase
    .from('agents')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId);
  const activeAgents = agentCount || 0;

  // 4. Volume Chart Data (Real 24h historical aggregation)
  const chartBuckets: { t: string, approved: number, denied: number }[] = [];
  const BUCKETS = 12; // 2-hour intervals covering 24h
  const now = new Date();

  // Initialize buckets from oldest (-24h) to newest (Now)
  for (let i = BUCKETS; i >= 0; i--) {
    const d = new Date(now.getTime() - (i * 2) * 60 * 60 * 1000);
    const hour = d.getHours();
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    chartBuckets.push({
      t: `${displayHour} ${ampm}`,
      approved: 0,
      denied: 0
    });
  }

  // Populate from real transactions
  txs.forEach(t => {
    const tDate = new Date(t.created_at);
    const hoursDiff = (now.getTime() - tDate.getTime()) / (1000 * 60 * 60);

    // If the transaction occurred within the last 24 hours
    if (hoursDiff <= 24 && hoursDiff >= 0) {
      // Index 0 = 24h ago, Index BUCKETS = Now
      const bucketIndex = Math.floor((24 - hoursDiff) / 2);
      if (bucketIndex >= 0 && bucketIndex <= BUCKETS) {
        if (t.status === 'approved') chartBuckets[bucketIndex].approved += 1;
        if (t.status === 'denied') chartBuckets[bucketIndex].denied += 1;
      }
    }
  });

  const volumeData = chartBuckets;

  // --- Sparkline Data ---
  // Just map the last 20 transaction amounts
  const sparklineData = txs.slice(0, 20).map(t => ({ v: t.amount })).reverse();
  const savedSparklineData = txs.filter(t => t.status === 'denied').slice(0, 20).map(t => ({ v: t.amount })).reverse();


  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 40 }}>
      {/* Header */}
      <div className="page-header" style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>Overview</h2>
          <p style={{ fontSize: 14, color: "var(--text-muted)" }}>Financial performance for <span style={{ fontWeight: 600, color: "var(--text)" }}>{user.user_metadata?.org_name || "Atrosha Corp"}</span>.</p>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {/* Functional Buttons */}
          <Link href="/transactions" className="btn-secondary" style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 14px",
            background: "#fff",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            fontSize: 13,
            fontWeight: 500,
            color: "var(--text-muted)",
            textDecoration: "none",
            boxShadow: "var(--shadow-soft)",
          }}>
            <FileText size={14} /> All Transactions
          </Link>

          <Link href="/rules" className="btn-secondary" style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 14px",
            background: "var(--primary)",
            color: "#fff",
            border: "1px solid var(--primary)",
            borderRadius: "var(--radius-sm)",
            fontSize: 13,
            fontWeight: 500,
            textDecoration: "none",
            boxShadow: "var(--shadow-soft)",
          }}>
            <Plus size={14} /> Lock Intent
          </Link>
        </div>
      </div>

      {/* Sovereign Agent Stats */}
      <DashboardAgentStats />

      {/* Main Chart */}
      <div className="chart-card" style={{ padding: 24, minHeight: 400, marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Total Volume (Realtime)</h3>

        </div>
        <div style={{ height: 320 }}>
          {/* Always pass data to show scaffolding + empty state overlay if needed */}
          <VolumeChart data={volumeData} totalTransactions={totalTransactions} />
        </div>
      </div>

      {/* Metric Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div className="stat-card" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Total Transactions</span>
              <div className="stat-value" style={{ fontSize: 24, marginTop: 4 }}>{totalTransactions.toLocaleString()}</div>
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            <Sparkline color="#059669" data={sparklineData} />
          </div>
        </div>

        <div className="stat-card" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Amount Saved</span>
              <div className="stat-value" style={{ fontSize: 24, marginTop: 4 }}>
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amountSaved / 100)}
              </div>
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            <Sparkline color="#0D9488" data={savedSparklineData} />
          </div>
        </div>

        <div className="stat-card" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Active Agents</span>
              <div className="stat-value" style={{ fontSize: 24, marginTop: 4 }}>{activeAgents}</div>
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            <Sparkline color="#64748B" data={[]} />
          </div>
        </div>
      </div>

      {/* Financial Reports Table */}
      <div className="chart-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-secondary)" }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-dim)" }}>Recent Transactions</h3>
          <Link href="/transactions" style={{ fontSize: 12, color: "var(--primary)", background: "none", border: "none", fontWeight: 600, cursor: "pointer", textDecoration: "none" }}>View all</Link>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ padding: "12px 24px", textAlign: 'left', fontSize: 12, color: 'var(--text-muted)' }}>Status</th>
              <th style={{ padding: "12px 24px", textAlign: 'right', fontSize: 12, color: 'var(--text-muted)' }}>Amount</th>
              <th style={{ padding: "12px 24px", textAlign: 'right', fontSize: 12, color: 'var(--text-muted)' }}>Date</th>
            </tr>
          </thead>
          <tbody>
            {txs.slice(0, 5).map((t) => (
              <tr key={t.id}>
                <td style={{ fontWeight: 500, padding: "12px 24px" }}>
                  <span style={{
                    color: t.status === 'approved' ? 'var(--green)' : 'var(--red)',
                    background: t.status === 'approved' ? 'var(--green-bg)' : 'var(--red-bg)',
                    padding: '2px 8px', borderRadius: 4, fontSize: 12
                  }}>
                    {t.status}
                  </span>
                </td>
                <td style={{ textAlign: "right", fontWeight: 600, padding: "12px 24px" }}>
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: t.currency || 'USD' }).format((t.amount || 0) / 100)}
                </td>
                <td style={{ textAlign: "right", padding: "12px 24px", fontSize: 13, color: 'var(--text-muted)' }}>
                  {new Date(t.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {txs.length === 0 && (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                  No transactions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}