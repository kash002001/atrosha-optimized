"use client";

import { useEffect } from "react";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an analytics service
        console.error(error);
    }, [error]);

    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            textAlign: "center",
            padding: 24
        }}>
            <h2 style={{ marginBottom: 16 }}>Something went wrong!</h2>
            <p style={{ color: "var(--text-muted)", marginBottom: 24, maxWidth: 400 }}>
                {error.message || "An unexpected error occurred."}
            </p>
            <button
                className="btn-primary"
                onClick={() => reset()}
            >
                Try again
            </button>
        </div>
    );
}
