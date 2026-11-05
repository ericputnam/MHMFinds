import type { Metadata } from 'next';
import React from 'react';

// Auth page (E337) — keep it out of the index. With no metadata of its own it
// inherited canonical "/" and og:url "/" from the root layout and served
// `index, follow`, i.e. it self-declared as the homepage (2026-11-05).
export const metadata: Metadata = {
  title: 'Forgot Password - MustHaveMods',
  robots: { index: false, follow: true },
  alternates: { canonical: '/forgot-password/' },
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
