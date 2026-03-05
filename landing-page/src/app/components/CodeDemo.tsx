"use client";
import { motion } from "framer-motion";

export default function CodeDemo() {
    return (
        <section className="py-24 bg-background-light dark:bg-background-dark">
            <div className="max-w-5xl mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="font-serif text-3xl md:text-4xl text-text-light dark:text-white mb-4">
                        Integrate in 120 seconds
                    </h2>
                    <p className="text-muted-light dark:text-muted-dark">
                        Run our sovereign loop out of the box.
                    </p>
                </div>
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    whileInView={{ y: 0, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    animate={{ y: [0, -10, 0] }}
                    className="relative rounded-xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] dark:shadow-[0_0_40px_rgba(6,78,59,0.15)] bg-[#1E1E1E] border border-gray-700/50 font-mono text-sm leading-relaxed transform-gpu"
                >
                    <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>
                    <div className="relative bg-[#2D2D2D]/90 backdrop-blur-sm px-4 py-3 flex items-center gap-2 border-b border-gray-700/50">
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
                            <span style={{ color: "var(--code-keyword)" }}>import</span> atrosha
                            <br />
                            <span style={{ color: "var(--code-keyword)" }}>from</span> atrosha.agent <span style={{ color: "var(--code-keyword)" }}>import</span> SovereignAgent
                            <br /><br />
                            <span style={{ color: "var(--code-comment)" }}>{"# 1. Local OCR extraction (No cloud APIs)"}</span>
                            <br />
                            invoice_data = atrosha.<span style={{ color: "var(--code-function)" }}>ingest</span>(<span style={{ color: "var(--code-string)" }}>"invoice_dec_2026.pdf"</span>)
                            <br /><br />
                            <span style={{ color: "var(--code-comment)" }}>{"# 2. Local reasoning via Ollama (Mistral/Phi-3)"}</span>
                            <br />
                            payment_intent = SovereignAgent.<span style={{ color: "var(--code-function)" }}>reason</span>(invoice_data)
                            <br /><br />
                            <span style={{ color: "var(--code-comment)" }}>{"# 3. Cryptographically enforced execution"}</span>
                            <br />
                            <span style={{ color: "var(--code-comment)" }}>{"# Requires matching CFO-signed WebCrypto signature in proxy"}</span>
                            <br />
                            payment_intent.<span style={{ color: "var(--code-function)" }}>execute</span>()
                        </div>
                        <div className="mt-6 bg-[#252526] p-4 rounded border border-gray-700/50">
                            <span className="text-gray-500">&gt; Local Intelligence analyzing invoice... [OK]</span><br />
                            <span className="text-gray-500">&gt; Verify Mathematical Intent signature... [OK]</span><br />
                            <span className="text-accent-green">&gt; Payment Executed & Secured!</span>
                        </div>
                        <div className="mt-4 animate-pulse">
                            <span className="text-accent-green font-bold">$</span>{" "}
                            <span className="w-2 h-4 inline-block bg-gray-400 align-middle ml-1"></span>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
