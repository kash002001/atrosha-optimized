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

export default function Sidebar() {
    const path = usePathname();
    const { user, role, entityId, setRole, setEntityId, setUser } = useUser();

    const filteredNav = nav.filter(n => n.roles.includes(role));

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
                    display: 'none', // Hidden on desktop
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
                .context-switcher {
                    padding: 12px;
                    border-top: 1px solid var(--border);
                    font-size: 0.8rem;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    background: rgba(255,255,255,0.02);
                }
                .context-switcher select {
                    background: var(--bg-body);
                    border: 1px solid var(--border);
                    color: var(--text-main);
                    padding: 4px;
                    border-radius: 4px;
                    outline: none;
                }
            `}</style>

            <aside className="sidebar" onClick={(e) => {
                // Close when clicking link on mobile
                if ((e.target as HTMLElement).closest('a')) {
                    document.querySelector('.sidebar')?.classList.remove('open');
                }
            }}>
                <div className="sidebar-brand">
                    <h1>Atrosha</h1>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: '0.6rem', color: 'var(--accent)' }}>ENTITY: {entityId}</span>
                        <span style={{ fontSize: '0.6rem', opacity: 0.6 }}>ROLE: {role}</span>
                    </div>
                </div>
                <nav className="sidebar-nav">
                    <div className="sidebar-section">Main</div>
                    {filteredNav.map((n) => (
                        <Link
                            key={n.href}
                            href={n.href}
                            className={`sidebar-link ${path === n.href ? "active" : ""}`}
                        >
                            <n.icon />
                            {n.label}
                        </Link>
                    ))}
                    
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

                <div className="context-switcher">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Role</span>
                        <select value={role} onChange={(e) => setRole(e.target.value)}>
                            <option value="ADMIN">Admin</option>
                            <option value="APPROVER">Approver</option>
                            <option value="AUDITOR">Auditor</option>
                        </select>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Entity</span>
                        <select value={entityId} onChange={(e) => setEntityId(parseInt(e.target.value))}>
                            <option value={1}>Main Entity</option>
                            <option value={2}>Subsidiary A</option>
                            <option value={3}>Region West</option>
                        </select>
                    </div>
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
