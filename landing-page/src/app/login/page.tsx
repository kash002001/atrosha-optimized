"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { loginAction } from "../auth-actions";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const abortRef = useRef<AbortController | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        // cancel any stale in-flight request
        abortRef.current?.abort();
        abortRef.current = new AbortController();

        const timeout = setTimeout(() => {
            setLoading(false);
            setError("Login request timed out. Please try again.");
            abortRef.current?.abort();
        }, 10000);

        try {
            // Use server action for reliable cookie setting in incognito
            const result = await loginAction(email, password);
            clearTimeout(timeout);

            if (result.error) {
                setError(result.error);
                setLoading(false);
                return;
            }

            // session is now set via Set-Cookie header. Proceed to dashboard.
            const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
            const isProd = hostname.includes('atrosha.bond');
            let dashUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL || "https://app.atrosha.bond";

            if (isProd && dashUrl.includes('localhost')) {
                dashUrl = "https://app.atrosha.bond";
            }

            window.location.replace(dashUrl);
        } catch (err: any) {
            clearTimeout(timeout);
            if (err?.name === 'AbortError') return;
            setError(err.message || "Something went wrong");
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
                            autoComplete="email"
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
                            autoComplete="current-password"
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
                    {"Don't have an account? "}
                    <Link href="/signup" className="text-primary hover:underline font-medium">
                        Sign up
                    </Link>
                </p>
            </div>
        </div>
    );
}
