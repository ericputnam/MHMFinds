import type { Metadata } from 'next';
import React from 'react';

// The page is a client component and can't export metadata, so the
// canonical lives here — without it the page inherits canonical "/"
// from the root layout and self-declares as the homepage.
export const metadata: Metadata = {
  title: 'About - MustHaveMods',
  description:
    'What MustHaveMods is, how our Sims 4 mods and custom content are curated and verified, and how to get in touch.',
  alternates: { canonical: '/about/' },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
