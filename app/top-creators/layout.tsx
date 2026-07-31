import type { Metadata } from 'next';
import React from 'react';

// The page is a client component and can't export metadata, so the
// canonical lives here — without it the page inherits canonical "/"
// from the root layout and self-declares as the homepage.
export const metadata: Metadata = {
  title: 'Top Sims 4 CC Creators - MustHaveMods',
  description:
    'The most popular Sims 4 mod and custom content creators on MustHaveMods, ranked by downloads and favorites.',
  alternates: { canonical: '/top-creators/' },
};

export default function TopCreatorsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
