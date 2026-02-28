"use client";

import { motion } from "framer-motion";

export default function Pricing() {
    return (
        <section className="py-24 bg-white dark:bg-surface-dark border-t border-gray-100 dark:border-gray-800">
            <div className="max-w-7xl mx-auto px-4">
                <div className="text-center mb-16">
                    <h2 className="font-serif text-3xl md:text-5xl text-text-light dark:text-white mb-4">
                        Secure your capital
                    </h2>
                    <p className="text-muted-light dark:text-muted-dark max-w-2xl mx-auto">
                        Start with our free tier for development. Upgrade as your agent fleet
                        manages real value.
                    </p>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
                    <motion.div
                        whileHover={{ y: -5 }}
                        className="p-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-xl flex flex-col h-full hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-[0_0_30px_rgba(6,78,59,0.1)]"
                    >
                        <h3 className="text-lg font-bold text-text-light dark:text-white mb-2">
                            Explorer
                        </h3>
                        <div className="mb-6 flex items-baseline">
                            <span className="font-serif text-4xl text-text-light dark:text-white">
                                $0
                            </span>
                            <span className="text-sm text-muted-light dark:text-muted-dark">
                                /mo
                            </span>
                        </div>
                        <ul className="space-y-3 mb-8 flex-1 text-sm text-muted-light dark:text-muted-dark">
                            <li className="flex items-start gap-2">
                                <span className="material-symbols-outlined text-primary text-lg">
                                    check
                                </span>
                                Up to 3 Agents
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="material-symbols-outlined text-primary text-lg">
                                    check
                                </span>
                                10k Requests/mo
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="material-symbols-outlined text-primary text-lg">
                                    check
                                </span>
                                Basic Logs
                            </li>
                        </ul>
                        <a
                            className="w-full block text-center py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium hover:bg-white/50 dark:hover:bg-white/10 transition-colors"
                            href="/signup?plan=explorer"
                        >
                            Start Free
                        </a>
                    </motion.div>
                    <motion.div
                        whileHover={{ y: -5 }}
                        className="relative p-8 rounded-2xl border-2 border-primary/50 dark:border-primary flex flex-col h-full bg-white/90 dark:bg-surface-dark/95 backdrop-blur-2xl shadow-2xl shadow-primary/10 dark:shadow-[0_0_40px_rgba(6,78,59,0.2)] z-10 transform-gpu"
                    >
                        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-[50px] rounded-full"></div>
                        </div>
                        <div className="absolute -top-3 right-4 bg-primary text-white text-[10px] font-bold uppercase px-3 py-1 rounded-full tracking-wider shadow-lg">
                            Most Popular
                        </div>
                        <h3 className="text-lg font-bold text-text-light dark:text-white mb-2">
                            Growth
                        </h3>
                        <div className="mb-6 flex items-baseline">
                            <span className="font-serif text-3xl text-text-light dark:text-white">
                                Contact Us
                            </span>
                        </div>
                        <ul className="space-y-3 mb-8 flex-1 text-sm text-muted-light dark:text-muted-dark">
                            <li className="flex items-start gap-2">
                                <span className="material-symbols-outlined text-primary text-lg">
                                    check
                                </span>
                                Up to 20 Agents
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="material-symbols-outlined text-primary text-lg">
                                    check
                                </span>
                                Unlimited Requests
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="material-symbols-outlined text-primary text-lg">
                                    check
                                </span>
                                Spend Permits
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="material-symbols-outlined text-primary text-lg">
                                    check
                                </span>
                                Audit Trails
                            </li>
                        </ul>
                        <a
                            className="w-full block text-center py-3 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-all shadow-[0_0_20px_rgba(6,78,59,0.3)] hover:shadow-[0_0_30px_rgba(6,78,59,0.5)] transform hover:-translate-y-0.5 relative z-10"
                            href="/signup?plan=growth"
                        >
                            Contact Sales
                        </a>
                    </motion.div>
                    <motion.div
                        whileHover={{ y: -5 }}
                        className="p-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-xl flex flex-col h-full hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-[0_0_30px_rgba(6,78,59,0.1)]"
                    >
                        <h3 className="text-lg font-bold text-text-light dark:text-white mb-2">
                            Scale
                        </h3>
                        <div className="mb-6 flex items-baseline">
                            <span className="font-serif text-3xl text-text-light dark:text-white">
                                Contact Us
                            </span>
                        </div>
                        <ul className="space-y-3 mb-8 flex-1 text-sm text-muted-light dark:text-muted-dark">
                            <li className="flex items-start gap-2">
                                <span className="material-symbols-outlined text-primary text-lg">
                                    check
                                </span>
                                Unlimited Agents
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="material-symbols-outlined text-primary text-lg">
                                    check
                                </span>
                                SSO & RBAC
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="material-symbols-outlined text-primary text-lg">
                                    check
                                </span>
                                Priority Support
                            </li>
                        </ul>
                        <a
                            className="w-full block text-center py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium hover:bg-white/50 dark:hover:bg-white/10 transition-colors"
                            href="/signup?plan=scale"
                        >
                            Contact Sales
                        </a>
                    </motion.div>
                    <motion.div
                        whileHover={{ y: -5 }}
                        className="p-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-xl flex flex-col h-full hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-[0_0_30px_rgba(16,185,129,0.1)]"
                    >
                        <h3 className="text-lg font-bold text-text-light dark:text-white mb-2">
                            Enterprise
                        </h3>
                        <div className="mb-6 flex items-baseline">
                            <span className="font-serif text-4xl text-text-light dark:text-white">
                                Custom
                            </span>
                        </div>
                        <ul className="space-y-3 mb-8 flex-1 text-sm text-muted-light dark:text-muted-dark">
                            <li className="flex items-start gap-2">
                                <span className="material-symbols-outlined text-primary text-lg">
                                    check
                                </span>
                                VPC Deployment
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="material-symbols-outlined text-primary text-lg">
                                    check
                                </span>
                                Dedicated Solutions Engineer
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="material-symbols-outlined text-primary text-lg">
                                    check
                                </span>
                                SLA Guarantees
                            </li>
                        </ul>
                        <a
                            className="w-full block text-center py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium hover:bg-white/50 dark:hover:bg-white/10 transition-colors"
                            href="/signup?plan=enterprise"
                        >
                            Contact Us
                        </a>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
