"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const quotes = [
    {
        text: "We run 12 invoicing agents across three subsidiaries. Before Atrosha, a single hallucinated payee could cost us six figures. Now every transaction is signed and logged — compliance loves it.",
        name: "Head of Finance Automation",
        company: "Series B SaaS company",
    },
    {
        text: "The local OCR was the deal-breaker for us. Our invoices contain sensitive supplier data that can't leave our network. Atrosha was the only tool that made that a hard guarantee, not a policy.",
        name: "VP Engineering",
        company: "Enterprise logistics firm",
    },
    {
        text: "Setting up a spend cap with a cryptographic lock sounds complex, but the API is genuinely simple. We had it running in our staging environment within an afternoon.",
        name: "Senior Backend Engineer",
        company: "Fintech startup",
    },
];

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
            <section className="py-16 border-t border-gray-100 dark:border-gray-800 bg-background-light dark:bg-background-dark">
                <div className="max-w-6xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                    {stats.map((s, i) => (
                        <motion.div
                            key={s.label}
                            initial={{ opacity: 0, y: 15 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.08 }}
                        >
                            <div className="font-serif text-3xl md:text-4xl text-primary mb-1">{s.value}</div>
                            <div className="text-xs text-muted-light dark:text-muted-dark leading-snug">{s.label}</div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* testimonials */}
            <section className="py-24 bg-white dark:bg-surface-dark border-t border-gray-100 dark:border-gray-800">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center mb-16">
                        <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-4">From the field</p>
                        <h2 className="font-serif text-3xl md:text-4xl text-text-light dark:text-white">
                            What teams say after{" "}
                            <span className="italic text-primary">their first month</span>
                        </h2>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        {quotes.map((q, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="p-8 rounded-2xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-xl hover:border-primary/30 transition-all duration-300"
                            >
                                <div className="text-primary text-3xl font-serif leading-none mb-4">&ldquo;</div>
                                <p className="text-sm text-muted-light dark:text-muted-dark leading-relaxed mb-6">{q.text}</p>
                                <div>
                                    <p className="text-sm font-semibold text-text-light dark:text-white">{q.name}</p>
                                    <p className="text-xs text-muted-light dark:text-muted-dark">{q.company}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* final CTA */}
            <section className="py-24 border-t border-gray-100 dark:border-gray-800 bg-background-light dark:bg-background-dark">
                <div className="max-w-3xl mx-auto px-4 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="font-serif text-3xl md:text-5xl text-text-light dark:text-white mb-6 leading-tight">
                            Your agents are already making decisions.{" "}
                            <span className="italic text-primary">Start controlling them.</span>
                        </h2>
                        <p className="text-muted-light dark:text-muted-dark mb-10 text-lg leading-relaxed">
                            Set up Atrosha in an afternoon. Free for up to 3 agents. No credit card required.
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
