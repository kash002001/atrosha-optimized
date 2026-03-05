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
} from "lucide-react";


const nav = [
    { href: "/", label: "Overview", icon: LayoutDashboard },
    { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
    { href: "/rules", label: "Intents", icon: BookOpen },
    { href: "/agents", label: "Agents", icon: Shield },
];

export default function Sidebar() {
    const path = usePathname();

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
            `}</style>

            <aside className="sidebar" onClick={(e) => {
                // Close when clicking link on mobile
                if ((e.target as HTMLElement).closest('a')) {
                    document.querySelector('.sidebar')?.classList.remove('open');
                }
            }}>
                <div className="sidebar-brand">
                    <h1>Atrosha</h1>
                    <span>Beta</span>
                    {/* Close button for mobile */}
                    <button
                        className="mobile-close"
                        onClick={() => document.querySelector('.sidebar')?.classList.remove('open')}
                        style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                        {/* Only visible on mobile? CSS handles it? logic simplified */}
                    </button>
                </div>
                <nav className="sidebar-nav">
                    <div className="sidebar-section">Main</div>
                    {nav.map((n) => (
                        <Link
                            key={n.href}
                            href={n.href}
                            className={`sidebar-link ${path === n.href ? "active" : ""}`}
                        >
                            <n.icon />
                            {n.label}
                        </Link>
                    ))}
                    <div className="sidebar-section">System</div>
                    <Link href="/settings" className={`sidebar-link ${path === "/settings" ? "active" : ""}`}>
                        <Settings />
                        Settings
                    </Link>
                    <Link href="/developers" className={`sidebar-link ${path === "/developers" ? "active" : ""}`}>
                        <Terminal />
                        Developers
                    </Link>
                    <Link href="/status" className={`sidebar-link ${path === "/status" ? "active" : ""}`}>
                        <Activity />
                        Status
                    </Link>
                </nav>
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
