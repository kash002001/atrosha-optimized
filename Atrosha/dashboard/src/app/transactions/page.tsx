"use client";

import TransactionsClient from "./TransactionsClient";

export default function TransactionsPage() {
    return (
        <>
            <div className="page-header">
                <h2>Transactions</h2>
                <p>Full audit log of all proxied financial operations.</p>
            </div>
            <TransactionsClient />
        </>
    );
}
