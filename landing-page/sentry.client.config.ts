import * as Sentry from "@sentry/nextjs";

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // only trace 20% of sessions in prod — was 100%, way too heavy
    tracesSampleRate: 0.2,

    // lazy-load replay to keep initial bundle small
    integrations: [Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false })],

    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0,
});
