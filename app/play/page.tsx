import type { Metadata } from 'next';
import PlayClient from './PlayClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'MAIN CHARACTER — The Daily Sims 4 CC Styling Game | MustHaveMods',
  description:
    'A new scene every day. Style the cast with real Sims 4 custom content, get your Director\'s Score, and share your look. Free to play, no account needed.',
  alternates: { canonical: 'https://musthavemods.com/play' },
  openGraph: {
    title: 'MAIN CHARACTER — The Daily Sims 4 CC Styling Game',
    description:
      'Style today\'s scene with real Sims 4 custom content and share your Director\'s Score. A new episode drops every day at midnight ET.',
    url: 'https://musthavemods.com/play',
    siteName: 'MustHaveMods',
    type: 'website',
  },
};

export default function PlayPage() {
  return <PlayClient />;
}
