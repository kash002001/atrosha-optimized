"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // console.log("LoginPage mounted");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            // Robust cookie domain logic
            const hostname = window.location.hostname;
            const cookieDomain = hostname.includes('atrosha.bond') ? '.atrosha.bond' : undefined;

            const supabase = createBrowserClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                {
                    cookieOptions: {
                        domain: cookieDomain,
                        path: '/',
                        sameSite: 'lax',
                        secure: window.location.protocol === 'https:',
                    }
                }
            );

            const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

            if (signInError) {
                console.error("Login Error:", signInError);
                setError(signInError.message);
                alert(`Login Failed: ${signInError.message}`); // Explicit feedback
                setLoading(false);
                return;
            }

            // Success - Redirect
            const dashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL || "https://app.atrosha.bond";
            // Use replace to avoid back-button loops
            window.location.replace(dashboardUrl);

        } catch (err: any) {
            console.error("Unexpected Error:", err);
            setError(err.message || "An unexpected error occurred");
            alert("An unexpected system error occurred. Please check console.");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark px-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-2 mb-6">
                        <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center text-white font-serif italic font-bold text-xl">
                            A
                        </div>
                        <span className="font-serif font-bold text-xl tracking-tight text-primary dark:text-white">
                            Atrosha
                        </span>
                    </Link>
                    <h1 className="text-2xl font-semibold text-text-light dark:text-white mb-1">
                        Welcome back
                    </h1>
                    <p className="text-sm text-muted-light dark:text-muted-dark">
                        Log in to your Atrosha account
                    </p>
                </div>

                <form onSubmit={handleLogin} className="flex flex-col gap-4">
                    <div>
                        <label className="block text-xs font-medium text-muted-light dark:text-muted-dark mb-1.5 uppercase tracking-wider">
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@company.com"
                            required
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-dark text-text-light dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-muted-light dark:text-muted-dark mb-1.5 uppercase tracking-wider">
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-dark text-text-light dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm transition-all"
                        />
                    </div>

                    {error && (
                        <p className="text-red-500 text-xs bg-red-50 dark:bg-red-900/20 p-2 rounded">{error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-primary hover:bg-primary-hover disabled:opacity-60 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-all shadow-glow mt-2"
                    >
                        {loading ? "Signing in..." : "Sign in"}
                    </button>
                </form>

                <p className="text-center text-sm text-muted-light dark:text-muted-dark mt-6">
                    Don't have an account?{" "}
                    <Link href="/signup" className="text-primary hover:underline font-medium">
                        Sign up
                    </Link>
                </p>
            </div>
        </div>
    );
}
