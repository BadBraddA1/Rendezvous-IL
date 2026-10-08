import { withSentryConfig } from "@sentry/nextjs/config";

/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    // Clerk Account Portal / email templates often hit legacy reset paths that 404
    // now that auth is custom at /forgot-password.
    return [
      {
        source: "/sign-in/forgot-password",
        destination: "/forgot-password",
        permanent: false,
      },
      {
        source: "/sign-in/reset-password",
        destination: "/forgot-password",
        permanent: false,
      },
      {
        source: "/sign-in/reset",
        destination: "/forgot-password",
        permanent: false,
      },
      {
        source: "/reset-password",
        destination: "/forgot-password",
        permanent: false,
      },
      {
        source: "/reset",
        destination: "/forgot-password",
        permanent: false,
      },
      {
        source: "/forgot",
        destination: "/forgot-password",
        permanent: false,
      },
    ];
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "Document-Policy", value: "js-profiling" }],
      },
    ];
  },

  // Keep native modules out of the Turbopack/webpack bundle.
  serverExternalPackages: ["@sentry/profiling-node", "ably", "sharp"],
  transpilePackages: ["@braddcorp/auth"],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG || "braddcorp",
  project: process.env.SENTRY_PROJECT || "rendezvous-il",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  silent: !process.env.CI,
  webpack: {
    treeshake: { removeDebugLogging: true },
    automaticVercelMonitors: false,
  },
});
