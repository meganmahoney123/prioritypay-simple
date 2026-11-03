/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The deductions post moved to the general blog (Nov 2026) because it
  // applies to both self-employed people and business owners.
  async redirects() {
    return [
      {
        source: "/self-employed/business-tax-deductions",
        destination: "/blog/business-tax-deductions",
        permanent: true,
      },
      {
        source: "/business-owner/business-tax-deductions",
        destination: "/blog/business-tax-deductions",
        permanent: true,
      },
    ];
  },
  // `eslint.ignoreDuringBuilds` was removed in Next.js 16 (next.config.js
  // no longer runs ESLint during the build at all -- `next lint` itself
  // was removed too). No eslint devDependency is installed in this repo
  // anyway, so there's nothing left to configure here.
};

// Vercel always builds fresh, so this only matters for local/dev builds.
if (process.env.PRIORITYPAY_DIST_DIR) {
  nextConfig.distDir = process.env.PRIORITYPAY_DIST_DIR;
}

module.exports = nextConfig;
