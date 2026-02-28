"use client";

import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react'; // Added CheckCircle2 import
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function ContactPage() {
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setStatus('loading');

        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData);

        try {
            const res = await fetch('/api/contact', {
                method: 'POST',
                body: JSON.stringify(data),
                headers: { 'Content-Type': 'application/json' }
            });

            if (!res.ok) throw new Error();
            setStatus('success');
        } catch {
            setStatus('error');
        }
    }

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark">
            <Navbar />
            <main className="max-w-2xl mx-auto px-4 pt-32 pb-20">
                <h1 className="text-4xl font-serif font-bold text-text-light dark:text-white mb-4">Contact Us</h1>
                <p className="text-muted-light dark:text-muted-dark mb-12">
                    Have a question, need enterprise volume, or want to explore custom integrations?
                    We&apos;d love to hear from you.
                </p>

                {status === 'success' ? (
                    <div className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 p-6 rounded-lg text-center">
                        <CheckCircle2 className="w-12 h-12 mx-auto mb-4" />
                        <h3 className="font-bold text-lg mb-2">Message Sent!</h3>
                        <p>We&apos;ll get back to you within 24 hours.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-white mb-2">Name</label>
                            <input name="name" required className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-gray-800 rounded-lg px-4 py-3 text-text-light dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="Jane Doe" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-white mb-2">Email</label>
                            <input name="email" type="email" required className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-gray-800 rounded-lg px-4 py-3 text-text-light dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="jane@company.com" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-white mb-2">Message</label>
                            <textarea name="message" required rows={5} className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-gray-800 rounded-lg px-4 py-3 text-text-light dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="How can we help?" />
                        </div>

                        {
                            status === 'error' && (
                                <p className="text-red-400 text-sm">Something went wrong. Please try again.</p>
                            )
                        }

                        <button
                            disabled={status === 'loading'}
                            className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3.5 rounded-lg transition-colors disabled:opacity-50"
                        >
                            {status === 'loading' ? 'Sending...' : 'Send Message'}
                        </button>
                    </form >
                )
                }
            </main >
            <Footer />
        </div >
    );
}
