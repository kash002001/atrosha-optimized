
import { createClient as createServerSupabase } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { Mail, Hash, ShieldCheck, Building, CreditCard } from "lucide-react";
import BillingButton from "./BillingButton";

export default async function SettingsPage() {
    const supabase = await createServerSupabase();

    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error || !user) {
        redirect(process.env.NEXT_PUBLIC_LOGIN_URL || "https://atrosha.bond/login");
    }

    const userMetadata = user.user_metadata || {};
    const orgName = userMetadata.org_name || "Atrosha Corp";
    const role = userMetadata.role || "Administrator";
    const initials = (user.email?.[0] || "U").toUpperCase();

    return (
        <div style={{ maxWidth: 800, margin: "0 auto", paddingBottom: 40 }}>
            {/* Header */}
            <div className="page-header">
                <h2>Settings</h2>
                <p>Manage your account and organization preferences.</p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

                {/* Profile Section */}
                <div className="chart-card">
                    <h3>Personal Profile</h3>
                    <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
                        <div style={{
                            width: 64, height: 64,
                            background: "var(--primary)",
                            color: "#fff",
                            borderRadius: "50%",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 24, fontWeight: "bold", fontFamily: "var(--font-serif)",
                            boxShadow: "var(--shadow-soft)"
                        }}>
                            {initials}
                        </div>
                        <div style={{ flex: 1, display: "grid", gap: 16 }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                                <div>
                                    <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6, display: "block" }}>Email</label>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text)", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                                        <Mail size={14} color="var(--text-dim)" /> {user.email}
                                    </div>
                                </div>
                                <div>
                                    <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6, display: "block" }}>Role</label>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text)", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                                        <ShieldCheck size={14} color="var(--text-dim)" /> {role}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6, display: "block" }}>User ID</label>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-muted)", fontFamily: "monospace", background: "var(--bg-secondary)", padding: "8px 12px", borderRadius: 4 }}>
                                    <Hash size={12} color="var(--text-dim)" /> {user.id}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Organization Section */}
                <div className="chart-card">
                    <h3>Organization</h3>
                    <div style={{ padding: "0 0 10px" }}>
                        <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8, display: "block" }}>Display Name</label>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{
                                width: 32, height: 32,
                                background: "var(--bg-secondary)",
                                borderRadius: 6,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                border: "1px solid var(--border)"
                            }}>
                                <Building size={16} color="var(--text-muted)" />
                            </div>
                            <input
                                type="text"
                                readOnly
                                value={orgName}
                                style={{
                                    flex: 1,
                                    fontSize: 14,
                                    fontWeight: 500,
                                    color: "var(--text)",
                                    border: "1px solid var(--border)",
                                    background: "#fff",
                                    padding: "8px 12px",
                                    borderRadius: "var(--radius-sm)",
                                    outline: "none"
                                }}
                            />
                        </div>
                        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>
                            To rename your organization, please contact support.
                        </p>
                    </div>
                </div>


                {/* Billing Section */}
                <div className="chart-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                        <div style={{
                            width: 48, height: 48,
                            background: "var(--bg-secondary)",
                            borderRadius: "50%",
                            display: "flex", alignItems: "center", justifyContent: "center"
                        }}>
                            <CreditCard size={20} color="var(--text-muted)" />
                        </div>
                        <div>
                            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Free Plan</h4>
                            <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>Usage resets on the 1st of every month.</p>
                        </div>
                    </div>
                    <BillingButton />
                </div>

            </div>
        </div>
    );
}
