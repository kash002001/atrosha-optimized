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
                        <div>
                            <span style={{ color: "var(--code-keyword)" }}>import</span> <span style={{ color: "var(--code-builtin)" }}>{"{ "}</span>AtroshaClient<span style={{ color: "var(--code-builtin)" }}>{" }"}</span> <span style={{ color: "var(--code-keyword)" }}>from</span> <span style={{ color: "var(--code-string)" }}>&apos;atrosha-node&apos;</span>;
                            <br /><br />
                            <span style={{ color: "var(--code-comment)" }}>{"// 1. Initialize with your master key and the agent's private key"}</span>
                            <br />
                            <span style={{ color: "var(--code-keyword)" }}>const</span> client = <span style={{ color: "var(--code-keyword)" }}>new</span> <span style={{ color: "var(--code-function)" }}>AtroshaClient</span>(<span style={{ color: "var(--code-string)" }}>&quot;sk_master_...&quot;</span>, <span style={{ color: "var(--code-string)" }}>&quot;agent_priv_...&quot;</span>);
                            <br /><br />
                            <span style={{ color: "var(--code-comment)" }}>{"// 2. Wrap your standard OpenAI call"}</span>
                            <br />
                            <span style={{ color: "var(--code-keyword)" }}>const</span> response = <span style={{ color: "var(--code-keyword)" }}>await</span> client.openai.chat.completions.<span style={{ color: "var(--code-function)" }}>create</span>({"{"}
                            <br />
                            &nbsp;&nbsp;model: <span style={{ color: "var(--code-string)" }}>&quot;gpt-4o&quot;</span>,
                            <br />
                            &nbsp;&nbsp;messages: [{"{"} role: <span style={{ color: "var(--code-string)" }}>&quot;user&quot;</span>, content: <span style={{ color: "var(--code-string)" }}>&quot;Transfer $500 to account X&quot;</span> {"}"}],
                            <br />
                            {"}"});
                            <br /><br />
                            <span style={{ color: "var(--code-comment)" }}>{"// Atrosha automatically verifies the agent's spend limit,"}</span>
                            <br />
                            <span style={{ color: "var(--code-comment)" }}>{"// runs behavioral analysis, and proxies the request to OpenAI."}</span>
                            <br />
                            <span style={{ color: "var(--code-comment)" }}>{"// If it violates policy, it throws an AtroshaPolicyError."}</span>
                        </div>
                        <div className="mt-6 bg-[#252526] p-4 rounded border border-gray-700/50">
                            <span className="text-gray-500">&gt; Proxy validating Ed25519 signature... [OK]</span><br />
                            <span className="text-gray-500">&gt; Checking global spend limits... [OK]</span><br />
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
