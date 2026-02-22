"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SignupForm() {
    const params = useSearchParams();
    const planFromUrl = params.get("plan") || "explorer";

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [orgName, setOrgName] = useState("");
    const [plan, setPlan] = useState(planFromUrl);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);


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

        // step 1: create auth user
        const { data, error: authErr } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { org_name: orgName, plan_tier: plan },
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

            const res = await fetch("/api/onboard", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: data.user.id,
                    org_name: orgName,
                    slug,
                    email, // passing email for Stripe/Resend
                    plan_tier: plan,
                }),
            });

            const body = await res.json();

            if (!res.ok) {
                setError(body.error || "Failed to create organization");
                setLoading(false);
                return;
            }

            if (body.checkout_url) {
                window.location.href = body.checkout_url;
                return;
            }
        }

        // step 3: redirect to dashboard (smooth onboarding)
        const dashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL || "http://localhost:3001";

        // If email confirmation is disabled, this works immediately.
        // If enabled, they can't login yet, but redirecting them is still better than a dead end 
        // if we assume they might have just confirmed in another tab or we want to show a "verify email" page on the dashboard.
        // For this strict "smooth" requirement, we'll send them to the dashboard.
        window.location.href = dashboardUrl;
        setLoading(false);
    };

    if (done) {
        return (
            <div className="text-center py-8">
                <span className="material-symbols-outlined text-5xl text-accent-green mb-4 block">check_circle</span>
                <h2 className="text-xl font-semibold text-text-light dark:text-white mb-2">Check your email</h2>
                <p className="text-sm text-muted-light dark:text-muted-dark">
                    We sent a confirmation link to <strong>{email}</strong>.<br />
                    Click it to activate your account, then head to the dashboard.
                </p>
            </div>
        );
    }

    const plans = [
        { id: "explorer", label: "Explorer — Free" },
        { id: "growth", label: "Growth — $49/mo" },
        { id: "scale", label: "Scale — $199/mo" },
        { id: "enterprise", label: "Enterprise — Custom" },
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
                    placeholder="Min 6 characters"
                    required
                    minLength={6}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-dark text-text-light dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm transition-all"
                />
            </div>
            <div>
                <label className="block text-xs font-medium text-muted-light dark:text-muted-dark mb-1.5 uppercase tracking-wider">
                    Plan
                </label>
                <div className="grid grid-cols-2 gap-2">
                    {plans.map((p) => (
                        <div
                            key={p.id}
                            onClick={() => setPlan(p.id)}
                            className={`text-xs p-2 rounded-lg border text-center cursor-pointer transition-all ${plan === p.id
                                ? "border-primary bg-primary/5 text-primary font-semibold"
                                : "border-gray-200 dark:border-gray-700 text-muted-light dark:text-muted-dark"
                                }`}
                        >
                            {p.label}
                        </div>
                    ))}
                </div>
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
