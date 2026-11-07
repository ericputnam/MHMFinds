/**
 * The name a player's browser saves the file as. Derived from the creator's
 * original filename but reduced to a conservative ASCII set, so it can never
 * carry a path, a control/bidi character (e.g. "mod‮gnp.exe"), a
 * reserved Windows name, or an extension other than the verified one.
 */
import type { ModFileKind } from './constants';

const MAX_STEM = 110;
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i;

export function sanitizeDownloadName(original: string, kind: ModFileKind, uploadId: string): string {
  const fallback = `mod-${uploadId.slice(0, 12)}.${kind}`;
  if (typeof original !== 'string') return fallback;

  let base = original.split(/[\\/]/).pop() ?? '';
  base = base.normalize('NFKC');

  // Drop the extension (we re-add the verified one).
  const dot = base.lastIndexOf('.');
  let stem = dot > 0 ? base.slice(0, dot) : base;

  stem = stem
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9._\-()[\]]/g, '')
    .replace(/\.{2,}/g, '.')
    .replace(/^[.\-_]+/, '')
    .replace(/[._\s]+$/, '');

  // Never let an inner dot fake a second extension (e.g. "photo.jpg.exe").
  stem = stem.replace(/\./g, '_');

  if (stem.length > MAX_STEM) stem = stem.slice(0, MAX_STEM);
  if (!stem || WINDOWS_RESERVED.test(stem)) return fallback;
  return `${stem}.${kind}`;
}
