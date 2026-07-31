import type { Metadata } from 'next';
import React from 'react';

// Private account pages — never index (they otherwise inherit
// canonical "/" from the root layout and compete with the homepage).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return children;
}
