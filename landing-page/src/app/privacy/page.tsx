import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark">
            <Navbar />
            <main className="max-w-4xl mx-auto px-4 pt-32 pb-20">
                <h1 className="text-4xl font-serif font-bold text-text-light dark:text-white mb-8">Privacy Policy</h1>
                <div className="prose dark:prose-invert max-w-none text-muted-light dark:text-muted-dark">
                    <p>Last updated: February 13, 2026</p>
                    <h2>1. Introduction</h2>
                    <p>Atrosha respects your privacy. This policy explains how we handle your data.</p>
                    <h2>2. Data Collection</h2>
                    <p>We collect your email address when you sign up. We process transaction data sent to our Kernel for analysis and security enforcement.</p>
                    <h2>3. Data Usage</h2>
                    <p>We use data to provide the Atrosha service, improve our fraud detection algorithms, and communicate with you.</p>
                    <h2>4. Contact</h2>
                    <p>Questions? Identifying suspicious activity? Contact us at support@atrosha.bond.</p>
                </div>
            </main>
            <Footer />
        </div>
    );
}
