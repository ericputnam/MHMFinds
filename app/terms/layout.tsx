import type { Metadata } from 'next';
import React from 'react';

// The page is a client component and can't export metadata, so the
// canonical lives here — without it the page inherits canonical "/"
// from the root layout and self-declares as the homepage.
export const metadata: Metadata = {
  title: 'Terms of Service - MustHaveMods',
  description: 'Terms of Service for using the MustHaveMods mod discovery platform.',
  alternates: { canonical: '/terms/' },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
