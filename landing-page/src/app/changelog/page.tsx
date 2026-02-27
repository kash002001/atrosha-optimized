import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function ChangelogPage() {
    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark">
            <Navbar />
            <main className="max-w-4xl mx-auto px-4 pt-32 pb-20">
                <h1 className="text-4xl font-serif font-bold text-text-light dark:text-white mb-8">Changelog</h1>

                <div className="space-y-12 border-l border-gray-200 dark:border-gray-800 ml-4 pl-8">
                    <div className="relative">
                        <div className="absolute -left-[37px] top-2 w-4 h-4 rounded-full bg-primary ring-4 ring-background-light dark:ring-background-dark"></div>
                        <h3 className="text-xl font-bold text-text-light dark:text-white">v1.0.0 - Production Launch</h3>
                        <time className="text-sm text-gray-500 mb-4 block">February 13, 2026</time>
                        <ul className="list-disc list-outside ml-4 text-muted-light dark:text-muted-dark space-y-2">
                            <li>Launched Public API and Developer Console</li>
                            <li>Released Official Node.js and Python SDKs</li>
                            <li>Introduced &quot;Stripe-like&quot; Documentation Hub</li>
                            <li>Deployed to Vercel with Global Edge Network</li>
                        </ul>
                    </div>
                    <div className="relative">
                        <div className="absolute -left-[37px] top-2 w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-800 ring-4 ring-background-light dark:ring-background-dark"></div>
                        <h3 className="text-xl font-semibold mb-2 text-primary">v0.9.0 - The &quot;No Excuses&quot; Update</h3>
                        <time className="text-sm text-gray-500 mb-4 block">December 2025</time>
                        <p className="text-gray-400 mb-4">
                            We completely rewrote the core routing engine. Why? Because the old one was slow, and slow is unacceptable. This update drops latency by 40%. We also added support for streaming responses, because you asked for it (and because the competition still can&apos;t figure it out).
                        </p>
                    </div>
                    <div className="relative">
                        <div className="absolute -left-[37px] top-2 w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-800 ring-4 ring-background-light dark:ring-background-dark"></div>
                        <h3 className="text-xl font-bold text-text-light dark:text-white">Beta Release</h3>
                        <time className="text-sm text-gray-500 mb-4 block">January 2026</time>
                        <ul className="list-disc list-outside ml-4 text-muted-light dark:text-muted-dark space-y-2">
                            <li>Core Proxy Engine (Rust)</li>
                            <li>Basic Dashboard and Analytics</li>
                        </ul>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
