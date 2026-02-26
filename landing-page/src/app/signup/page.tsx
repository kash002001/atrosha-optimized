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


    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const cookieDomain = hostname.includes('atrosha.bond') ? '.atrosha.bond' : undefined;

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
            setError(authErr.message);
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
                    setError(body.error || "Failed to create organization");
                    setLoading(false);
                    return;
                }

                if (body.api_key) setApiKey(body.api_key);

                if (body.checkout_url) {
                    window.location.href = body.checkout_url;
                    return;
                }
            } catch (fetchErr: any) {
                console.error("ONBOARD_FETCH_ERROR:", fetchErr);
                setError(`Organization setup failed: ${fetchErr.message || "Network error"}. Please try logging in directly.`);
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
            <div className="text-center py-8">
                <span className="material-symbols-outlined text-5xl text-accent-green mb-4 block">check_circle</span>
                <h2 className="text-xl font-semibold text-text-light dark:text-white mb-2">You&apos;re in!</h2>
                <p className="text-sm text-muted-light dark:text-muted-dark mb-4">
                    We sent a confirmation link to <strong>{email}</strong>.<br />
                    Click it to activate your account.
                </p>
                {apiKey && (
                    <div className="text-left bg-gray-50 dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4">
                        <p className="text-xs font-medium text-muted-light dark:text-muted-dark mb-1 uppercase tracking-wider">Your API Key</p>
                        <code className="text-xs text-primary break-all select-all block">{apiKey}</code>
                        <p className="text-[11px] text-red-500 mt-2">⚠ Save this now — it won&apos;t be shown again.</p>
                    </div>
                )}
                <a href={dashUrl} className="text-sm text-primary hover:underline font-medium">Go to Dashboard →</a>
            </div>
        );
    }

    const plans = [
        { id: "explorer", label: "Explorer — Free" },
        { id: "growth", label: "Growth — Contact Us" },
        { id: "scale", label: "Scale — Contact Us" },
        { id: "enterprise", label: "Enterprise — Contact Us" },
    ];

    return (
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
    );
}

export default function SignupPage() {
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
                        Get started
                    </h1>
                    <p className="text-sm text-muted-light dark:text-muted-dark">
                        Create your Atrosha account and secure your AI agents
                    </p>
                </div>

                <Suspense fallback={<div className="text-center text-sm text-muted-light">Loading...</div>}>
                    <SignupForm />
                </Suspense>

                <p className="text-center text-sm text-muted-light dark:text-muted-dark mt-6">
                    Already have an account?{" "}
                    <Link href="/login" className="text-primary hover:underline font-medium">
                        Log in
                    </Link>
                </p>
            </div>
        </div>
    );
}
