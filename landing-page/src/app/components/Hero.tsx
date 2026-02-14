"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function Hero({ onCta }: { onCta: () => void }) {
    return (
        <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden flex items-center justify-center min-h-[80vh]">
            <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center select-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-b from-primary/5 via-transparent to-transparent rounded-full blur-3xl"></div>
            </div>
            <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="font-serif text-5xl md:text-7xl leading-tight text-text-light dark:text-white mb-6"
                >
                    Code hallucinates. <br />
                    <span className="italic text-primary">Capital shouldn’t.</span>
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="text-lg md:text-xl text-muted-light dark:text-muted-dark max-w-2xl mx-auto mb-10 leading-relaxed"
                >
                    AI agents are now making financial decisions. Atrosha provides the
                    essential security layer, approving safe transactions and blocking risky
                    ones in real-time to protect your capital.
                </motion.p>
                <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-12">
                    <Link
                        className="group bg-primary hover:bg-primary-hover text-white px-8 py-3.5 rounded-lg text-sm font-medium transition-all shadow-glow flex items-center gap-2"
                        href="/signup"
                    >
                        Get Started for Free
                        <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">
                            arrow_forward
                        </span>
                    </Link>
                    <a
                        className="bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 hover:border-primary/30 text-text-light dark:text-white px-8 py-3.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
                        href="/docs"
                    >
                        <span className="material-symbols-outlined text-gray-400 text-lg">
                            description
                        </span>
                        View Documentation
                    </a>
                </div>
                <div className="flex items-center justify-center gap-3 text-sm text-muted-light dark:text-muted-dark">
                    <div className="flex -space-x-2">
                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold border-2 border-background-light dark:border-background-dark text-gray-500">
                            JP
                        </div>
                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold border-2 border-background-light dark:border-background-dark text-gray-500">
                            GS
                        </div>
                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold border-2 border-background-light dark:border-background-dark text-gray-500">
                            MS
                        </div>
                    </div>
                    <span>Trusted by financial engineering teams</span>
                </div>
            </div>
        </section>
    );
}
