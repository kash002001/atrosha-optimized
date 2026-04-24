"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { loginAction } from "../auth-actions";
import { createBrowserClient } from "@supabase/ssr";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [forgotMode, setForgotMode] = useState(false);
    const [resetSent, setResetSent] = useState(false);
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
                setError("Login failed. Please check your credentials.");
                setLoading(false);
                return;
            }

            // session is now set via Set-Cookie header. Proceed to dashboard.
            const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
            const isProd = hostname.includes('atrosha.bond');
            let dashUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL || "https://app.atrosha.bond";
            if (!isProd && dashUrl.includes('atrosha.bond')) {
                dashUrl = "http://localhost:3001";
            }

            window.location.replace(dashUrl);
        } catch (err: unknown) {
            clearTimeout(timeout);
            if (err instanceof Error && err.name === 'AbortError') return;
            setError("Something went wrong. Please try again later.");
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) { setError("Enter your email first."); return; }
        setLoading(true);
        setError("");

        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder"
        );

        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/callback`,
        });

        if (resetErr) {
            setError("If this email is registered, a reset link will be sent."); // abstracting error to prevent user enum
        } else {
            setResetSent(true);
        }
        setLoading(false);
    };

    const handleOAuthLogin = async (provider: 'google') => {
        setLoading(true);
        setError("");
        
        const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        const cookieDomain = hostname.includes('atrosha.bond') ? '.atrosha.bond' : undefined;

        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder",
            {
                cookieOptions: {
                    domain: cookieDomain,
                    path: '/',
                    sameSite: 'lax',
                    secure: typeof window !== 'undefined' && window.location.protocol === 'https:',
                }
            }
        );

        const { error: authErr } = await supabase.auth.signInWithOAuth({
            provider,
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        if (authErr) {
            setError("OAuth sign in failed. Please try again.");
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

                <div className="flex flex-col gap-4 mb-6">
                    <button
                        type="button"
                        onClick={() => handleOAuthLogin('google')}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-3 bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-text-light dark:text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                        Continue with Google
                    </button>
                    <div className="relative flex items-center py-2">
                        <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
                        <span className="flex-shrink-0 mx-4 text-xs text-gray-400 dark:text-gray-500 uppercase tracking-widest font-medium">Or</span>
                        <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
                    </div>
                </div>

                <form onSubmit={forgotMode ? handleForgotPassword : handleLogin} className="flex flex-col gap-4">
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
                    {!forgotMode && (
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
                    )}

                    {error && (
                        <p className="text-red-500 text-xs bg-red-50 dark:bg-red-900/20 p-2 rounded">{error}</p>
                    )}

                    {resetSent && (
                        <p className="text-green-600 text-xs bg-green-50 dark:bg-green-900/20 p-2 rounded">Reset link sent! Check your inbox.</p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-primary hover:bg-primary-hover disabled:opacity-60 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-all shadow-glow mt-2"
                    >
                        {loading ? (forgotMode ? "Sending..." : "Signing in...") : (forgotMode ? "Send reset link" : "Sign in")}
                    </button>

                    <button
                        type="button"
                        onClick={() => { setForgotMode(!forgotMode); setError(""); setResetSent(false); }}
                        className="text-xs text-primary hover:underline self-center"
                    >
                        {forgotMode ? "Back to login" : "Forgot password?"}
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
