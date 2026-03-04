"use client";

import Link from "next/link";

export default function Footer() {
    return (
        <footer className="bg-background-light dark:bg-background-dark pt-16 pb-8 border-t border-gray-100 dark:border-gray-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                    <div className="md:col-span-1">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center text-white font-serif italic font-bold text-sm">
                                A
                            </div>
                            <span className="font-serif font-bold text-lg text-primary dark:text-white">
                                Atrosha
                            </span>
                        </div>

                    </div>
                    <div className="col-span-2 md:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-8">
                        <div>
                            <h4 className="font-bold text-xs uppercase tracking-wider text-text-light dark:text-white mb-6">
                                Product
                            </h4>
                            <ul className="space-y-4">
                                <li>
                                    <Link
                                        className="text-sm text-muted-light dark:text-muted-dark hover:text-primary dark:hover:text-white transition-colors"
                                        href="/#features"
                                    >
                                        Features
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        className="text-sm text-muted-light dark:text-muted-dark hover:text-primary dark:hover:text-white transition-colors"
                                        href="/docs"
                                    >
                                        Integrations
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        className="text-sm text-muted-light dark:text-muted-dark hover:text-primary dark:hover:text-white transition-colors"
                                        href="/#pricing"
                                    >
                                        Pricing
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        className="text-sm text-muted-light dark:text-muted-dark hover:text-primary dark:hover:text-white transition-colors"
                                        href="/changelog"
                                    >
                                        Changelog
                                    </Link>
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold text-xs uppercase tracking-wider text-text-light dark:text-white mb-6">
                                Developers
                            </h4>
                            <ul className="space-y-4">
                                <li>
                                    <Link
                                        className="text-sm text-muted-light dark:text-muted-dark hover:text-primary dark:hover:text-white transition-colors"
                                        href="/docs"
                                    >
                                        Documentation
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        className="text-sm text-muted-light dark:text-muted-dark hover:text-primary dark:hover:text-white transition-colors"
                                        href="/docs#api-reference"
                                    >
                                        API Reference
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        className="text-sm text-muted-light dark:text-muted-dark hover:text-primary dark:hover:text-white transition-colors"
                                        href="/docs#sdks"
                                    >
                                        SDKs
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        className="text-sm text-muted-light dark:text-muted-dark hover:text-primary dark:hover:text-white transition-colors"
                                        href="#"
                                    >
                                        Status
                                    </Link>
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold text-xs uppercase tracking-wider text-text-light dark:text-white mb-6">
                                Company
                            </h4>
                            <ul className="space-y-4">
                                <li>
                                    <Link
                                        className="text-sm text-muted-light dark:text-muted-dark hover:text-primary dark:hover:text-white transition-colors"
                                        href="#"
                                    >
                                        About
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        className="text-sm text-muted-light dark:text-muted-dark hover:text-primary dark:hover:text-white transition-colors"
                                        href="#"
                                    >
                                        Blog
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        className="text-sm text-muted-light dark:text-muted-dark hover:text-primary dark:hover:text-white transition-colors"
                                        href="#"
                                    >
                                        Careers
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        className="text-sm text-muted-light dark:text-muted-dark hover:text-primary dark:hover:text-white transition-colors"
                                        href="/contact"
                                    >
                                        Contact
                                    </Link>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div className="pt-8 border-t border-gray-100 dark:border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-sm text-muted-light dark:text-muted-dark mt-8">
                        © {new Date().getFullYear()} Atrosha. All rights reserved. <span className="opacity-50 text-xs">v1.2</span>
                    </p>
                    <div className="flex space-x-6">
                        <Link
                            className="text-xs text-muted-light dark:text-muted-dark hover:text-primary dark:hover:text-white"
                            href="/privacy"
                        >
                            Privacy Policy
                        </Link>
                        <Link
                            className="text-xs text-muted-light dark:text-muted-dark hover:text-primary dark:hover:text-white"
                            href="/terms"
                        >
                            Terms of Service
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
