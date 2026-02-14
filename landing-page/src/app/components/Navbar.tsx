"use client";

import { useState, useEffect } from "react";
// We can modify the snippet to use Next.js Link if needed, but for now matching snippet exactly with <a> tags is fine for visual fidelity.
// However, the snippet uses `class="...` which needs to be `className`.
// And closing tags for void elements.

export default function Navbar() {
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
                    <div className="hidden md:flex items-center space-x-8">
                        <a
                            className="text-sm font-medium text-muted-light hover:text-primary dark:text-muted-dark dark:hover:text-white transition-colors"
                            href="/#features"
                        >
                            Product
                        </a>
                        <a
                            className="text-sm font-medium text-muted-light hover:text-primary dark:text-muted-dark dark:hover:text-white transition-colors"
                            href="/docs"
                        >
                            Developers
                        </a>
                        <a
                            className="text-sm font-medium text-muted-light hover:text-primary dark:text-muted-dark dark:hover:text-white transition-colors"
                            href="/#pricing"
                        >
                            Pricing
                        </a>
                    </div>
                    <div className="flex items-center space-x-4">
                        <a
                            className="text-sm font-medium text-muted-light hover:text-primary dark:text-muted-dark dark:hover:text-white transition-colors hidden sm:block"
                            href="/login"
                        >
                            Login
                        </a>
                        <a
                            className="bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded-full text-sm font-medium transition-colors shadow-lg shadow-primary/20"
                            href="/signup"
                        >
                            Sign Up
                        </a>
                        <button
                            className="p-2 text-muted-light dark:text-muted-dark hover:text-primary dark:hover:text-white"
                            onClick={toggleDark}
                        >
                            <span className="material-symbols-outlined text-sm">contrast</span>
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}
