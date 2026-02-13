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
    { href: "/rules", label: "Rules", icon: BookOpen },
    { href: "/agents", label: "Agents", icon: Shield },
];

export default function Sidebar() {
    const path = usePathname();

    return (
        <aside className="sidebar">
            <div className="sidebar-brand">
                <h1>Atrosha</h1>
                <span>Beta</span>
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
                <Link href="#" className="sidebar-link">
                    <Activity />
                    Status
                </Link>
            </nav>
            <div className="sidebar-footer">
                <button className="sidebar-link" style={{ width: "100%", background: "none", border: "none" }}>
                    <LogOut />
                    Sign Out
                </button>
            </div>
        </aside>
    );
}
