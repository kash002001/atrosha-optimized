"use client";

import { motion } from "framer-motion";

const features = [
    {
        icon: "policy",
        title: "Invoice Ingestion, On-Prem",
        description:
            "Atrosha reads your invoices using local OCR models (Mistral, Phi-3). The raw document — vendor name, amount, due date — is parsed entirely on your hardware. Nothing hits an external API.",
    },
    {
        icon: "draw",
        title: "You Sign. The Agent Obeys.",
        description:
            "Before any money moves, you cryptographically sign the exact payment: payee, amount, currency. Atrosha's kernel locks that intent. The agent literally cannot go beyond what you approved.",
    },
    {
        icon: "block",
        title: "Hallucination Firewall",
        description:
            "LLMs make things up. Atrosha intercepts every outbound API call at the network layer and verifies it against your signed permit. Fabricated transactions are rejected before they leave your system.",
    },
    {
        icon: "history",
        title: "Tamper-Proof Audit Trail",
        description:
            "Every action — invoice parsed, signature verified, payment executed or blocked — is logged with a cryptographic hash. Your compliance team finally has a paper trail that can't be edited.",
    },
    {
        icon: "groups",
        title: "Multi-Agent Fleet Control",
        description:
            "Managing one agent is simple. Managing twenty is chaos. Atrosha gives you a single dashboard to track spend limits, approvals, and activity across every agent in your organization.",
    },
    {
        icon: "lock",
        title: "Zero External Dependencies",
        description:
            "No third-party cloud required for the core security layer. Your financial logic stays inside your VPC. Atrosha is designed to pass enterprise security reviews the first time.",
    },
];

export default function Features() {
    return (
        <section className="py-32 bg-white dark:bg-surface-dark">
            <div className="max-w-4xl mx-auto px-6 text-center mb-20">
                <motion.p
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="text-xs uppercase tracking-[0.15em] text-primary font-semibold mb-5"
                >
                    How it works
                </motion.p>
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="font-serif text-3xl md:text-5xl text-text-light dark:text-white leading-tight"
                >
                    The AI agent already has access to your bank.{" "}
                    <span className="italic text-primary">Atrosha decides what it&apos;s allowed to do with it.</span>
                </motion.h2>
                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.15 }}
                    className="mt-6 text-muted-light dark:text-muted-dark max-w-2xl mx-auto text-base leading-relaxed"
                >
                    Most teams bolt authentication onto an existing agent and call it secure. Atrosha wraps the entire financial execution loop — ingestion, reasoning, signing, and settlement — in a mathematically verifiable kernel.
                </motion.p>
            </div>
            <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {features.map((f, i) => (
                    <motion.div
                        key={f.title}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.07 }}
                        className="group p-8 md:p-10 rounded-2xl bg-background-light/60 dark:bg-white/[0.03] hover:bg-background-light dark:hover:bg-white/[0.06] transition-all duration-300"
                    >
                        <div className="w-11 h-11 bg-primary/10 dark:bg-primary/15 rounded-xl flex items-center justify-center mb-6 text-primary">
                            <span className="material-symbols-outlined text-xl">{f.icon}</span>
                        </div>
                        <h3 className="text-lg font-bold text-text-light dark:text-white mb-3">{f.title}</h3>
                        <p className="text-muted-light dark:text-muted-dark text-sm leading-relaxed">{f.description}</p>
                    </motion.div>
                ))}
            </div>
        </section>
    );
}
