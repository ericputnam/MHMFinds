/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable SWC minifier for faster builds
  swcMinify: true,

  // Optimize for Vercel serverless deployment
  output: 'standalone',

  // Use trailing slashes to match WordPress permalink structure
  trailingSlash: true,

  experimental: {
    // appDir: true, // Removed - this is now default in Next.js 14
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'www.thesimsresource.com' },
      { protocol: 'https', hostname: 'simsdom.com' },
      { protocol: 'https', hostname: 'sims4studio.com' },
      { protocol: 'https', hostname: 'cdn.patreon.com' },
      { protocol: 'https', hostname: 'curseforge.com' },
      { protocol: 'https', hostname: 'media.forgecdn.net' },
      { protocol: 'https', hostname: 'media.tumblr.com' },
      { protocol: 'https', hostname: '*.media.tumblr.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'via.placeholder.com' },
      { protocol: 'https', hostname: 'musthavemods.com' },
      { protocol: 'https', hostname: 'blog.musthavemods.com' },
      { protocol: 'https', hostname: 'api.dicebear.com' },
      { protocol: 'https', hostname: 'images.surferseo.art' },
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
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

