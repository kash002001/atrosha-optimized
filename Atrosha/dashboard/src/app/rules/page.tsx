"use client";

import RulesClient from "./RulesClient";

export default function RulesPage() {
    return (
        <>
            <div className="page-header">
                <h2>Intent Proofs</h2>
                <p>View cryptographically signed records of authorized user intents.</p>
            </div>
            <RulesClient />
        </>
    );
}
