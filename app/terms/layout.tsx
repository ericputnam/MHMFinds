import type { Metadata } from 'next';
import React from 'react';
import { shareCard } from '../../lib/seo/shareCard';

// The page is a client component and can't export metadata, so the
// canonical lives here — without it the page inherits canonical "/"
// from the root layout and self-declares as the homepage.
const TITLE = 'Terms of Service - MustHaveMods';
const DESCRIPTION =
  'Terms of Service for using the MustHaveMods mod discovery platform.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/terms/' },
  // E337: without its own openGraph this route inherited the root one, so a
  // shared link unfurled as the homepage (og:url=https://musthavemods.com/).
  ...shareCard({ title: TITLE, description: DESCRIPTION, url: 'https://musthavemods.com/terms/' }),
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
