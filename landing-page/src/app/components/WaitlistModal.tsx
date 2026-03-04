"use client";

import { useState, useRef, useEffect } from "react";

export default function WaitlistModal({ open, onClose }: { open: boolean; onClose: () => void }) {
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
    const [msg, setMsg] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open) {
            // Delay state updates slightly to avoid synchronous cascading renders
            // when the modal is opened.
            const timer = setTimeout(() => {
                setStatus("idle");
                setEmail("");
                setMsg("");
                inputRef.current?.focus();
            }, 10);
            return () => clearTimeout(timer);
        }
    }, [open]);

    // close on escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onClose]);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setMsg("Enter a valid email");
            setStatus("error");
            return;
        }
        setStatus("loading");
        try {
            const res = await fetch("/api/waitlist", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (res.ok) {
                setStatus("done");
                setMsg(data.message || "You're on the list!");
            } else {
                setStatus("error");
                setMsg(data.error || "Something went wrong");
            }
        } catch {
            setStatus("error");
            setMsg("Network error. Try again.");
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-2xl p-8 max-w-md w-full mx-4 border border-gray-200 dark:border-gray-700 relative"
                onClick={(e) => e.stopPropagation()}
            >
                {/* close btn */}
                <button onClick={onClose} className="absolute top-4 right-4 text-muted-light dark:text-muted-dark hover:text-text-light dark:hover:text-white transition-colors">
                    <span className="material-symbols-outlined">close</span>
                </button>

                {status === "done" ? (
                    <div className="text-center py-4">
                        <span className="material-symbols-outlined text-5xl text-accent-green mb-4 block">check_circle</span>
                        <h3 className="text-xl font-semibold text-text-light dark:text-white mb-2">You&apos;re in!</h3>
                        <p className="text-muted-light dark:text-muted-dark text-sm">{msg}</p>
                    </div>
                ) : (
                    <>
                        <h3 className="text-xl font-semibold text-text-light dark:text-white mb-1">Get Early Access</h3>
                        <p className="text-muted-light dark:text-muted-dark text-sm mb-6">
                            Join the waitlist to be among the first to secure your AI agents.
                        </p>
                        <form onSubmit={submit} className="flex flex-col gap-3">
                            <input
                                ref={inputRef}
                                type="email"
                                placeholder="you@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-background-light dark:bg-background-dark text-text-light dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
                            />
                            {status === "error" && (
                                <p className="text-red-500 text-xs">{msg}</p>
                            )}
                            <button
                                type="submit"
                                disabled={status === "loading"}
                                className="bg-primary hover:bg-primary-hover disabled:opacity-60 text-white px-6 py-3 rounded-lg text-sm font-medium transition-all shadow-glow flex items-center justify-center gap-2"
                            >
                                {status === "loading" ? (
                                    <span className="animate-spin material-symbols-outlined text-sm">progress_activity</span>
                                ) : (
                                    <>
                                        Join Waitlist
                                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                    </>
                                )}
                            </button>
                        </form>
                        <p className="text-xs text-muted-light dark:text-muted-dark mt-4 text-center">
                            No spam. We&apos;ll only email you when it&apos;s ready.
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
