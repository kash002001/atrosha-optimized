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

                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-8 mb-4">Core Resources</h4>
                    <ul className="space-y-3 text-sm">
                        <li><a href="#transactions" className="text-gray-400 hover:text-white">Transactions</a></li>
                        <li><a href="#agents" className="text-gray-400 hover:text-white">Agents</a></li>
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
                                Atrosha provides a powerful API to secure your AI Agents' financial capabilities.
                                By routing your agent's tool calls through our Proxy, you enforce spending limits,
                                budgets, and policy rules in real-time.
                            </p>
                        </section>

                        <section id="auth" className="mb-20">
                            <h2 className="text-2xl font-bold text-white mb-4">Authentication</h2>
                            <p className="text-gray-400 leading-relaxed mb-4">
                                Authenticate your requests using your Organization's <code>API Key</code>.
                                You can generate this key in the <Link href="/login" className="text-purple-400 hover:underline">Dashboard</Link>.
                            </p>
                            <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg">
                                <p className="text-sm text-yellow-200">
                                    ⚠️ Keep your API keys secure. Do not share them in publicly accessible areas such as GitHub or client-side code.
                                </p>
                            </div>
                        </section>

                        <section id="sdk" className="mb-20">
                            <h2 className="text-2xl font-bold text-white mb-4">Node.js SDK</h2>
                            <p className="text-gray-400 leading-relaxed mb-4">
                                The easiest way to interact with the Atrosha API is via our official Node.js library.
                                It comes with TypeScript definitions out of the box.
                            </p>
                        </section>
                        <section id="transactions" className="mb-20">
                            <h2 className="text-2xl font-bold text-white mb-4">Transactions</h2>
                            <p className="text-gray-400 leading-relaxed mb-4">
                                Create a transaction guard check before executing a financial action.
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
                                    <code>npm install @atrosha/sdk</code>
                                    <Copy className="w-4 h-4 text-gray-600 opacity-0 group-hover:opacity-100 cursor-pointer" />
                                </div>
                            </div>

                            {/* Auth Block */}
                            <div>
                                <h5 className="text-xs font-mono text-gray-500 mb-2 uppercase tracking-widest">AUTHENTICATION</h5>
                                <div className="flex gap-4 mb-2 text-[10px] font-bold text-gray-600">
                                    <span className="text-purple-400 border-b border-purple-400">NODE.JS</span>
                                    <span className="hover:text-gray-400 cursor-pointer">PYTHON</span>
                                </div>
                                <div className="bg-[#1a1a1a] rounded-lg p-4 border border-white/5 font-mono text-sm overflow-x-auto">
                                    <pre className="text-blue-300">import <span className="text-white">{`{ Atrosha }`}</span> from <span className="text-green-300">'@atrosha/sdk'</span>;

                                        const atrosha = new Atrosha(<span className="text-yellow-300">'sk_live_...'</span>);</pre>
                                </div>
                            </div>

                            {/* Guard Block */}
                            <div>
                                <h5 className="text-xs font-mono text-gray-500 mb-2 uppercase tracking-widest">CHECK TRANSACTION</h5>
                                <div className="bg-[#1a1a1a] rounded-lg p-4 border border-white/5 font-mono text-sm overflow-x-auto">
                                    <pre className="text-blue-300">
                                        const decision = await atrosha.transactions.guard({`{
  agentId: 'agent_123',
  amount: 5000, 
  currency: 'usd'
}`});

                                        <span className="text-purple-300">if</span> (decision.allowed) {'{'}
                                        <span className="text-gray-500">// Proceed with action</span>
                                        {'}'}
                                    </pre>
                                </div>
                            </div>

                            {/* Python Example (Scroll down or tabbed) */}
                            <div>
                                <h5 className="text-xs font-mono text-gray-500 mb-2 uppercase tracking-widest">PYTHON EXAMPLE</h5>
                                <div className="bg-[#1a1a1a] rounded-lg p-4 border border-white/5 font-mono text-sm overflow-x-auto">
                                    <pre className="text-blue-300">
                                        <span className="text-purple-300">from</span> atrosha <span className="text-purple-300">import</span> Atrosha

                                        client = Atrosha(<span className="text-green-300">'sk_live_...'</span>)

                                        decision = client.transactions.guard(
                                        agent_id=<span className="text-green-300">'agent_123'</span>,
                                        amount=<span className="text-yellow-300">5000</span>
                                        )
                                    </pre>
                                </div>
                            </div>

                        </div>
                    </div>

                </main>
            </div>
        </div>
    );
}
