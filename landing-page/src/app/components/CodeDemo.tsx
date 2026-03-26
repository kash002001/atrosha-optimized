"use client";
import { motion } from "framer-motion";

const steps = [
    {
        num: "01",
        title: "Drop in an invoice",
        desc: "Email a PDF or drag one into the dashboard. Atrosha's local OCR pipeline extracts vendor, amount, and due date — no cloud, no copy-paste.",
    },
    {
        num: "02",
        title: "Review and sign",
        desc: "You see a plain-English summary: \"Pay Acme Corp $4,250 by April 3rd.\" Hit approve. Your browser signs it with WebCrypto — a signature only you can produce.",
    },
    {
        num: "03",
        title: "Agent executes. Kernel enforces.",
        desc: "The agent carries the signed permit to your payment API. Atrosha verifies the permit at the network layer before the call goes through. Anything else is blocked.",
    },
    {
        num: "04",
        title: "Audit log, always on",
        desc: "Every step — parse, sign, execute, block — is stored with a hash chain. Export it for compliance or just sleep better at night.",
    },
];

export default function HowItWorks() {
    return (
        <section className="py-32 bg-background-light dark:bg-background-dark">
            <div className="max-w-5xl mx-auto px-6">
                <div className="text-center mb-20">
                    <p className="text-xs uppercase tracking-[0.15em] text-primary font-semibold mb-5">The flow</p>
                    <h2 className="font-serif text-3xl md:text-5xl text-text-light dark:text-white leading-tight mb-4">
                        From invoice to settlement in{" "}
                        <span className="italic text-primary">four verifiable steps</span>
                    </h2>
                    <p className="text-muted-light dark:text-muted-dark max-w-xl mx-auto text-base leading-relaxed">
                        No magic, no black box. Here&apos;s exactly what Atrosha does when a payment needs to happen.
                    </p>
                </div>

                <div className="relative">
                    <div className="hidden md:block absolute left-[2.25rem] top-8 bottom-8 w-px bg-gray-200/60 dark:bg-gray-700/40"></div>
                    <div className="space-y-12">
                        {steps.map((step, i) => (
                            <motion.div
                                key={step.num}
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="flex items-start gap-6 group"
                            >
                                <div className="flex-none w-[4.5rem] h-[4.5rem] rounded-2xl bg-primary/10 dark:bg-primary/15 flex items-center justify-center font-mono text-primary font-bold text-lg group-hover:bg-primary group-hover:text-white transition-all duration-300">
                                    {step.num}
                                </div>
                                <div className="pt-3">
                                    <h3 className="text-lg font-bold text-text-light dark:text-white mb-1">{step.title}</h3>
                                    <p className="text-sm text-muted-light dark:text-muted-dark leading-relaxed max-w-lg">{step.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* code snippet */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    whileInView={{ y: 0, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="mt-24 relative rounded-xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.3)] dark:shadow-[0_0_40px_rgba(6,78,59,0.1)] bg-[#1E1E1E] font-mono text-sm leading-relaxed"
                >
                    <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>
                    <div className="relative bg-[#2D2D2D]/90 backdrop-blur-sm px-4 py-3 flex items-center gap-2 border-b border-gray-700/30">
                        <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        </div>
                        <div className="flex-1 text-center text-gray-500 text-xs">agent.py — Python 3.11</div>
                    </div>
                    <div className="p-6 text-gray-300 overflow-x-auto">
                        <div>
                            <span style={{ color: "var(--code-keyword)" }}>from</span>{" "}atrosha{" "}<span style={{ color: "var(--code-keyword)" }}>import</span>{" "}Atrosha
                            <br /><br />
                            client = Atrosha(api_key=<span style={{ color: "var(--code-string)" }}>&quot;sk_live_...&quot;</span>)
                            <br /><br />
                            <span style={{ color: "var(--code-comment)" }}># register an agent with a hard spend cap</span>
                            <br />
                            agent = client.agents.<span style={{ color: "var(--code-function)" }}>create</span>(
                            <br />
                            {"    "}name=<span style={{ color: "var(--code-string)" }}>&quot;invoice-bot&quot;</span>,
                            <br />
                            {"    "}max_spend=<span style={{ color: "var(--code-string)" }}>5000</span>,
                            <br />
                            {"    "}currency=<span style={{ color: "var(--code-string)" }}>&quot;USD&quot;</span>
                            <br />
                            )
                            <br /><br />
                            <span style={{ color: "var(--code-comment)" }}># execute — kernel verifies signed permit before this lands</span>
                            <br />
                            result = agent.<span style={{ color: "var(--code-function)" }}>pay</span>(permit=signed_permit)
                        </div>
                        <div className="mt-6 bg-[#252526] p-4 rounded border border-gray-700/30">
                            <span className="text-gray-500">&gt; Agent registered: invoice-bot [OK]</span><br />
                            <span className="text-gray-500">&gt; Spend cap locked: $5,000 USD [OK]</span><br />
                            <span className="text-gray-500">&gt; Permit signature verified [OK]</span><br />
                            <span className="text-accent-green">&gt; Payment executed: $4,250.00 → Acme Corp [SETTLED]</span>
                        </div>
                        <div className="mt-4 animate-pulse">
                            <span className="text-accent-green font-bold">$</span>{" "}
                            <span className="w-2 h-4 inline-block bg-gray-400 align-middle ml-1"></span>
                        </div>
                    </div>
                </motion.div>
                <p className="text-center text-xs text-muted-light dark:text-muted-dark mt-4">
                    Python SDK — integrates in under 5 minutes. REST API and TypeScript SDK also available.
                </p>
            </div>
        </section>
    );
}
