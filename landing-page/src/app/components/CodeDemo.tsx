"use client";

export default function CodeDemo() {
    return (
        <section className="py-24 bg-background-light dark:bg-background-dark">
            <div className="max-w-5xl mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="font-serif text-3xl md:text-4xl text-text-light dark:text-white mb-4">
                        Integrate in 120 seconds
                    </h2>
                    <p className="text-muted-light dark:text-muted-dark">
                        Drop into your existing infrastructure with a single binary.
                    </p>
                </div>
                <div className="rounded-xl overflow-hidden shadow-2xl bg-[#1E1E1E] border border-gray-800 font-mono text-sm leading-relaxed">
                    <div className="bg-[#2D2D2D] px-4 py-2 flex items-center gap-2 border-b border-gray-700">
                        <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        </div>
                        <div className="flex-1 text-center text-gray-500 text-xs">
                            agent.py — Python
                        </div>
                    </div>
                    <div className="p-4 sm:p-6 text-gray-300 overflow-x-auto whitespace-nowrap min-w-full">
                        <div className="mb-4">
                            <span className="text-purple-400">from</span> atrosha_sdk.client <span className="text-purple-400">import</span> AtroshaProxy
                        </div>
                        <div className="mb-4">
                            <span className="text-gray-500"># 1. Initialize with your agent's cryptographic identity</span><br />
                            proxy = AtroshaProxy(<br />
                            &nbsp;&nbsp;&nbsp;&nbsp;agent_id=<span className="text-green-300">"agt_123xyz"</span>,<br />
                            &nbsp;&nbsp;&nbsp;&nbsp;private_key_hex=<span className="text-green-300">"7b8f2c...a91e"</span><br />
                            )
                        </div>
                        <div className="mb-4 mt-6">
                            <span className="text-gray-500"># 2. Route the financial request through the Secure Proxy</span><br />
                            response = proxy.execute_request(<br />
                            &nbsp;&nbsp;&nbsp;&nbsp;method=<span className="text-green-300">"POST"</span>,<br />
                            &nbsp;&nbsp;&nbsp;&nbsp;target_url=<span className="text-green-300">"https://api.stripe.com/v1/refunds"</span>,<br />
                            &nbsp;&nbsp;&nbsp;&nbsp;amount=<span className="text-yellow-300">5000</span>, <span className="text-gray-500"># 50.00 USD</span><br />
                            &nbsp;&nbsp;&nbsp;&nbsp;body=<span className="text-green-300">"charge=ch_1abc123"</span><br />
                            )
                        </div>
                        <div className="mt-6 bg-[#252526] p-4 rounded border border-gray-700/50">
                            <span className="text-gray-500">&gt; Proxy validating Ed25519 signature... [OK]</span><br />
                            <span className="text-gray-500">&gt; Semantic intent analysis (conf: 0.98)... [OK]</span><br />
                            <span className="text-gray-500">&gt; Evaluating spend policies... [OK]</span><br />
                            <span className="text-accent-green">&gt; Transaction Approved & Forwarded!</span>
                        </div>
                        <div className="mt-4 animate-pulse">
                            <span className="text-accent-green">$</span>{" "}
                            <span className="w-2 h-4 inline-block bg-gray-400 align-middle ml-1"></span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
