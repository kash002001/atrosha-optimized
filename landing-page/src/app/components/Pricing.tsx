"use client";

import { motion } from "framer-motion";

const plans = [
    {
        name: "Explorer",
        price: "$0",
        period: "/ month",
        tagline: "Learn the ropes.",
        features: [
            "Up to 3 agents",
            "10,000 API requests/mo",
            "Local OCR invoice parsing",
            "WebCrypto intent signing",
            "Basic audit logs",
        ],
        cta: "Start for Free",
        href: "/signup?plan=explorer",
        highlight: false,
    },
    {
        name: "Growth",
        price: "Contact us",
        period: "",
        tagline: "For teams moving real money.",
        features: [
            "Up to 20 agents",
            "Unlimited API requests",
            "Spend permits & hard caps",
            "Full tamper-proof audit trail",
            "Priority email support",
            "Slack integration",
        ],
        cta: "Talk to Us",
        href: "/contact",
        highlight: true,
    },
    {
        name: "Scale",
        price: "Contact us",
        period: "",
        tagline: "For larger finance & ops teams.",
        features: [
            "Unlimited agents",
            "SSO & RBAC",
            "Custom spend policies",
            "Dedicated onboarding",
            "99.9% uptime SLA",
        ],
        cta: "Talk to Us",
        href: "/contact",
        highlight: false,
    },
    {
        name: "Enterprise",
        price: "Custom",
        period: "",
        tagline: "Air-gapped, your infrastructure.",
        features: [
            "VPC / on-prem deployment",
            "Air-gapped local LLM support",
            "Dedicated solutions engineer",
            "Custom SLA & compliance docs",
            "SOC 2 readiness support",
        ],
        cta: "Get a Quote",
        href: "/contact",
        highlight: false,
    },
];

export default function Pricing() {
    return (
        <section className="py-32 bg-white dark:bg-surface-dark">
            <div className="max-w-7xl mx-auto px-6">
                <div className="text-center mb-20">
                    <p className="text-xs uppercase tracking-[0.15em] text-primary font-semibold mb-5">Pricing</p>
                    <h2 className="font-serif text-3xl md:text-5xl text-text-light dark:text-white mb-4">
                        Start free. Scale when it matters.
                    </h2>
                    <p className="text-muted-light dark:text-muted-dark max-w-xl mx-auto text-base leading-relaxed">
                        Every plan includes the core security kernel. You only pay more when your agent fleet grows.
                    </p>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {plans.map((plan, i) => (
                        <motion.div
                            key={plan.name}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.08 }}
                            className={`relative rounded-2xl flex flex-col h-full transition-all duration-300 overflow-hidden ${
                                plan.highlight
                                    ? "p-8 md:p-10 bg-primary/[0.06] dark:bg-primary/[0.08] ring-1 ring-primary/30 shadow-[0_0_40px_rgba(6,78,59,0.1)]"
                                    : "p-8 md:p-10 bg-background-light/60 dark:bg-white/[0.03] hover:bg-background-light dark:hover:bg-white/[0.06]"
                            }`}
                        >
                            {plan.highlight && (
                                <div className="absolute -top-3 right-4 bg-primary text-white text-[10px] font-bold uppercase px-3 py-1 rounded-full tracking-wider shadow-lg">
                                    Most Popular
                                </div>
                            )}
                            <div className="relative z-10 flex flex-col h-full">
                                <h3 className="text-lg font-bold text-text-light dark:text-white mb-1">{plan.name}</h3>
                                <p className="text-xs text-muted-light dark:text-muted-dark mb-5">{plan.tagline}</p>
                                <div className="mb-6 flex items-baseline gap-1">
                                    <span className={`font-serif text-text-light dark:text-white ${plan.price === "Custom" || plan.price === "Contact us" ? "text-2xl" : "text-4xl"}`}>
                                        {plan.price}
                                    </span>
                                    {plan.period && <span className="text-sm text-muted-light dark:text-muted-dark">{plan.period}</span>}
                                </div>
                                <ul className="space-y-3 mb-8 flex-1 text-sm text-muted-light dark:text-muted-dark">
                                    {plan.features.map((feat) => (
                                        <li key={feat} className="flex items-start gap-2">
                                            <span className="material-symbols-outlined text-primary text-lg shrink-0">check</span>
                                            {feat}
                                        </li>
                                    ))}
                                </ul>
                                <a
                                    href={plan.href}
                                    className={`w-full block text-center py-3 rounded-xl text-sm font-semibold transition-all ${
                                        plan.highlight
                                            ? "bg-primary hover:bg-primary-hover text-white shadow-glow transform hover:-translate-y-0.5"
                                            : "bg-white/60 dark:bg-white/[0.06] hover:bg-white dark:hover:bg-white/10 text-text-light dark:text-white font-medium"
                                    }`}
                                >
                                    {plan.cta}
                                </a>
                            </div>
                        </motion.div>
                    ))}
                </div>
                <p className="text-center text-xs text-muted-light dark:text-muted-dark mt-10">
                    All plans include the Atrosha security kernel, WebCrypto signing, and local invoice OCR.{" "}
                    <a href="/contact" className="text-primary underline underline-offset-2 hover:no-underline">Questions? Talk to us.</a>
                </p>
            </div>
        </section>
    );
}
