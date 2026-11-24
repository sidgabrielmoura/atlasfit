import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  distDir: process.env.ATLASFIT_BUILD_DIR || ".next",
  typescript: { tsconfigPath: process.env.ATLASFIT_BUILD_TSCONFIG || "tsconfig.json" },
  experimental: { proxyClientMaxBodySize: "32mb" },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Content-Security-Policy",
            value: "base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self' https://*.abacatepay.com;",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(self), geolocation=(self), interest-cohort=()",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/gym/migrate",
        destination: "/gym/import",
        permanent: false,
      },
      {
        source: "/gym/migrate/:path*",
        destination: "/gym/import/:path*",
        permanent: false,
      },
      {
        source: "/personal/migrate",
        destination: "/personal/clients/migrate",
        permanent: false,
      },
      {
        source: "/personal/migrate/:path*",
        destination: "/personal/clients/migrate/:path*",
        permanent: false,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/sourcemaps/uploading/bundler-plugin-options/

  org: "develoopergab",

  project: "atlasfit",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
