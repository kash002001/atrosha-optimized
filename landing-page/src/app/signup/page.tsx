"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import { Suspense } from "react";

function SignupForm() {

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [orgName, setOrgName] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [apiKey, setApiKey] = useState("");
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(apiKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };


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

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const { data, error: authErr } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { org_name: orgName, plan_tier: "explorer" },
            },
        });

        if (authErr) {
            setError("Signup failed. Please try a different email or check criteria.");
            setLoading(false);
            return;
        }

        // step 2: create org via API (service role will handle the insert)
        if (data.user) {
            const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

            try {
                const res = await fetch("/api/onboard", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        user_id: data.user.id,
                        org_name: orgName,
                        slug,
                        email, // passing email for Stripe/Resend
                        plan_tier: "explorer",
                    }),
                });

                const body = await res.json();

                if (!res.ok) {
                    setError("Failed to create organization. Please try again.");
                    setLoading(false);
                    return;
                }

                if (body.api_key) setApiKey(body.api_key);

                if (body.checkout_url) {
                    window.location.href = body.checkout_url;
                    return;
                }
            } catch (fetchErr: unknown) {
                console.error("ONBOARD_FETCH_ERROR:", fetchErr);
                setError("Organization setup failed due to network error. Please try logging in directly.");
                setLoading(false);
                return;
            }
        }

        // show the "check your email" screen with the API key
        setDone(true);
        setLoading(false);
    };

    if (done) {
        const dashUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL || "https://app.atrosha.bond";
        return (
            <div className="flex flex-col items-center justify-center text-center py-6 animate-in fade-in zoom-in duration-500">
                <div className="w-16 h-16 bg-green-500/10 dark:bg-green-500/20 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-6 ring-8 ring-green-500/5 dark:ring-green-500/10">
                    <span className="material-symbols-outlined text-3xl">check</span>
                </div>

                <h2 className="text-2xl font-bold text-text-light dark:text-white mb-3">You&apos;re in!</h2>

                <p className="text-sm text-text-light dark:text-gray-300 mb-8 leading-relaxed px-4">
                    We&apos;ve sent a confirmation link to <br />
                    <strong className="text-primary dark:text-white font-medium">{email}</strong>.<br />
                    Please click it to activate your account.
                </p>

                {apiKey && (
                    <div className="w-full text-left bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-800 rounded-xl p-5 mb-8 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Your Master API Key</p>
                            <span className="text-[10px] font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                                Secret
                            </span>
                        </div>

                        <div className="relative group">
                            <div className="font-mono text-xs text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-background-dark border border-gray-200 dark:border-gray-800 rounded-lg p-3 pr-12 break-all selection:bg-primary/20">
                                {apiKey}
                            </div>
                            <button
                                onClick={handleCopy}
                                type="button"
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-white dark:hover:bg-gray-800 rounded-md transition-colors focus:outline-none"
                                title="Copy API Key"
                            >
                                {copied ? (
                                    <span className="material-symbols-outlined text-[18px] text-green-500">check</span>
                                ) : (
                                    <span className="material-symbols-outlined text-[18px]">content_copy</span>
                                )}
                            </button>
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-500 mt-3 flex items-start gap-1.5">
                            <span className="material-symbols-outlined text-[14px] text-amber-500">warning</span>
                            Copy this now. You won&apos;t be able to see it again after leaving this page.
                        </p>
                    </div>
                )}

                <a
                    href={dashUrl}
                    className="w-full bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-xl text-sm font-semibold transition-all shadow-glow flex items-center justify-center gap-2 group"
                >
                    Go to Dashboard
                    <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </a>
            </div>
        );
    }



    return (
        <>
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
                    Get started
                </h1>
                <p className="text-sm text-muted-light dark:text-muted-dark">
                    Create your Atrosha account and secure your AI agents
                </p>
            </div>

            <div className="flex flex-col gap-4 mb-6">
                <button
                    type="button"
                    onClick={() => {
                        setLoading(true);
                        setError("");
                        supabase.auth.signInWithOAuth({
                            provider: 'google',
                            options: { redirectTo: `${window.location.origin}/auth/callback` },
                        }).then(({ error: authErr }) => {
                            if (authErr) { setError("Google sign in failed."); setLoading(false); }
                        });
                    }}
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

            <form onSubmit={handleSignup} className="flex flex-col gap-4">
                <div>
                    <label className="block text-xs font-medium text-muted-light dark:text-muted-dark mb-1.5 uppercase tracking-wider">
                        Organization Name
                    </label>
                    <input
                        type="text"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        placeholder="Acme Corp"
                        required
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-dark text-text-light dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm transition-all"
                    />
                </div>
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
                        placeholder="Min 8 characters"
                        required
                        minLength={8}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-dark text-text-light dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm transition-all"
                    />
                    {password && (() => {
                        let score = 0;
                        if (password.length >= 8) score++;
                        if (password.length >= 12) score++;
                        if (/[0-9]/.test(password)) score++;
                        if (/[^a-zA-Z0-9]/.test(password)) score++;
                        const label = score <= 1 ? "Weak" : score <= 2 ? "Fair" : "Strong";
                        const color = score <= 1 ? "bg-red-500" : score <= 2 ? "bg-yellow-500" : "bg-green-500";
                        const width = score <= 1 ? "w-1/4" : score <= 2 ? "w-1/2" : "w-full";
                        return (
                            <div className="mt-1.5">
                                <div className="h-1 rounded-full bg-gray-200 dark:bg-gray-700">
                                    <div className={`h-1 rounded-full transition-all duration-300 ${color} ${width}`} />
                                </div>
                                <p className={`text-[11px] mt-0.5 ${score <= 1 ? "text-red-500" : score <= 2 ? "text-yellow-600" : "text-green-600"}`}>
                                    {label}
                                </p>
                            </div>
                        );
                    })()}
                </div>

                {error && (
                    <p className="text-red-500 text-xs bg-red-50 dark:bg-red-900/20 p-2 rounded">{error}</p>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="bg-primary hover:bg-primary-hover disabled:opacity-60 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-all shadow-glow mt-2"
                >
                    {loading ? "Creating account..." : "Create account"}
                </button>
            </form>

            <p className="text-center text-sm text-muted-light dark:text-muted-dark mt-6">
                Already have an account?{" "}
                <Link href="/login" className="text-primary hover:underline font-medium">
                    Log in
                </Link>
            </p>
        </>
    );
}

export default function SignupPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark px-4">
            <div className="w-full max-w-sm">
                <Suspense fallback={<div className="text-center text-sm text-muted-light">Loading...</div>}>
                    <SignupForm />
                </Suspense>
            </div>
        </div>
    );
}
