"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4 bg-background-light dark:bg-background-dark">
      <h2 className="text-2xl font-bold mb-4 text-text-light dark:text-white">Something went wrong!</h2>
      <p className="mb-6 text-muted-light dark:text-muted-dark">We&apos;ve been notified of the issue and are looking into it.</p>
      <button
        onClick={() => reset()}
        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
