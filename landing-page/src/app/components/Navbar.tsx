"use client";

import { useState } from "react";
import Link from "next/link";
// We can modify the snippet to use Next.js Link if needed, but for now matching snippet exactly with <a> tags is fine for visual fidelity.
// However, the snippet uses `class="...` which needs to be `className`.
// And closing tags for void elements.

export default function Navbar() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const toggleDark = () => {
        const isDark = document.documentElement.classList.toggle("dark");
        localStorage.setItem("theme", isDark ? "dark" : "light");
    };

    return (
        <nav className="fixed w-full z-50 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center text-white font-serif italic font-bold text-xl">
                            A
                        </div>
                        <span className="font-serif font-bold text-xl tracking-tight text-primary dark:text-white">
                            Atrosha
                        </span>
                    </div>
                    {/* Desktop Center Links */}
                    <div className="hidden md:flex items-center space-x-8">
                        <Link className="text-sm font-medium text-muted-light hover:text-primary dark:text-muted-dark dark:hover:text-white transition-colors" href="/#features">
                            Product
                        </Link>
                        <Link className="text-sm font-medium text-muted-light hover:text-primary dark:text-muted-dark dark:hover:text-white transition-colors" href="/docs">
                            Developers
                        </Link>
                        <Link className="text-sm font-medium text-muted-light hover:text-primary dark:text-muted-dark dark:hover:text-white transition-colors" href="/#pricing">
                            Pricing
                        </Link>
                        <Link className="text-sm font-medium text-muted-light hover:text-primary dark:text-muted-dark dark:hover:text-white transition-colors" href="/contact">
                            Contact
                        </Link>
                    </div>
                    {/* Desktop Right Links */}
                    <div className="hidden md:flex items-center space-x-4">
                        <Link className="text-sm font-medium text-muted-light hover:text-primary dark:text-muted-dark dark:hover:text-white transition-colors" href="/login">
                            Login
                        </Link>
                        <Link className="bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded-full text-sm font-medium transition-colors shadow-lg shadow-primary/20" href="/signup">
                            Sign Up
                        </Link>
                        <button className="p-2 text-muted-light dark:text-muted-dark hover:text-primary dark:hover:text-white" onClick={toggleDark}>
                            <span className="material-symbols-outlined text-sm">contrast</span>
                        </button>
                    </div>

                    {/* Mobile Hamburger Button */}
                    <div className="flex md:hidden items-center gap-2">
                        <button className="p-2 text-muted-light dark:text-muted-dark hover:text-primary dark:hover:text-white" onClick={toggleDark}>
                            <span className="material-symbols-outlined text-sm">contrast</span>
                        </button>
                        <button
                            className="p-2 text-text-light dark:text-white"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            <span className="material-symbols-outlined">{isMobileMenuOpen ? 'close' : 'menu'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="md:hidden bg-background-light dark:bg-background-dark border-b border-gray-100 dark:border-gray-800 px-4 pt-2 pb-6 space-y-4 shadow-xl">
                    <div className="flex flex-col space-y-4">
                        <Link className="text-base font-medium text-text-light dark:text-white padding-2" href="/#features" onClick={() => setIsMobileMenuOpen(false)}>Product</Link>
                        <Link className="text-base font-medium text-text-light dark:text-white padding-2" href="/docs" onClick={() => setIsMobileMenuOpen(false)}>Developers</Link>
                        <Link className="text-base font-medium text-text-light dark:text-white padding-2" href="/#pricing" onClick={() => setIsMobileMenuOpen(false)}>Pricing</Link>
                        <Link className="text-base font-medium text-text-light dark:text-white padding-2" href="/contact" onClick={() => setIsMobileMenuOpen(false)}>Contact</Link>
                        <hr className="border-gray-200 dark:border-gray-800" />
                        <Link className="text-base font-medium text-text-light dark:text-white padding-2" href="/login" onClick={() => setIsMobileMenuOpen(false)}>Login</Link>
                        <Link className="bg-primary hover:bg-primary-hover text-white px-5 py-3 rounded-xl text-center font-medium transition-colors w-full" href="/signup" onClick={() => setIsMobileMenuOpen(false)}>
                            Sign Up Free
                        </Link>
                    </div>
                </div>
            )}
        </nav>
    );
}
