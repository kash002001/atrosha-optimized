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
                {/* H2: don't leak internal error messages in production */}
                {process.env.NODE_ENV === "development"
                    ? error.message
                    : "An unexpected error occurred. Please try again or contact support."}
            </p>
            {error.digest && (
                <p style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 24, fontFamily: "monospace" }}>
                    Reference: {error.digest}
                </p>
            )}
            <button
                className="btn-primary"
                onClick={() => reset()}
            >
                Try again
            </button>
        </div>
    );
}
