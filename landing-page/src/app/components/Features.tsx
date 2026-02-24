"use client";

import { motion } from "framer-motion";

export default function Features() {
    return (
        <section className="py-24 bg-white dark:bg-surface-dark border-t border-gray-100 dark:border-gray-800">
            <div className="max-w-4xl mx-auto px-4 text-center mb-20">
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="font-serif text-3xl md:text-5xl text-text-light dark:text-white leading-tight"
                >
                    Trusting an agent with $700 is a risk.
                    <br />
                    Trusting it with <span className="italic text-primary">$7 million</span>{" "}
                    is impossible—until now.
                </motion.h2>
                <div className="w-24 h-1 bg-primary/20 mx-auto mt-8 rounded-full"></div>
            </div>
            <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-3 gap-8">
                <div className="bg-background-light dark:bg-background-dark p-8 rounded-2xl border border-gray-100 dark:border-gray-800 hover:shadow-soft transition-shadow">
                    <div className="w-12 h-12 bg-primary/5 rounded-xl flex items-center justify-center mb-6 text-primary">
                        <span className="material-symbols-outlined">shield</span>
                    </div>
                    <h3 className="text-xl font-bold text-text-light dark:text-white mb-3">
                        Semantic Firewall
                    </h3>
                    <p className="text-muted-light dark:text-muted-dark text-sm leading-relaxed">
                        Sit between your LLM and external APIs. Our custom, on-premise Transformer model analyzes transaction intent at line-rate, instantly blocking hallucinations and hidden prompt injections.
                    </p>
                </div>
                <div className="bg-background-light dark:bg-background-dark p-8 rounded-2xl border border-gray-100 dark:border-gray-800 hover:shadow-soft transition-shadow">
                    <div className="w-12 h-12 bg-primary/5 rounded-xl flex items-center justify-center mb-6 text-primary">
                        <span className="material-symbols-outlined">
                            account_balance_wallet
                        </span>
                    </div>
                    <h3 className="text-xl font-bold text-text-light dark:text-white mb-3">
                        Spend Permits
                    </h3>
                    <p className="text-muted-light dark:text-muted-dark text-sm leading-relaxed">
                        Define rigid spend velocities and single-transaction caps. Agents can
                        reason freely, but they can't wire funds without a cryptographically
                        signed permit.
                    </p>
                </div>
                <div className="bg-background-light dark:bg-background-dark p-8 rounded-2xl border border-gray-100 dark:border-gray-800 hover:shadow-soft transition-shadow">
                    <div className="w-12 h-12 bg-primary/5 rounded-xl flex items-center justify-center mb-6 text-primary">
                        <span className="material-symbols-outlined">block</span>
                    </div>
                    <h3 className="text-xl font-bold text-text-light dark:text-white mb-3">
                        Zero Dependency
                    </h3>
                    <p className="text-muted-light dark:text-muted-dark text-sm leading-relaxed">
                        Built in Rust for &lt; 2ms latency overhead. Deploy as a sidecar or
                        a standalone proxy. No external API calls required for policy
                        evaluation.
                    </p>
                </div>
            </div>
        </section>
    );
}
