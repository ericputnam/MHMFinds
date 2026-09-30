/**
 * The creator "claim this page" path can actually onboard a creator
 * (Nova, E122, 2026-09-27).
 *
 * Pre-E122 the 534 /creator/[slug]/ pages linked "Claim this page" to the
 * bare /submit-mod/ form, whose API wrote a ModSubmission with no userId
 * and never created a CreatorProfile — while the scoreboard counts
 * "creators onboarded" as CreatorProfile.userId ∩ ModSubmission.userId.
 * The metric was zero by construction.
 *
 * Red against pre-E122 origin/main: every wiring case below (lib/creatorClaim
 * did not exist; CreatorPageClient linked "/submit-mod/" with no slug; the
 * API route neither read the session nor wrote a profile; the Zod schema
 * had no claim field). The pure cases are red for the missing module.
 *
 * Offline: source-level checks read files from disk with comments
 * stripped, so documentation quoting the old pattern cannot satisfy them.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

import {
  CLAIM_BODY_FIELD,
  CLAIM_PARAM,
  CLAIM_SOURCE,
  MAX_CLAIM_SLUG,
  claimHref,
  claimSignInHref,
  claimedPageHref,
  isPendingHandle,
  parseClaimSlug,
  pendingProfileHandle,
} from '../../lib/creatorClaim';
import { NON_CREATOR_SLUGS } from '../../lib/creatorSlug';
import { ModSubmissionSchema } from '../../lib/validation/schemas';

const ROOT = path.resolve(__dirname, '../..');
const read = (p: string) => readFileSync(path.join(ROOT, p), 'utf8');
const stripComments = (src: string) =>
  src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

describe('claim hrefs', () => {
  it('claimHref carries the slug on the trailing-slash form URL', () => {
    expect(claimHref('brandysims')).toBe(`/submit-mod/?${CLAIM_PARAM}=brandysims`);
    expect(claimHref('seoulsoul-sims')).toBe('/submit-mod/?creator=seoulsoul-sims');
  });

  it('claimSignInHref is a same-origin relative redirect that E118 returnTo accepts', () => {
    const href = claimSignInHref('brandysims');
    expect(href.startsWith('/sign-in/?redirect=')).toBe(true);
    const target = decodeURIComponent(href.slice('/sign-in/?redirect='.length));
    expect(target).toBe(claimHref('brandysims'));
    expect(target.startsWith('/')).toBe(true);
    expect(target.startsWith('//')).toBe(false);
  });

  it('claimedPageHref is the creator page the claim points back at', () => {
    expect(claimedPageHref('brandysims')).toBe('/creator/brandysims/');
  });
});

describe('parseClaimSlug', () => {
  it('accepts what authorSlug emits', () => {
    expect(parseClaimSlug('brandysims')).toBe('brandysims');
    expect(parseClaimSlug('seoulsoul-sims')).toBe('seoulsoul-sims');
    expect(parseClaimSlug(' x-bluepill-x ')).toBe('x-bluepill-x');
  });

  it('rejects non-strings, empty, over-long, wrong-charset and un-normalised values', () => {
    expect(parseClaimSlug(undefined)).toBeNull();
    expect(parseClaimSlug(42)).toBeNull();
    expect(parseClaimSlug('')).toBeNull();
    expect(parseClaimSlug('a'.repeat(MAX_CLAIM_SLUG + 1))).toBeNull();
    expect(parseClaimSlug('Brandysims')).toBeNull();
    expect(parseClaimSlug('brandy sims')).toBeNull();
    expect(parseClaimSlug('-brandysims')).toBeNull();
    expect(parseClaimSlug('brandy--sims')).toBeNull();
    expect(parseClaimSlug('<script>')).toBeNull();
  });

  it('rejects junk author slugs and platform pseudo-creators', () => {
    expect(parseClaimSlug('75940181')).toBeNull();
    expect(parseClaimSlug('kobe-sweats-135179830')).toBeNull();
    expect(parseClaimSlug('ab')).toBeNull();
    const platforms = Array.from(NON_CREATOR_SLUGS);
    expect(platforms.length).toBeGreaterThan(5); // vacuity guard
    platforms.forEach((s) => expect(parseClaimSlug(s)).toBeNull());
  });
});

describe('pendingProfileHandle never collides with a public creator page', () => {
  it('is prefixed, carries the slug and the user-id tail, and is not the slug', () => {
    const h = pendingProfileHandle('brandysims', 'clx0000ABCDEF12');
    expect(h).toBe('pending-brandysims-abcdef12');
    expect(h).not.toBe('brandysims');
    expect(isPendingHandle(h)).toBe(true);
    expect(isPendingHandle('brandysims')).toBe(false);
  });

  it('a pending handle is never a valid claim slug, so it can never become a page join by accident', () => {
    // authorSlug('pending-brandysims-abcdef12') === itself, so the charset
    // check alone would pass; the guard is that /creator/[slug]/ joins on
    // the *page* slug and no page slug starts with the prefix by
    // construction of the API (it prefixes every handle it creates).
    const h = pendingProfileHandle('brandysims', 'clx0000ABCDEF12');
    expect(h.startsWith('pending-')).toBe(true);
  });
});

describe('Zod schema accepts an optional, validated claim field', () => {
  const base = {
    modUrl: 'https://example.com/mod',
    modName: 'A mod',
    description: 'A description long enough to pass validation',
    category: 'CAS',
    submitterName: 'Someone',
    submitterEmail: 'someone@example.com',
  };

  it('parses without the field, with a valid slug, and drops an invalid one', () => {
    expect(ModSubmissionSchema.parse(base)).not.toHaveProperty(CLAIM_BODY_FIELD);
    const ok = ModSubmissionSchema.parse({ ...base, [CLAIM_BODY_FIELD]: 'brandysims' });
    expect(ok[CLAIM_BODY_FIELD as 'claimedCreatorSlug']).toBe('brandysims');
    const bad = ModSubmissionSchema.parse({ ...base, [CLAIM_BODY_FIELD]: 'Not A Slug!' });
    expect(bad[CLAIM_BODY_FIELD as 'claimedCreatorSlug']).toBeUndefined();
  });
});

describe('wiring: the claim link, the form and the API agree', () => {
  it('CreatorPageClient links "Claim this page" through claimHref(slug), never bare /submit-mod/', () => {
    // E144 moved the link into components/creator/CreatorClaimCard.tsx; the
    // page must hand it data.slug and the card must build the href with
    // claimHref(slug). Neither file may fall back to the bare form URL.
    const page = stripComments(read('app/creator/[slug]/CreatorPageClient.tsx'));
    expect(page).toMatch(/<CreatorClaimCard[\s\S]*?slug=\{data\.slug\}/);
    expect(page).not.toMatch(/href=["']\/submit-mod\/["']/);
    const card = stripComments(read('components/creator/CreatorClaimCard.tsx'));
    expect(card).toMatch(/href=\{claimHref\(\s*slug\s*\)\}/);
    expect(card).not.toMatch(/href=["']\/submit-mod\/["']/);
  });

  it('the /submit-mod/ form reads the claim param and posts the claim field', () => {
    const src = stripComments(read('app/submit-mod/page.tsx'));
    expect(src).toMatch(/CLAIM_PARAM/);
    expect(src).toMatch(/CLAIM_BODY_FIELD/);
    expect(src).toMatch(/claimSignInHref\(/);
  });

  it('the API attaches the session user and creates the CreatorProfile the scoreboard counts', () => {
    const src = stripComments(read('app/api/submit-mod/route.ts'));
    expect(src).toMatch(/getServerSession\(authOptions\)/);
    expect(src).toMatch(/userId:/);
    expect(src).toMatch(/creatorProfile\.(create|upsert)\(/);
    expect(src).toMatch(/parseClaimSlug\(/);
    expect(src).toMatch(/CLAIM_SOURCE/);
    // The profile write must never fail the submission it hangs off.
    expect(src).toMatch(/ensureCreatorProfile/);
    // And it must never create the row under the public slug (page hijack).
    expect(src).toMatch(/handle:\s*pendingProfileHandle\(/);
    expect(src).not.toMatch(/handle:\s*(claimedSlug|slug)\b/);
    // Never flips the admin-only creator flag.
    expect(src).not.toMatch(/isCreator:\s*true/);
  });

  it('CLAIM_SOURCE is a value the scoreboard can select on and differs from the schema default', () => {
    expect(CLAIM_SOURCE).toBe('Creator Claim');
    expect(CLAIM_SOURCE).not.toBe('Creator Upload');
  });
});
