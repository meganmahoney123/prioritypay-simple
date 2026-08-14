/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // No eslint devDependency is installed; avoid Next trying to
    // auto-install one mid-build (which can hang without a TTY).
    ignoreDuringBuilds: true,
  },
};

// Vercel always builds fresh, so this only matters for local/dev builds.
if (process.env.PRIORITYPAY_DIST_DIR) {
  nextConfig.distDir = process.env.PRIORITYPAY_DIST_DIR;
}

module.exports = nextConfig;
