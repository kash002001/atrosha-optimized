"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase-client";
import { useUser } from "../context/UserContext";

export default function ExportClient() {
    // H2: inline error state instead of alert()
    const [error, setError] = useState<string | null>(null);
    const [exporting, setExporting] = useState<string | null>(null);
    const { orgId } = useUser();

    const handleExport = async (format: string) => {
        setError(null);
        setExporting(format);
        try {
            const supabase = createClient();
            // H1: explicit org filter — same cross-tenant fix applied to transactions/payroll
            const query = supabase
                .from('transactions')
                .select('id, invoice_id, amount, currency, status, created_at')
                .order('created_at', { ascending: false })
                .limit(500);
            const { data: txs, error: dbErr } = orgId
                ? await query.eq('organization_id', orgId)
                : await query;

            if (dbErr) throw dbErr;

            if (!txs || txs.length === 0) {
                setError("No transactions to export for your organization.");
                setExporting(null);
                return;
            }

            let csv = "";
            if (format === "xero") {
                csv = "ContactName,InvoiceNumber,InvoiceDate,DueDate,Total,Currency\n";
                txs.forEach(t => {
                    const date = new Date(t.created_at).toISOString().split('T')[0];
                    csv += `"Vendor ${t.invoice_id || 'N/A'}","INV-${t.id}","${date}","${date}",${((t.amount || 0) / 100).toFixed(2)},"${t.currency || 'USD'}"\n`;
                });
            } else {
                csv = "Vendor,BillNo,BillDate,ExpenseAmount,Currency\n";
                txs.forEach(t => {
                    const date = new Date(t.created_at).toISOString().split('T')[0];
                    csv += `"Vendor ${t.invoice_id || 'N/A'}","BILL-${t.id}","${date}",${((t.amount || 0) / 100).toFixed(2)},"${t.currency || 'USD'}"\n`;
                });
            }

            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `atrosha_${format}_export_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Export failed. Please try again.");
        }
        setExporting(null);
    };

    return (
        <div style={{ maxWidth: 1000, margin: "0 auto", paddingBottom: 60 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
                <div style={{ padding: 10, background: "var(--bg-secondary)", borderRadius: 8, border: "1px solid var(--border)" }}>
                    <FileSpreadsheet size={24} style={{ color: "var(--primary)" }} />
                </div>
                <div>
                    <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Accounting Export</h2>
                    <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>Download CSV extracts compatible with common accounting software</p>
                </div>
            </div>

            {error && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", marginBottom: 24, borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: 13 }}>
                    <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                    {error}
                </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                <div className="chart-card" style={{ padding: 32, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", border: "1px solid rgba(59,130,246,0.1)" }}>
                    <div style={{ background: "rgba(59,130,246,0.1)", width: 64, height: 64, borderRadius: 32, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                        <span style={{ fontSize: 24, fontWeight: 800, color: "var(--primary)" }}>X</span>
                    </div>
                    <h3 style={{ margin: "0 0 8px", fontSize: 20 }}>Xero CSV</h3>
                    <p style={{ margin: "0 0 24px", color: "var(--text-muted)", fontSize: 14, lineHeight: 1.5 }}>
                        Exports data in Xero's standard multi-column format (ContactName, InvoiceNumber, Date, DueDate).
                    </p>
                    <button
                        onClick={() => handleExport("xero")}
                        disabled={!!exporting}
                        className="btn-primary"
                        style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", opacity: exporting ? 0.6 : 1, cursor: exporting ? "wait" : "pointer" }}
                    >
                        <Download size={16} />
                        {exporting === "xero" ? "Exporting..." : "Export Xero CSV"}
                    </button>
                </div>

                <div className="chart-card" style={{ padding: 32, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", border: "1px solid rgba(16,185,129,0.1)" }}>
                    <div style={{ background: "rgba(16,185,129,0.1)", width: 64, height: 64, borderRadius: 32, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                        <span style={{ fontSize: 24, fontWeight: 800, color: "#10b981" }}>qb</span>
                    </div>
                    <h3 style={{ margin: "0 0 8px", fontSize: 20 }}>QuickBooks Online</h3>
                    <p style={{ margin: "0 0 24px", color: "var(--text-muted)", fontSize: 14, lineHeight: 1.5 }}>
                        Exports data in QuickBooks vendor bill format (Vendor, BillNo, BillDate, ExpenseAmount).
                    </p>
                    <button
                        onClick={() => handleExport("quickbooks")}
                        disabled={!!exporting}
                        className="btn-primary"
                        style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "#10b981", opacity: exporting ? 0.6 : 1, cursor: exporting ? "wait" : "pointer" }}
                    >
                        <Download size={16} />
                        {exporting === "quickbooks" ? "Exporting..." : "Export QuickBooks CSV"}
                    </button>
                </div>
            </div>
        </div>
    );
}
