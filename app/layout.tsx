import React from 'react';
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';
import Script from 'next/script';

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
  // Use test script in development, production script on Vercel
  const mediavineScript = process.env.NODE_ENV === 'production'
    ? '//scripts.mediavine.com/tags/must-have-mods-new-owner.js'
    : '//scripts.mediavine.com/tags/mediavine-scripty-boi.js';

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

        <Script
          id="mediavine-script"
          strategy="beforeInteractive"
          src={mediavineScript}
          data-noptimize="1"
          data-cfasync="false"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
        <meta name="theme-color" content="#1e1b4b" />
        <meta name="msapplication-TileColor" content="#1e1b4b" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="MustHaveMods" />
        <meta name="application-name" content="MustHaveMods" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="__className_e8ce0c antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
