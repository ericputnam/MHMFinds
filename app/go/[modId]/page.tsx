import type { Metadata } from 'next';
import GoClient from './GoClient';

export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function GoPage() {
  return <GoClient />;
}
