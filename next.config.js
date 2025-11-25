/** @type {import('next').NextConfig} */
const nextConfig = {
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
    ];
  },
};

module.exports = nextConfig;
