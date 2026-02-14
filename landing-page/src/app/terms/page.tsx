import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark">
            <Navbar />
            <main className="max-w-4xl mx-auto px-4 pt-32 pb-20">
                <h1 className="text-4xl font-serif font-bold text-text-light dark:text-white mb-8">Terms of Service</h1>
                <div className="prose dark:prose-invert max-w-none text-muted-light dark:text-muted-dark">
                    <p>Last updated: February 13, 2026</p>
                    <h2>1. Acceptance</h2>
                    <p>By using Atrosha, you agree to these terms.</p>
                    <h2>2. Responsibilities</h2>
                    <p>You are responsible for safely managing your API keys and the actions of your AI agents.</p>
                    <h2>3. Liability</h2>
                    <p>Atrosha provides security tools but cannot guarantee 100% prevention of all financial loss. Use at your own risk.</p>
                </div>
            </main>
            <Footer />
        </div>
    );
}
