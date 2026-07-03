import { describe, it, expect } from 'vitest';
import {
  detectNetworkFromUrl,
  appendClickSubId,
  SUBID_PARAM,
} from '@/lib/services/affiliateEarnings/network';

// The commission-attribution funnel depends on two invariants:
// 1. Every tracking URL's network is correctly identified.
// 2. The click ID is injected using the parameter each network echoes back
//    in its conversion reports (Impact SubId1, Rakuten u1, CJ shopperId/sid,
//    Amazon ascsubtag). If either breaks, revenue silently becomes
//    unattributable — no error, the earnings just lose their join key.

describe('detectNetworkFromUrl', () => {
  it('detects Impact.com vanity domains used by live seeded offers', () => {
    // Real link shapes from prisma/seed-affiliates.ts and seed-oyrosy.ts
    expect(
      detectNetworkFromUrl(
        'https://logitech.cfzu.net/c/2956236/800029/11355?prodsku=988-000530_en_US&u=https%3A%2F%2Fwww.logitechg.com%2F'
      )
    ).toBe('impact');
    expect(
      detectNetworkFromUrl(
        'https://oyrosycom.sjv.io/c/2956236/2826118/32511?prodsku=abc&intsrc=APIG_22361'
      )
    ).toBe('impact');
  });

  it('detects Impact via the /c/{account}/{ad}/{campaign} path on unlisted vanity domains', () => {
    expect(detectNetworkFromUrl('https://some-brand.example.net/c/2956236/123/456?u=x')).toBe(
      'impact'
    );
  });

  it('detects Rakuten, CJ, and Amazon domains', () => {
    expect(
      detectNetworkFromUrl('https://click.linksynergy.com/deeplink?id=abc&mid=123&murl=x')
    ).toBe('rakuten');
    expect(detectNetworkFromUrl('https://www.anrdoezrs.net/click-123-456')).toBe('cj');
    expect(detectNetworkFromUrl('https://www.dpbolvw.net/click-123-456')).toBe('cj');
    expect(
      detectNetworkFromUrl('https://www.amazon.com/dp/B0ABC123?tag=musthavemod04-20')
    ).toBe('amazon');
    expect(detectNetworkFromUrl('https://amzn.to/3abc')).toBe('amazon');
  });

  it('returns null for unrecognized and malformed URLs', () => {
    expect(detectNetworkFromUrl('https://example.com/product')).toBeNull();
    expect(detectNetworkFromUrl('not a url')).toBeNull();
  });
});

describe('appendClickSubId', () => {
  const clickId = 'clxyz123abc';

  it('appends subId1 for Impact links, preserving existing params', () => {
    const url = appendClickSubId(
      'https://oyrosycom.sjv.io/c/2956236/2826118/32511?prodsku=abc&intsrc=APIG_22361',
      clickId
    );
    const parsed = new URL(url);
    expect(parsed.searchParams.get('subId1')).toBe(clickId);
    expect(parsed.searchParams.get('prodsku')).toBe('abc');
    expect(parsed.searchParams.get('intsrc')).toBe('APIG_22361');
  });

  it('appends u1 for Rakuten and sid for CJ', () => {
    expect(
      new URL(
        appendClickSubId('https://click.linksynergy.com/deeplink?id=a&mid=1&murl=x', clickId)
      ).searchParams.get('u1')
    ).toBe(clickId);
    expect(
      new URL(
        appendClickSubId('https://www.anrdoezrs.net/click-123-456?url=x', clickId)
      ).searchParams.get('sid')
    ).toBe(clickId);
  });

  it('appends ascsubtag for Amazon without clobbering the associates tag', () => {
    const url = appendClickSubId(
      'https://www.amazon.com/dp/B0ABC123?tag=musthavemod04-20',
      clickId
    );
    const parsed = new URL(url);
    expect(parsed.searchParams.get('ascsubtag')).toBe(clickId);
    expect(parsed.searchParams.get('tag')).toBe('musthavemod04-20');
  });

  it('honors an explicit network override from AffiliateOffer.network', () => {
    const url = appendClickSubId('https://unrecognized-domain.com/x', clickId, 'impact');
    expect(new URL(url).searchParams.get('subId1')).toBe(clickId);
  });

  it('returns the URL unchanged when the network is unknown or the URL is malformed', () => {
    expect(appendClickSubId('https://example.com/product', clickId)).toBe(
      'https://example.com/product'
    );
    expect(appendClickSubId('not a url', clickId)).toBe('not a url');
  });
});
