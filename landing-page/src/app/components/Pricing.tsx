"use client";

export default function Pricing({ onCta }: { onCta: () => void }) {
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
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col h-full hover:border-primary/50 transition-colors">
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
                            className="w-full block text-center py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            href="/signup?plan=explorer"
                        >
                            Start Free
                        </a>
                    </div>
                    <div className="relative p-6 rounded-xl border-2 border-gray-200 dark:border-gray-700 flex flex-col h-full bg-white dark:bg-surface-dark shadow-xl shadow-gray-200/50 dark:shadow-none z-10">
                        <div className="absolute -top-3 right-4 bg-primary text-white text-[10px] font-bold uppercase px-2 py-1 rounded tracking-wider">
                            Most Popular
                        </div>
                        <h3 className="text-lg font-bold text-text-light dark:text-white mb-2">
                            Growth
                        </h3>
                        <div className="mb-6 flex items-baseline">
                            <span className="font-serif text-4xl text-text-light dark:text-white">
                                $49
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
                                Semantic Firewall
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="material-symbols-outlined text-primary text-lg">
                                    check
                                </span>
                                Audit Trails
                            </li>
                        </ul>
                        <a
                            className="w-full block text-center py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-colors"
                            href="/signup?plan=growth"
                        >
                            Start Trial
                        </a>
                    </div>
                    <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col h-full hover:border-primary/50 transition-colors">
                        <h3 className="text-lg font-bold text-text-light dark:text-white mb-2">
                            Scale
                        </h3>
                        <div className="mb-6 flex items-baseline">
                            <span className="font-serif text-4xl text-text-light dark:text-white">
                                $199
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
                            className="w-full block text-center py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            href="/signup?plan=scale"
                        >
                            Contact Sales
                        </a>
                    </div>
                    <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col h-full hover:border-primary/50 transition-colors bg-gray-50/50 dark:bg-surface-dark/50">
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
                            className="w-full block text-center py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            href="/signup?plan=enterprise"
                        >
                            Contact Us
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
}
