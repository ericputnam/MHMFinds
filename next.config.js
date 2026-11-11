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
    // Ensure the funnel dashboard's committed data file is traced into the
    // serverless bundle under `output: 'standalone'` — otherwise
    // fs.readFileSync(process.cwd() + '/reports/funnel/history.json') in
    // app/api/admin/funnel/history/route.ts finds nothing on Vercel even
    // though the file exists in the repo.
    outputFileTracingIncludes: {
      '/api/admin/funnel/history': ['./reports/funnel/history.json'],
    },
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
      // Per-user / session-dependent API responses must never sit in a shared cache.
      // The blanket rule above overrides a route's own `no-store` (#219), so these
      // later entries override it back for every path whose answer depends on who asks.
      ...[
        '/api/account/:path*',
        '/api/admin/:path*',
        '/api/auth/:path*',
        '/api/creator/:path*',
        '/api/monetization/:path*',
        '/api/subscription/:path*',
        '/api/cron/:path*',
        '/api/webhooks/:path*',
        '/api/mods/:id/favorite',
      ].map((source) => ({
        source,
        headers: [{ key: 'Cache-Control', value: 'private, no-store' }],
      })),
    ];
  },
  // Reduce bundle size by not including source maps in production
  productionBrowserSourceMaps: false,
};

module.exports = nextConfig;

