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

            <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="inline-flex items-center gap-2 bg-primary/10 dark:bg-primary/15 border border-primary/20 text-primary text-[11px] font-semibold uppercase tracking-[0.15em] px-4 py-2 rounded-full mb-10"
                >
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                    Agentic Finance, Secured
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.9, ease: "easeOut", delay: 0.1 }}
                    className="font-serif text-4xl md:text-6xl lg:text-[4.25rem] tracking-tight leading-[1.12] text-text-light dark:text-white mb-8"
                >
                    Your AI agents spend money.{" "}
                    <br className="hidden sm:block" />
                    <span className="italic text-primary">We make sure they don&apos;t go rogue.</span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    className="text-base md:text-lg text-muted-light dark:text-muted-dark max-w-xl mx-auto mb-12 leading-relaxed"
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

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 0.7 }}
                    className="flex flex-wrap justify-center items-center gap-x-8 gap-y-3 text-sm text-muted-light dark:text-muted-dark"
                >
                    {["Runs locally — no data leaves your network", "WebCrypto-signed intent", "Full audit trail"].map((item, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-primary text-base">check_circle</span>
                            {item}
                        </div>
                    ))}
                </motion.div>
            </div>

            {/* scroll hint */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2, duration: 1 }}
                className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-light dark:text-muted-dark"
            >
                <span className="text-[11px] uppercase tracking-widest">Scroll</span>
                <motion.span
                    animate={{ y: [0, 6, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="material-symbols-outlined text-sm"
                >
                    expand_more
                </motion.span>
            </motion.div>
        </section>
    );
}
