import type { Metadata } from 'next';
import React from 'react';
import { shareCard } from '../../lib/seo/shareCard';

// The page is a client component and can't export metadata, so the
// canonical lives here — without it the page inherits canonical "/"
// from the root layout and self-declares as the homepage.
const TITLE = 'Top Sims 4 CC Creators - MustHaveMods';
const DESCRIPTION =
  'The most popular Sims 4 mod and custom content creators on MustHaveMods, ranked by downloads and favorites.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/top-creators/' },
  // E337: without its own openGraph this route inherited the root one, so a
  // shared link unfurled as the homepage (og:url=https://musthavemods.com/).
  ...shareCard({ title: TITLE, description: DESCRIPTION, url: 'https://musthavemods.com/top-creators/' }),
};

export default function TopCreatorsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
