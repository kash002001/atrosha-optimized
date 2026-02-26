import React from "react";
import Link from "next/link";
import { Terminal, Copy } from "lucide-react";

export default function DocsPage() {
    return (
        <div className="min-h-screen bg-black text-gray-200 font-sans selection:bg-purple-500/30">
            {/* Navbar */}
            <header className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur border-b border-white/10 h-16 flex items-center px-8">
                <Link href="/" className="font-bold text-xl tracking-tighter hover:text-white transition-colors">
                    Atrosha <span className="text-purple-400">Docs</span>
                </Link>
            </header>

            <div className="flex pt-16">
                {/* Sidebar */}
                <nav className="w-64 fixed h-[calc(100vh-4rem)] border-r border-white/5 p-8 overflow-y-auto hidden md:block">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Getting Started</h4>
                    <ul className="space-y-3 text-sm">
                        <li><a href="#intro" className="text-white hover:text-purple-400">Introduction</a></li>
                        <li><a href="#auth" className="text-gray-400 hover:text-white">Authentication</a></li>
                        <li><a href="#sdk" className="text-gray-400 hover:text-white">Node.js SDK</a></li>
                    </ul>

                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-8 mb-4">Integrations</h4>
                    <ul className="space-y-3 text-sm">
                        <li><a href="#transactions" className="text-gray-400 hover:text-white">Transactions</a></li>
                        <li><a href="#webhooks" className="text-gray-400 hover:text-white">Billing Webhooks</a></li>
                        <li><a href="#errors" className="text-gray-400 hover:text-white">Errors</a></li>
                    </ul>
                </nav>

                {/* Main Content */}
                <main className="ml-0 md:ml-64 flex-1 flex flex-col lg:flex-row">

                    {/* Text Column */}
                    <div className="flex-1 p-8 lg:p-16 max-w-3xl">
                        <section id="intro" className="mb-20">
                            <h1 className="text-4xl font-bold text-white mb-6">Introduction</h1>
                            <p className="text-lg text-gray-400 leading-relaxed mb-4">
                                Atrosha provides a zero-trust cryptographic proxy to secure your AI Agents' financial capabilities.
                                By routing your agent's API calls through our Rust Proxy, you cryptographically enforce spending limits,
                                budgets, and policy rules in real-time.
                            </p>
                        </section>

                        <section id="auth" className="mb-20">
                            <h2 className="text-2xl font-bold text-white mb-4">Authentication Model</h2>
                            <p className="text-gray-400 leading-relaxed mb-4">
                                Atrosha does <strong>not</strong> use simple API tokens for agents. Instead, every agent is issued an
                                <code>Ed25519 Cryptographic Keypair</code> when created via the Dashboard.
                            </p>
                            <p className="text-gray-400 leading-relaxed mb-4">
                                The Public Key is cached in our high-speed Rust Proxy. Your agent uses its Private Key to cryptographically
                                <i>sign</i> every outgoing request payload. The Proxy instantly verifies the signature before forwarding it to the final destination (like Stripe or OpenAI).
                            </p>
                            <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg">
                                <p className="text-sm text-yellow-200">
                                    ⚠️ The Private Key is shown exactly once during Agent creation. Never expose it in client-side code.
                                </p>
                            </div>
                        </section>

                        <section id="sdk" className="mb-20">
                            <h2 className="text-2xl font-bold text-white mb-4">SDK Integration</h2>
                            <p className="text-gray-400 leading-relaxed mb-4">
                                The easiest way to route traffic through the proxy is via our official Python SDK.
                                It automatically handles generating the strict Ed25519 signatures and payload hashing required by the proxy.
                            </p>
                        </section>
                        <section id="transactions" className="mb-20">
                            <h2 className="text-2xl font-bold text-white mb-4">Transactions & Permits</h2>
                            <p className="text-gray-400 leading-relaxed mb-4">
                                If a transaction breaks a static limit (like $5,000 per request), the proxy will block it. For complex natural language rules,
                                your agent must first request an ephemeral <strong>Spend Permit</strong> from our Python Validator Engine, then attach that JWT to the proxied request.
                            </p>
                        </section>

                        <section id="webhooks" className="mb-20">
                            <h2 className="text-2xl font-bold text-white mb-4">Billing & Webhooks</h2>
                            <p className="text-gray-400 leading-relaxed mb-4">
                                Atrosha uses asynchronous webhooks to sync your subscription status. When a payment is successful on Stripe, a secure message is sent to our servers to activate your organization.
                            </p>
                            <p className="text-gray-400 leading-relaxed mb-4">
                                Ensure your <code>STRIPE_WEBHOOK_SECRET</code> is correctly set in your environment variables to verify authentic messages from Stripe.
                            </p>
                        </section>
                    </div>

                    {/* Code Column (Sticky) */}
                    <div className="flex-1 bg-[#0d0d0d] border-l border-white/5 p-8 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] overflow-y-auto">
                        <div className="space-y-12">

                            {/* Install Block */}
                            <div>
                                <h5 className="text-xs font-mono text-gray-500 mb-2">INSTALLATION</h5>
                                <div className="bg-[#1a1a1a] rounded-lg p-4 border border-white/5 font-mono text-sm text-green-400 flex justify-between group">
                                    <code>pip install atrosha-sdk</code>
                                    <Copy className="w-4 h-4 text-gray-600 opacity-0 group-hover:opacity-100 cursor-pointer" />
                                </div>
                            </div>

                            {/* Setup Block */}
                            <div>
                                <h5 className="text-xs font-mono text-gray-500 mb-2 uppercase tracking-widest">SETUP</h5>
                                <div className="flex gap-4 mb-2 text-[10px] font-bold text-gray-600">
                                    <span className="text-purple-400 border-b border-purple-400">PYTHON</span>
                                    <span className="hover:text-gray-400 cursor-pointer">CURL (RAW)</span>
                                </div>
                                <div className="bg-[#1a1a1a] rounded-lg p-4 border border-white/5 font-mono text-sm overflow-x-auto">
                                    <pre className="text-blue-300">
                                        <span className="text-purple-300">import</span> os<br />
                                        <span className="text-purple-300">from</span> atrosha_sdk.client <span className="text-purple-300">import</span> AtroshaProxy<br />
                                        <br />
                                        <span className="text-gray-500"># Provide keys from Dashboard</span><br />
                                        proxy = AtroshaProxy(<br />
                                        &nbsp;&nbsp;&nbsp;&nbsp;admin_secret=os.getenv(<span className="text-green-300">"ADMIN_SECRET"</span>),<br />
                                        &nbsp;&nbsp;&nbsp;&nbsp;agent_id=os.getenv(<span className="text-green-300">"ATROSHA_AGENT_ID"</span>),<br />
                                        &nbsp;&nbsp;&nbsp;&nbsp;private_key_hex=os.getenv(<span className="text-green-300">"ATROSHA_PRIVATE_KEY"</span>)<br />
                                        )</pre>
                                </div>
                            </div>

                            {/* Webhook Block */}
                            <div>
                                <h5 className="text-xs font-mono text-gray-500 mb-2 uppercase tracking-widest">CONFIGURE STRIPE WEBHOOK</h5>
                                <div className="bg-[#1a1a1a] rounded-lg p-4 border border-white/5 font-mono text-sm overflow-x-auto">
                                    <div className="text-[10px] text-gray-500 mb-2 font-bold uppercase">Required Events</div>
                                    <ul className="text-xs space-y-1 mb-4">
                                        <li className="text-green-400">✓ checkout.session.completed</li>
                                        <li className="text-green-400">✓ invoice.payment_succeeded</li>
                                        <li className="text-green-400">✓ customer.subscription.deleted</li>
                                    </ul>
                                    <div className="p-2 bg-black rounded border border-white/5 text-[10px] text-gray-400">
                                        URL: https://kash.atrosha.bond/api/billing/webhook
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>

                </main>
            </div>
        </div>
    );
}
