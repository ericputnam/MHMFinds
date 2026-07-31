import type { Metadata } from 'next';
import React from 'react';

// Auth page — keep it out of the index (it otherwise inherits
// canonical "/" from the root layout and competes with the homepage).
export const metadata: Metadata = {
  title: 'Sign In - MustHaveMods',
  robots: { index: false, follow: true },
};

export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return children;
}
