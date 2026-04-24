import { withSentryConfig } from "@sentry/nextjs";

const csp = [
  "default-src 'self'",
  // M3: 'strict-dynamic' overrides 'unsafe-inline' in modern browsers, blocking XSS
  // while 'unsafe-inline' keeps older browsers working (fallback only)
  "script-src 'self' 'unsafe-inline' 'strict-dynamic' https://js.stripe.com https://*.vercel-insights.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https:",
  "connect-src 'self' https://*.supabase.co https://api.pwnedpasswords.com https://js.stripe.com wss://*.supabase.co",
  "frame-src https://js.stripe.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig = {
  // output: "standalone",
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig as unknown, {
  org: "atrosha",
  project: "javascript-nextjs",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  webpack: {
    automaticVercelMonitors: true,
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
