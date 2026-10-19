/**
 * Admin "view as creator" switch for /creators (2026-10-18): admins can
 * open the creator portal to test it, and see the creator experience by
 * default unless they are also creators.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { resolvePortalView } from '../../app/creators/creatorView';

const ROOT = path.resolve(__dirname, '../..');
const read = (p: string) => readFileSync(path.join(ROOT, p), 'utf8');

describe('resolvePortalView', () => {
  it('non-admins always get the creator view, whatever is stored', () => {
    expect(resolvePortalView('admin', false, true)).toBe('creator');
    expect(resolvePortalView(null, false, true)).toBe('creator');
  });

  it('an admin who is not a creator defaults to the creator view', () => {
    expect(resolvePortalView(null, true, false)).toBe('creator');
  });

  it('an admin+creator defaults to admin mode (unchanged behaviour)', () => {
    expect(resolvePortalView(null, true, true)).toBe('admin');
  });

  it('an explicit choice wins for admins; junk values are ignored', () => {
    expect(resolvePortalView('admin', true, false)).toBe('admin');
    expect(resolvePortalView('creator', true, true)).toBe('creator');
    expect(resolvePortalView('bogus', true, false)).toBe('creator');
  });
});

describe('portal pages branch on the view, not the raw session flag', () => {
  for (const file of ['app/creators/submit/page.tsx', 'app/creators/submissions/page.tsx']) {
    it(file, () => {
      const src = read(file);
      expect(src).toMatch(/actAsAdmin: isAdmin \} = useCreatorPortalView\(\)/);
      expect(src).not.toMatch(/session\?\.user\?\.isAdmin/);
    });
  }
});
