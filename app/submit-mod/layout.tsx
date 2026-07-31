import type { Metadata } from 'next';
import React from 'react';

// The page is a client component and can't export metadata, so the
// canonical lives here — without it the page inherits canonical "/"
// from the root layout and self-declares as the homepage.
export const metadata: Metadata = {
  title: 'Submit a Mod - MustHaveMods',
  description:
    'Submit your Sims 4 mod or custom content to MustHaveMods and reach thousands of players.',
  alternates: { canonical: '/submit-mod/' },
};

export default function SubmitModLayout({ children }: { children: React.ReactNode }) {
  return children;
}
