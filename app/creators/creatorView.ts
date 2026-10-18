'use client';

/**
 * Admin "view as creator" switch for the creator portal (2026-10-18).
 *
 * Admins may enter /creators (middleware) so they can test what a creator
 * sees — the links in creator emails included. The portal pages branch on
 * isAdmin (admins create mods directly and see every submission), so an
 * admin needs a way to see the creator experience instead. The choice is
 * per browser tab (sessionStorage); `?view=creator` or `?view=admin` sets
 * it from a link.
 *
 * Default: creator view for an admin who is not also a creator (they are
 * only here to test), admin view for admin+creator accounts (unchanged).
 */

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

export const CREATOR_VIEW_KEY = 'mhm-creator-portal-view';
const CHANGE_EVENT = 'mhm-creator-portal-view-change';

export type PortalView = 'creator' | 'admin';

/** Pure: which view an admin sees, from the stored choice and their flags. */
export function resolvePortalView(
  stored: string | null,
  isAdmin: boolean,
  isCreator: boolean,
): PortalView {
  if (!isAdmin) return 'creator';
  if (stored === 'creator' || stored === 'admin') return stored;
  return isCreator ? 'admin' : 'creator';
}

function readStored(): string | null {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('view');
    if (fromUrl === 'creator' || fromUrl === 'admin') {
      window.sessionStorage.setItem(CREATOR_VIEW_KEY, fromUrl);
      return fromUrl;
    }
    return window.sessionStorage.getItem(CREATOR_VIEW_KEY);
  } catch {
    return null;
  }
}

/**
 * `actAsAdmin` is what portal pages branch on (never the raw session flag).
 * `isAdmin` is the real flag, used only to show the switch.
 */
export function useCreatorPortalView() {
  const { data: session } = useSession();
  const isAdmin = Boolean(session?.user?.isAdmin);
  const isCreator = Boolean(session?.user?.isCreator);
  const [stored, setStored] = useState<string | null>(null);

  useEffect(() => {
    setStored(readStored());
    const onChange = () => setStored(readStored());
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CHANGE_EVENT, onChange);
  }, []);

  const view = resolvePortalView(stored, isAdmin, isCreator);

  const setView = useCallback((next: PortalView) => {
    try {
      window.sessionStorage.setItem(CREATOR_VIEW_KEY, next);
    } catch {
      // Storage blocked: the switch just will not persist across pages.
    }
    setStored(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { isAdmin, view, actAsAdmin: isAdmin && view === 'admin', setView };
}
