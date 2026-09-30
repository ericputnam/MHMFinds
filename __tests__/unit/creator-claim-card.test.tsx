/**
 * CreatorClaimCard — the visible claim ask + fan-forward share on
 * /creator/[slug]/ (Nova, E144, 2026-09-30).
 *
 * Red against pre-E144 origin/main: the component file does not exist
 * (every case), CreatorPageClient renders a footnote <p> with the link
 * instead of <CreatorClaimCard> (wiring case), and the hub still tells
 * creators to "Submit your mods to claim your page" through the bare form
 * that cannot claim anything (hub case).
 *
 * Offline: render tests use jsdom with navigator.clipboard and window.gtag
 * stubbed; wiring cases read source from disk with comments stripped.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { readFileSync } from 'fs';
import path from 'path';

import {
  CLAIM_SHARE_EVENT,
  CLAIM_SHARE_REF,
  CreatorClaimCard,
  claimShareUrl,
  shareUrlSlug,
} from '../../components/creator/CreatorClaimCard';
import { CLAIM_PARAM, claimHref, parseClaimSlug } from '../../lib/creatorClaim';

const ROOT = path.resolve(__dirname, '../..');
const read = (p: string) => readFileSync(path.join(ROOT, p), 'utf8');
const stripComments = (src: string) =>
  src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

describe('claimShareUrl', () => {
  it('is the absolute claim URL with ref=share, and the form still reads the slug from it', () => {
    const url = claimShareUrl('brandysims');
    expect(url).toBe(`https://musthavemods.com/submit-mod/?creator=brandysims&ref=${CLAIM_SHARE_REF}`);
    expect(url.startsWith(`https://musthavemods.com${claimHref('brandysims')}`)).toBe(true);
    // What /submit-mod/ does with it: read CLAIM_PARAM, validate with parseClaimSlug.
    const slug = shareUrlSlug(url);
    expect(slug).toBe('brandysims');
    expect(parseClaimSlug(slug)).toBe('brandysims');
    expect(new URL(url).searchParams.get(CLAIM_PARAM)).toBe('brandysims');
  });

  it('keeps the trailing slash before the query (trailingSlash: true 308s bare paths)', () => {
    expect(claimShareUrl('x')).toContain('/submit-mod/?');
  });
});

describe('<CreatorClaimCard />', () => {
  let writeText: ReturnType<typeof vi.fn>;
  let gtag: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    gtag = vi.fn();
    (window as unknown as { gtag?: unknown }).gtag = gtag;
  });

  afterEach(() => {
    delete (window as unknown as { gtag?: unknown }).gtag;
  });

  it('renders the creator ask with the E122 claim href and a fan-forward button', () => {
    render(<CreatorClaimCard slug="brandysims" displayName="brandysims" />);
    const link = screen.getByTestId('creator-claim-link');
    expect(link).toHaveAttribute('href', claimHref('brandysims'));
    expect(link.textContent).toMatch(/Claim this page/);
    expect(screen.getByTestId('creator-claim-card').textContent).toMatch(/Are you brandysims\?/);
    expect(screen.getByTestId('creator-claim-share').textContent).toMatch(/Send them this page/);
  });

  it('copies the share URL to the clipboard, says so, and fires creator_claim_share', async () => {
    render(<CreatorClaimCard slug="brandysims" displayName="brandysims" />);
    fireEvent.click(screen.getByTestId('creator-claim-share'));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(claimShareUrl('brandysims')));
    await waitFor(() => expect(screen.getByTestId('creator-claim-share').textContent).toBe('Link copied'));
    expect(gtag).toHaveBeenCalledWith('event', CLAIM_SHARE_EVENT, { creator: 'brandysims', method: 'clipboard' });
  });

  it('falls back to showing the URL when neither clipboard nor share is available', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    render(<CreatorClaimCard slug="brandysims" displayName="brandysims" />);
    fireEvent.click(screen.getByTestId('creator-claim-share'));
    await waitFor(() =>
      expect(screen.getByTestId('creator-claim-share-url').textContent).toBe(claimShareUrl('brandysims')),
    );
    expect(gtag).toHaveBeenCalledWith('event', CLAIM_SHARE_EVENT, { creator: 'brandysims', method: 'shown' });
  });

  it('renders nothing once a verified profile owns the page', () => {
    const { container } = render(<CreatorClaimCard slug="brandysims" displayName="brandysims" claimed />);
    expect(container.innerHTML).toBe('');
  });

  it('never fires gtag on render (only on the share click)', () => {
    render(<CreatorClaimCard slug="brandysims" displayName="brandysims" />);
    expect(gtag).not.toHaveBeenCalled();
  });
});

describe('wiring: /creator/[slug]/ renders the card in the hero, outside every ad anchor', () => {
  const src = stripComments(read('app/creator/[slug]/CreatorPageClient.tsx'));

  it('imports and renders <CreatorClaimCard> with slug, displayName and the verified flag', () => {
    expect(src).toMatch(/import \{ CreatorClaimCard \} from '\.\.\/\.\.\/\.\.\/components\/creator\/CreatorClaimCard'/);
    expect(src).toMatch(/<CreatorClaimCard[\s\S]*?slug=\{data\.slug\}[\s\S]*?displayName=\{data\.displayName\}[\s\S]*?claimed=\{Boolean\(data\.profile\?\.isVerified\)\}/);
  });

  it('sits inside <header> (above the grid), not in the sidebar column', () => {
    const header = src.indexOf('<header');
    const headerEnd = src.indexOf('</header>');
    const card = src.indexOf('<CreatorClaimCard');
    const grid = src.indexOf('<ModGrid');
    const aside = src.indexOf('<aside');
    expect(header).toBeGreaterThan(-1);
    expect(card).toBeGreaterThan(header);
    expect(card).toBeLessThan(headerEnd);
    expect(card).toBeLessThan(grid);
    expect(card).toBeLessThan(aside);
  });

  it('the old footnote link is gone (one claim CTA per page, the visible one)', () => {
    expect(src).not.toMatch(/Claim this page and submit new mods/);
    expect(src).not.toMatch(/data-testid="creator-claim-link"/);
  });

  it('the card itself never names a Mediavine element or ad anchor', () => {
    const card = stripComments(read('components/creator/CreatorClaimCard.tsx'));
    expect(card).not.toMatch(/mv-ads|id="secondary"|newPageView/);
  });
});

describe('wiring: the /creator/ hub no longer routes claims through the bare form', () => {
  const src = stripComments(read('app/creator/page.tsx'));

  it('tells creators to claim from their own page and keeps /submit-mod/ for unlisted creators', () => {
    expect(src).toMatch(/Claim this page/);
    expect(src).not.toMatch(/Submit your mods<\/a> to claim/);
    expect(src).toContain('href="/submit-mod/"');
    expect(src).toContain('href="/top-creators/"');
  });
});
