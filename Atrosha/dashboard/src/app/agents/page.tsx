"use client";

import AgentsClient from "./AgentsClient";

export default function AgentsPage() {
    return (
        <>
            <div className="page-header">
                <h2>Agents</h2>
                <p>Manage your active agents, spending limits, and security policies.</p>
            </div>
            <AgentsClient />
        </>
    );
}
