/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable SWC minifier for faster builds
  swcMinify: true,

  // Optimize for Vercel serverless deployment
  output: 'standalone',

  experimental: {
    // appDir: true, // Removed - this is now default in Next.js 14
  },
  images: {
    domains: [
      'www.thesimsresource.com',
      'simsdom.com',
      'sims4studio.com',
      'cdn.patreon.com',
      'curseforge.com',
      'media.tumblr.com',
      'images.unsplash.com',
      'via.placeholder.com',
      'musthavemods.com',
      'api.dicebear.com'
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
      {
        // Add caching headers for API routes
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=300',
          },
        ],
      },
    ];
  },
  // Reduce bundle size by not including source maps in production
  productionBrowserSourceMaps: false,
};

module.exports = nextConfig;

