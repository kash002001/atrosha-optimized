"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const stats = [
    { value: "$0", label: "to get started" },
    { value: "< 5min", label: "to first integration" },
    { value: "100%", label: "local reasoning — no data leaks" },
    { value: "0", label: "hallucinated payments shipped" },
];

export default function SocialProof() {
    return (
        <>
            {/* stats strip */}
            <section className="py-20 bg-background-light dark:bg-background-dark">
                <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
                    {stats.map((s, i) => (
                        <motion.div
                            key={s.label}
                            initial={{ opacity: 0, y: 15 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.08 }}
                            className="bg-primary/[0.03] dark:bg-white/[0.02] p-8 rounded-2xl border border-primary/5 dark:border-white/5"
                        >
                            <div className="font-serif text-3xl md:text-4xl text-primary mb-3">{s.value}</div>
                            <div className="text-xs text-muted-light dark:text-muted-dark leading-snug">{s.label}</div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* final CTA */}
            <section className="py-32 bg-background-light dark:bg-background-dark">
                <div className="max-w-3xl mx-auto px-6 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="font-serif text-3xl md:text-5xl text-text-light dark:text-white mb-6 leading-tight">
                            Your agents are already making decisions.{" "}
                            <span className="italic text-primary">Start controlling them.</span>
                        </h2>
                        <p className="text-muted-light dark:text-muted-dark mb-12 text-lg leading-relaxed">
                            Set up Atrosha.
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center gap-4">
                            <Link
                                href="/signup"
                                className="relative overflow-hidden group bg-primary hover:bg-primary-hover text-white px-8 py-4 rounded-xl text-sm font-semibold transition-all shadow-glow flex items-center justify-center gap-2 transform hover:-translate-y-0.5"
                            >
                                <span className="absolute inset-0 w-full h-full bg-white/10 group-hover:bg-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></span>
                                <span className="relative z-10 flex items-center gap-2">
                                    Create Free Account
                                    <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                </span>
                            </Link>
                            <Link
                                href="/contact"
                                className="bg-white/50 dark:bg-surface-dark/50 backdrop-blur-md border border-gray-200 dark:border-gray-700 hover:border-primary/50 text-text-light dark:text-white px-8 py-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 transform hover:-translate-y-0.5"
                            >
                                <span className="material-symbols-outlined text-gray-400 text-lg">chat</span>
                                Talk to the team
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </section>
        </>
    );
}
