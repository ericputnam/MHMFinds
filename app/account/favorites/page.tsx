/**
 * /account/favorites/ — the signed-in user's saved mods (Rowan, E140, Tier 1).
 *
 * Server component: the session is read on the server and the list is
 * queried by the session's own user id, so the first paint already carries
 * the grid. Signed-out visitors are sent to sign-in with a same-origin
 * callbackUrl that brings them straight back here.
 *
 * Inherits `robots: noindex, nofollow` from app/account/layout.tsx — this is
 * a private page. `account` is already in middleware NEXTJS_PREFIXES.
 */

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { FAVORITES_PATH, getUserFavoriteMods } from '../../../lib/favorites';
import FavoritesClient from './FavoritesClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Your Favorite Mods | MustHaveMods',
};

export default async function FavoritesPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    redirect(`/sign-in/?callbackUrl=${encodeURIComponent(FAVORITES_PATH)}`);
  }

  const { mods, total } = await getUserFavoriteMods(userId);
  return <FavoritesClient initialMods={mods} total={total} />;
}
