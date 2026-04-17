/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Next.js 15: server actions are stable, no flag needed
  },
  eslint: {
    // Warnings don't block production builds — errors still do.
    ignoreDuringBuilds: false,
  },
}

module.exports = nextConfig
