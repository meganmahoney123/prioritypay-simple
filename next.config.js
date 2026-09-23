/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
