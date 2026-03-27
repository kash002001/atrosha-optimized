"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function Hero() {
    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
            {/* ambient glow — kept subtle so the text is king */}
            <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden">
                <motion.div
                    animate={{ rotate: 360, scale: [1, 1.08, 1] }}
                    transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                    className="absolute top-1/3 left-1/3 w-[500px] h-[500px] bg-primary/8 rounded-full blur-[140px] mix-blend-screen dark:mix-blend-normal"
                />
                <motion.div
                    animate={{ rotate: -360, scale: [1, 1.15, 1] }}
                    transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                    className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[160px] mix-blend-screen dark:mix-blend-normal"
                />
            </div>

            <div className="relative z-10 max-w-3xl mx-auto px-6 text-center pt-24 pb-12">

                <motion.h1
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.9, ease: "easeOut", delay: 0.1 }}
                    className="font-serif font-bold text-5xl md:text-7xl lg:text-[5rem] tracking-tight leading-[1.1] text-text-light dark:text-white mb-8 drop-shadow-sm"
                >
                    Code hallucinates. <br className="hidden sm:block" />
                    <span className="italic text-primary">
                        Capital shouldn&apos;t.
                    </span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    className="text-lg md:text-xl text-muted-light dark:text-muted-dark max-w-2xl mx-auto mb-10 leading-relaxed"
                >
                    Atrosha is a financial firewall for autonomous AI agents. It reads invoices locally, verifies intent with your cryptographic signature, and only then executes the payment — on your hardware, with a full audit trail.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.45 }}
                    className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-16"
                >
                    <Link
                        className="relative overflow-hidden group bg-primary hover:bg-primary-hover text-white px-8 py-3.5 rounded-xl text-sm font-semibold transition-all shadow-glow flex items-center gap-2 transform hover:-translate-y-0.5"
                        href="/signup"
                    >
                        <span className="absolute inset-0 w-full h-full bg-white/10 group-hover:bg-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></span>
                        <span className="relative z-10 flex items-center gap-2">
                            Start for Free
                            <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">
                                arrow_forward
                            </span>
                        </span>
                    </Link>
                    <a
                        className="bg-white/50 dark:bg-surface-dark/50 backdrop-blur-md border border-gray-200 dark:border-gray-700 hover:border-primary/50 text-text-light dark:text-white px-8 py-3.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 transform hover:-translate-y-0.5"
                        href="/docs"
                    >
                        <span className="material-symbols-outlined text-gray-400 text-lg">
                            description
                        </span>
                        Read the Docs
                    </a>
                </motion.div>

            </div>
        </section>
    );
}
