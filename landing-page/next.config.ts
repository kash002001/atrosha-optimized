import { withSentryConfig } from "@sentry/nextjs";

const nextConfig = {
  // output: "standalone", // Commented out for Vercel deployment
  /* config options here */
};

export default withSentryConfig(nextConfig as unknown, {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  // Suppresses source map uploading logs during build
  silent: true,
  org: "atrosha",
  project: "landing-page", // Change this if your Sentry project name is different
});

