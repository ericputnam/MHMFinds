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
      'blog.musthavemods.com',
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
  async rewrites() {
    return [
      // WordPress sitemaps
      {
        source: '/sitemap.xml',
        destination: 'https://blog.musthavemods.com/sitemap.xml',
      },
      {
        source: '/sitemap_index.xml',
        destination: 'https://blog.musthavemods.com/sitemap_index.xml',
      },
      {
        source: '/:sitemap(.*-sitemap.*\\.xml)',
        destination: 'https://blog.musthavemods.com/:sitemap',
      },
      // WordPress feeds
      {
        source: '/feed',
        destination: 'https://blog.musthavemods.com/feed',
      },
      {
        source: '/feed/:path*',
        destination: 'https://blog.musthavemods.com/feed/:path*',
      },
      // WordPress assets
      {
        source: '/wp-content/:path*',
        destination: 'https://blog.musthavemods.com/wp-content/:path*',
      },
      {
        source: '/wp-includes/:path*',
        destination: 'https://blog.musthavemods.com/wp-includes/:path*',
      },
      {
        source: '/wp-json/:path*',
        destination: 'https://blog.musthavemods.com/wp-json/:path*',
      },
      // Catch-all rewrite to WordPress blog
      // Next.js will automatically prioritize its own routes (pages, API, etc.)
      // This only applies to routes that don't exist in the Next.js app
      {
        source: '/:path*',
        destination: 'https://blog.musthavemods.com/:path*',
      },
    ];
  },
  // Reduce bundle size by not including source maps in production
  productionBrowserSourceMaps: false,
};

module.exports = nextConfig;

