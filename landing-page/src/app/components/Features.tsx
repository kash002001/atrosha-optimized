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
                            Zero-Knowledge Ingestion
                        </h3>
                        <p className="text-muted-light dark:text-muted-dark text-sm leading-relaxed">
                            Atrosha runs local OCR and reasoning models (Mistral/Phi-3) directly on your hardware. Invoices and sensitive data never leave your network.
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
                                key
                            </span>
                        </div>
                        <h3 className="text-xl font-bold mb-3 text-text-light dark:text-white">Human-in-the-Loop Execution</h3>
                        <p className="text-muted-light dark:text-muted-dark text-sm leading-relaxed">
                            You sign the exact payment amount and payee using WebCrypto. Atrosha mathematically guarantees the agent can never deviate from this locked instruction.
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
                            Mathematical Enforcement
                        </h3>
                        <p className="text-muted-light dark:text-muted-dark text-sm leading-relaxed">
                            The Atrosha Kernel uses deterministic mathematics to instantly block any hallucinated API calls at the network layer.
                        </p>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
