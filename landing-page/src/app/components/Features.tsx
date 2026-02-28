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
            <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-3 gap-8 relative z-10">
                <motion.div
                    whileHover={{ y: -5 }}
                    className="relative group p-8 rounded-2xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-xl hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-[0_0_30px_rgba(6,78,59,0.15)] overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-primary/10 dark:bg-primary/20 rounded-xl flex items-center justify-center mb-6 text-primary border border-primary/20">
                            <span className="material-symbols-outlined">shield</span>
                        </div>
                        <h3 className="text-xl font-bold text-text-light dark:text-white mb-3">
                            Intercept
                        </h3>
                        <p className="text-muted-light dark:text-muted-dark text-sm leading-relaxed">
                            Sit between your LLM and external APIs. We monitor intent in
                            real-time, blocking unauthorized financial actions before the request
                            ever leaves your network.
                        </p>
                    </div>
                </motion.div>
                <motion.div
                    whileHover={{ y: -5 }}
                    className="relative group p-8 rounded-2xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-xl hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-[0_0_30px_rgba(6,78,59,0.15)] overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-primary/10 dark:bg-primary/20 rounded-xl flex items-center justify-center mb-6 text-primary border border-primary/20">
                            <span className="material-symbols-outlined">
                                account_balance_wallet
                            </span>
                        </div>
                        <h3 className="text-xl font-bold mb-3 text-text-light dark:text-white">Supervisor Approval</h3>
                        <p className="text-muted-light dark:text-muted-dark text-sm leading-relaxed">
                            Don&apos;t fully trust an agent yet? Require a human-in-the-loop cryptographically signed approval for transactions over a certain threshold.
                        </p>
                    </div>
                </motion.div>
                <motion.div
                    whileHover={{ y: -5 }}
                    className="relative group p-8 rounded-2xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-xl hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-primary/10 dark:bg-primary/20 rounded-xl flex items-center justify-center mb-6 text-primary border border-primary/20">
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
                </motion.div>
            </div>
        </section>
    );
}
