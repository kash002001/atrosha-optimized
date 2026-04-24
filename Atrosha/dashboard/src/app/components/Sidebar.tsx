"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    ArrowLeftRight,
    BookOpen,
    Shield,
    Settings,
    Activity,
    LogOut,
    Terminal,
    CreditCard,
    ScrollText,
    Users,
    Layers,
    FileSpreadsheet,
    Webhook,
    Receipt,
    BarChart3,
} from "lucide-react";

import { useUser } from "../context/UserContext";

const nav = [
    { href: "/", label: "Overview", icon: LayoutDashboard, roles: ["ADMIN", "APPROVER", "AUDITOR"] },
    { href: "/ap", label: "Single AP", icon: CreditCard, roles: ["ADMIN", "APPROVER"] },
    { href: "/batch", label: "Batch AP", icon: Layers, roles: ["ADMIN", "APPROVER"] },
    { href: "/vendors", label: "Vendors", icon: Users, roles: ["ADMIN", "APPROVER", "AUDITOR"] },
    { href: "/export", label: "Accounting Export", icon: FileSpreadsheet, roles: ["ADMIN"] },
    { href: "/webhooks", label: "Developer Webhooks", icon: Webhook, roles: ["ADMIN"] },
    { href: "/audit", label: "Audit Log", icon: ScrollText, roles: ["ADMIN", "AUDITOR"] },
    { href: "/expenses", label: "Expenses", icon: Receipt, roles: ["ADMIN", "APPROVER"] },
    { href: "/payroll", label: "Payroll", icon: BarChart3, roles: ["ADMIN", "APPROVER"] },
    { href: "/transactions", label: "Transactions", icon: ArrowLeftRight, roles: ["ADMIN", "APPROVER", "AUDITOR"] },
    { href: "/rules", label: "Intents", icon: BookOpen, roles: ["ADMIN", "APPROVER"] },
    { href: "/agents", label: "Agents", icon: Shield, roles: ["ADMIN"] },
];

const ROLE_LABELS: Record<string, string> = {
    ADMIN: "Admin",
    APPROVER: "Approver",
    AUDITOR: "Auditor",
    VIEWER: "Viewer",
};

export default function Sidebar() {
    const path = usePathname();
    // C1: context no longer exposes setRole/setEntityId — roles come from server JWT only
    const { user, role, entityId, loading } = useUser();

    const filteredNav = role ? nav.filter(n => n.roles.includes(role)) : [];

    return (
        <>
            {/* Mobile Toggle */}
            <button
                className="mobile-toggle"
                onClick={() => document.querySelector('.sidebar')?.classList.toggle('open')}
                style={{
                    position: 'fixed',
                    top: 15,
                    left: 15,
                    zIndex: 60,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '8px',
                    display: 'none',
                }}
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 12h18M3 6h18M3 18h18" />
                </svg>
            </button>

            <style jsx global>{`
                @media (max-width: 768px) {
                    .mobile-toggle { display: block !important; }
                }
                .context-info {
                    padding: 12px;
                    border-top: 1px solid var(--border);
                    font-size: 0.8rem;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    background: rgba(255,255,255,0.02);
                }
                .context-info-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    color: var(--text-muted);
                }
                .context-info-value {
                    font-weight: 600;
                    color: var(--text);
                }
            `}</style>

            <aside className="sidebar" onClick={(e) => {
                if ((e.target as HTMLElement).closest('a')) {
                    document.querySelector('.sidebar')?.classList.remove('open');
                }
            }}>
                <div className="sidebar-brand">
                    <h1>Atrosha</h1>
                </div>
                <nav className="sidebar-nav">
                    <div className="sidebar-section">Main</div>
                    {loading ? (
                        <div style={{ padding: "12px 16px", color: "var(--text-muted)", fontSize: 13 }}>Loading...</div>
                    ) : (
                        filteredNav.map((n) => (
                            <Link
                                key={n.href}
                                href={n.href}
                                className={`sidebar-link ${path === n.href ? "active" : ""}`}
                            >
                                <n.icon />
                                {n.label}
                            </Link>
                        ))
                    )}

                    {role === "ADMIN" && (
                        <>
                            <div className="sidebar-section">System</div>
                            <Link href="/settings" className={`sidebar-link ${path === "/settings" ? "active" : ""}`}>
                                <Settings />
                                Settings
                            </Link>
                            <Link href="/settings/auth" className={`sidebar-link ${path === "/settings/auth" ? "active" : ""}`}>
                                <Shield />
                                SSO Auth
                            </Link>
                            <Link href="/developers" className={`sidebar-link ${path === "/developers" ? "active" : ""}`}>
                                <Terminal />
                                Developers
                            </Link>
                            <Link href="/status" className={`sidebar-link ${path === "/status" ? "active" : ""}`}>
                                <Activity />
                                Status
                            </Link>
                        </>
                    )}
                </nav>

                {/* C1: read-only role/entity display — no switcher dropdown */}
                <div className="context-info">
                    <div className="context-info-row">
                        <span>Role</span>
                        <span className="context-info-value">{ROLE_LABELS[role] ?? role ?? "—"}</span>
                    </div>
                    {entityId > 0 && (
                        <div className="context-info-row">
                            <span>Entity</span>
                            <span className="context-info-value">#{entityId}</span>
                        </div>
                    )}
                    {user && (
                        <div className="context-info-row" style={{ fontSize: "0.72rem" }}>
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user}</span>
                        </div>
                    )}
                </div>

                <div className="sidebar-footer">
                    <button
                        onClick={async () => {
                            const { createClient } = await import("@/lib/supabase-client");
                            const supabase = createClient();
                            await supabase.auth.signOut();
                            window.location.href = "/login";
                        }}
                        className="sidebar-link"
                        style={{ width: "100%", background: "none", border: "none", cursor: "pointer" }}
                    >
                        <LogOut />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Overlay backdrop */}
            <div
                className="sidebar-backdrop"
                onClick={() => document.querySelector('.sidebar')?.classList.remove('open')}
            />
        </>
    );
}
