/**
 * CreatorBadgeEmbed render tests (Nova, E269, 2026-10-25). jsdom with
 * navigator.clipboard and window.gtag stubbed, same pattern as
 * creator-claim-card.test.tsx. Red pre-E269: the component does not exist.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { CreatorBadgeEmbed } from '../../components/creator/CreatorBadgeEmbed';
import { BADGE_COPY_EVENT, BADGE_IMAGE_PATH, badgeEmbedHtml, badgeLinkUrl } from '../../lib/creatorBadge';

describe('CreatorBadgeEmbed', () => {
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

  it('renders all three snippets for the creator, dark by default', () => {
    render(<CreatorBadgeEmbed slug="ravasheen" displayName="Ravasheen" />);
    expect(screen.getByTestId('creator-badge-snippet-html').textContent).toBe(
      badgeEmbedHtml('ravasheen', 'Ravasheen', 'dark'),
    );
    expect(screen.getByTestId('creator-badge-snippet-link').textContent).toBe(badgeLinkUrl('ravasheen'));
    expect(screen.getByTestId('creator-badge-snippet-markdown').textContent).toContain(BADGE_IMAGE_PATH.dark);
    const img = screen.getByTestId('creator-badge-preview') as HTMLImageElement;
    expect(img.getAttribute('alt')).toBe('Featured on MustHaveMods');
  });

  it('switching to light swaps the image in the preview and the snippets', () => {
    render(<CreatorBadgeEmbed slug="ravasheen" displayName="Ravasheen" />);
    fireEvent.click(screen.getByTestId('creator-badge-variant-light'));
    expect(screen.getByTestId('creator-badge-snippet-html').textContent).toContain(BADGE_IMAGE_PATH.light);
    expect(screen.getByTestId('creator-badge-snippet-html').textContent).not.toContain(BADGE_IMAGE_PATH.dark);
    expect((screen.getByTestId('creator-badge-preview') as HTMLImageElement).getAttribute('src')).toContain(
      BADGE_IMAGE_PATH.light,
    );
  });

  it('copy writes the snippet to the clipboard and fires one GA4 event with kind + variant', async () => {
    render(<CreatorBadgeEmbed slug="ravasheen" displayName="Ravasheen" />);
    fireEvent.click(screen.getByTestId('creator-badge-copy-markdown'));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText).toHaveBeenCalledWith(screen.getByTestId('creator-badge-snippet-markdown').textContent);
    await waitFor(() => expect(screen.getByTestId('creator-badge-copy-markdown').textContent).toBe('Copied'));
    expect(gtag).toHaveBeenCalledTimes(1);
    expect(gtag).toHaveBeenCalledWith('event', BADGE_COPY_EVENT, {
      creator: 'ravasheen',
      kind: 'markdown',
      variant: 'dark',
    });
  });
});
