import type { NextConfig } from "next";

// C1: ignoreBuildErrors removed — TypeScript errors now block production builds
// H1: security headers added to match the landing page hardening

const csp = [
    "default-src 'self'",
    // 'unsafe-inline' required by Next.js App Router for inline hydration scripts;
    // 'strict-dynamic' overrides it in modern browsers (Chrome/Firefox/Safari) so XSS is still blocked
    "script-src 'self' 'unsafe-inline' 'strict-dynamic' https://js.stripe.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://js.stripe.com",
    "frame-src https://js.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
].join("; ");

const securityHeaders = [
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    { key: "Content-Security-Policy", value: csp },
];

const nextConfig: NextConfig = {
    transpilePackages: ["recharts"],
    async headers() {
        return [{ source: "/(.*)", headers: securityHeaders }];
    },
};

export default nextConfig;