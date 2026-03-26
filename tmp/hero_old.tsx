"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function Hero() {
    return (
        <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden flex items-center justify-center min-h-[80vh]">
            <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center select-none overflow-hidden">
                <motion.div
                    animate={{ rotate: 360, scale: [1, 1.1, 1] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[100px] mix-blend-screen dark:mix-blend-normal"
                />
                <motion.div
                    animate={{ rotate: -360, scale: [1, 1.2, 1] }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                    className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] mix-blend-screen dark:mix-blend-normal"
                />
            </div>
            <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
                <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="font-serif text-5xl md:text-7xl lg:text-[5rem] tracking-tight leading-[1.1] text-text-light dark:text-white mb-6 drop-shadow-sm"
                >
                    Code hallucinates. <br />
                    <span className="italic text-primary">Capital shouldn&apos;t.</span>
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="text-lg md:text-xl text-muted-light dark:text-muted-dark max-w-2xl mx-auto mb-10 leading-relaxed"
                >
                    Atrosha is the ultimate Sovereign Financial Agent. We don&apos;t just secure other agents; Atrosha natively ingests invoices, reasons locally, and executes payments perfectly aligned with your cryptographically signed intent.
                </motion.p>
                <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-12">
                    <Link
                        className="relative overflow-hidden group bg-primary hover:bg-primary-hover text-white px-8 py-3.5 rounded-xl text-sm font-semibold transition-all shadow-glow flex items-center gap-2 transform hover:-translate-y-0.5"
                        href="/signup"
                    >
                        <span className="absolute inset-0 w-full h-full bg-white/10 group-hover:bg-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></span>
                        <span className="relative z-10 flex items-center gap-2">
                            Get Started for Free
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
