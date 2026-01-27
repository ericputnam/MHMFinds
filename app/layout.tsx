import React from 'react';
import type { Metadata, Viewport } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import Script from 'next/script';
import { ConditionalScripts } from './components/ConditionalScripts';
import { Analytics } from "@vercel/analytics/next";

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-poppins',
});

export const metadata: Metadata = {
  title: 'MustHaveMods - Premium Sims 4 Mods & Custom Content Discovery',
  description: 'Discover premium Sims 4 mods with AI-powered recommendations. The ultimate destination for custom content creators and players. Curated collections, exclusive mods, and intelligent discovery.',
  authors: [{ name: 'MustHaveMods Team' }],
  keywords: 'sims 4 mods, custom content, sims mods, premium mods, ai recommendations, sims 4 custom content, mod discovery, musthavemods',
  creator: 'MustHaveMods',
  publisher: 'MustHaveMods',
  robots: 'index, follow',
  openGraph: {
    title: 'MustHaveMods - Premium Sims 4 Mods & Custom Content Discovery',
    description: 'Discover premium Sims 4 mods with AI-powered recommendations. The ultimate destination for custom content creators and players.',
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
    title: 'MustHaveMods - Premium Sims 4 Mods & Custom Content Discovery',
    description: 'Discover premium Sims 4 mods with AI-powered recommendations. The ultimate destination for custom content creators and players.',
    images: ['/og-image.jpg'],
  },
  metadataBase: new URL('https://musthavemods.com'),
  alternates: {
    canonical: '/',
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

        <meta name="theme-color" content="#1e1b4b" />
        <meta name="msapplication-TileColor" content="#1e1b4b" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="MustHaveMods" />
        <meta name="application-name" content="MustHaveMods" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* JSON-LD Structured Data for SEO/GEO (SEO-002) */}
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
                  description: 'Find Sims 4 CC, mods, and custom content. Search 15,000+ verified mods for Sims 4, Stardew Valley, and Minecraft.',
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
                {
                  '@type': 'WebPage',
                  '@id': 'https://musthavemods.com/#webpage',
                  url: 'https://musthavemods.com',
                  name: 'MustHaveMods - Find Sims 4 CC, Mods & Custom Content',
                  isPartOf: {
                    '@id': 'https://musthavemods.com/#website',
                  },
                  about: {
                    '@id': 'https://musthavemods.com/#organization',
                  },
                  primaryImageOfPage: {
                    '@id': 'https://musthavemods.com/#logo',
                  },
                  datePublished: '2024-01-01',
                  dateModified: new Date().toISOString().split('T')[0],
                  description: 'Search 15,000+ verified mods and custom content for Sims 4, Stardew Valley, and Minecraft. Find CC by vibe, style, or keyword.',
                  inLanguage: 'en-US',
                  potentialAction: [
                    {
                      '@type': 'ReadAction',
                      target: ['https://musthavemods.com'],
                    },
                  ],
                },
                {
                  '@type': 'FAQPage',
                  '@id': 'https://musthavemods.com/#faq',
                  mainEntity: [
                    {
                      '@type': 'Question',
                      name: 'What is MustHaveMods?',
                      acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'MustHaveMods is a search engine for game mods and custom content. It indexes over 15,000 verified mods for Sims 4, Stardew Valley, Minecraft, and other games.',
                      },
                    },
                    {
                      '@type': 'Question',
                      name: 'How do I find Sims 4 CC?',
                      acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'Use the search bar to search by keyword, vibe, or style. You can filter by content type (hair, clothes, furniture), visual style (alpha, maxis-match), and more.',
                      },
                    },
                    {
                      '@type': 'Question',
                      name: 'Are the mods verified and safe?',
                      acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'Yes, all mods indexed on MustHaveMods go through a verification process. We only index content from trusted sources and creators.',
                      },
                    },
                  ],
                },
              ],
            }),
          }}
        />
      </head>
      <body className={`${poppins.variable} ${poppins.className} antialiased`}>
        <ConditionalScripts />
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
