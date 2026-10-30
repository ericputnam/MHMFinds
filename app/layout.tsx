import React from 'react';
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';
import Script from 'next/script';
import { ConditionalScripts } from './components/ConditionalScripts';
import { Analytics } from "@vercel/analytics/next";
import { CATALOG_FINDS } from '@/lib/seo/catalogCount';

const HOME_TITLE = `Must-Have Sims 4 Mods & CC — ${CATALOG_FINDS} Verified Finds | MustHaveMods`;
const HOME_DESCRIPTION = `${CATALOG_FINDS} must-have Sims 4 mods and CC in one searchable list — hair, clothes, poses, furniture, gameplay mods and more, every link checked by hand.`;

export const metadata: Metadata = {
  // E259 (2026-10-23): "Must-Have Sims 4 Mods" leads so the title carries the
  // query text of the homepage's largest non-navigational cluster — "sims 4
  // must have mods" / "must have sims 4 mods" / "must have mods for sims 4",
  // 321 impr at pos ≈7 with 10.6% CTR over 10-07→10-20 — and the count moves
  // 15,000+ → 17,000+ (catalog 17,004 on 10-23; now CATALOG_FINDS). "Finder" stays on the
  // /games/* hub titles, which keeps the homepage distinct from /games/sims-4/cc/.
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  authors: [{ name: 'MustHaveMods Team' }],
  keywords: 'sims 4 mods, sims 4 cc, custom content, sims mods, sims 4 custom content, mod finder, musthavemods',
  creator: 'MustHaveMods',
  publisher: 'MustHaveMods',
  robots: 'index, follow',
  openGraph: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    url: 'https://musthavemods.com',
    siteName: 'MustHaveMods',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'MustHaveMods - Premium Sims 4 Mods Discovery Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: ['/og-image.jpg'],
  },
  metadataBase: new URL('https://musthavemods.com'),
  manifest: '/site.webmanifest',
  alternates: {
    canonical: '/',
    types: {
      'application/rss+xml': 'https://musthavemods.com/feeds/mods.xml',
      'application/feed+json': 'https://musthavemods.com/feeds/mods.json',
    },
  },
  category: 'Gaming',
  classification: 'Sims 4 Mods Platform',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1e1b4b',
  colorScheme: 'light',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-XV4WLV1DY1"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-XV4WLV1DY1');
          `}
        </Script>

        {/* Microsoft Clarity */}
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "jr6703hzyr");
          `}
        </Script>

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />

        {/*
          Mediavine performance hints.
          Matches the wp_head priority-1 hints added to the WordPress blog in
          functions.php — the Next.js app was missing these, which is the
          single biggest fixable cause of slow first-ad render. Shaves
          ~200-400ms off initial ad load by warming up the TLS/DNS to
          Mediavine's auction and creative delivery endpoints before the
          wrapper script runs.
        */}
        <link rel="preconnect" href="https://scripts.mediavine.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://exchange.mediavine.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://keywords.mediavine.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://video.mediavine.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://ads.mediavine.com" />
        <link
          rel="preload"
          as="script"
          href="https://scripts.mediavine.com/tags/must-have-mods-new-owner.js"
          crossOrigin="anonymous"
        />
        <meta name="theme-color" content="#1e1b4b" />
        <meta name="msapplication-TileColor" content="#1e1b4b" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="MustHaveMods" />
        <meta name="application-name" content="MustHaveMods" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* JSON-LD Structured Data for SEO/GEO (SEO-002). Site-wide nodes only:
            the homepage WebPage + FAQPage render from app/page.tsx via
            components/HomeJsonLd.tsx (E189) so other pages do not claim to be
            the homepage. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'WebSite',
                  '@id': 'https://musthavemods.com/#website',
                  url: 'https://musthavemods.com',
                  name: 'MustHaveMods',
                  description: `Find Sims 4 CC, mods, and custom content. Search ${CATALOG_FINDS} verified mods for Sims 4, Stardew Valley, and Minecraft.`,
                  publisher: {
                    '@id': 'https://musthavemods.com/#organization',
                  },
                  potentialAction: [
                    {
                      '@type': 'SearchAction',
                      target: {
                        '@type': 'EntryPoint',
                        urlTemplate: 'https://musthavemods.com/?search={search_term_string}',
                      },
                      'query-input': 'required name=search_term_string',
                    },
                  ],
                  inLanguage: 'en-US',
                },
                {
                  '@type': 'Organization',
                  '@id': 'https://musthavemods.com/#organization',
                  name: 'MustHaveMods',
                  url: 'https://musthavemods.com',
                  logo: {
                    '@type': 'ImageObject',
                    inLanguage: 'en-US',
                    '@id': 'https://musthavemods.com/#logo',
                    url: 'https://musthavemods.com/logo.png',
                    contentUrl: 'https://musthavemods.com/logo.png',
                    width: 512,
                    height: 512,
                    caption: 'MustHaveMods',
                  },
                  image: {
                    '@id': 'https://musthavemods.com/#logo',
                  },
                  sameAs: [],
                },
              ],
            }),
          }}
        />
      </head>
      <body className="__className_e8ce0c antialiased">
        <ConditionalScripts />
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
