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

export default nextConfig;
