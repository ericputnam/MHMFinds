import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

import { mockPrismaClient, resetPrismaMocks } from '../../setup/mocks/prisma';

import { GET as getAffiliates } from '@/app/api/affiliates/route';
import { POST as trackClick } from '@/app/api/affiliates/click/route';

describe('API /api/affiliates*', () => {
  beforeEach(() => {
    resetPrismaMocks();
    vi.clearAllMocks();
  });

  it('returns active offers for GET /api/affiliates', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1);

    mockPrismaClient.affiliateOffer.findMany.mockResolvedValue([
      {
        id: 'o1',
        name: 'Offer One',
        description: 'desc',
        imageUrl: 'https://example.com/o1.jpg',
        affiliateUrl: 'https://example.com/a1',
        partner: 'Partner',
        partnerLogo: null,
        category: 'furniture',
        priority: 80,
        promoText: 'SALE',
        promoColor: '#ec4899',
      },
      {
        id: 'o2',
        name: 'Offer Two',
        description: 'desc',
        imageUrl: 'https://example.com/o2.jpg',
        affiliateUrl: 'https://example.com/a2',
        partner: 'Partner',
        partnerLogo: null,
        category: 'decor',
        priority: 50,
        promoText: null,
        promoColor: null,
      },
    ] as any);
    mockPrismaClient.affiliateOffer.updateMany.mockResolvedValue({ count: 2 } as any);

    const request = new NextRequest('http://localhost:3000/api/affiliates?limit=2');
    const response = await getAffiliates(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.offers).toHaveLength(2);
    expect(json.offers[0].priority).toBeUndefined();
    expect(mockPrismaClient.affiliateOffer.updateMany).toHaveBeenCalled();
  });

  it('validates required fields for click tracking', async () => {
    const request = new NextRequest('http://localhost:3000/api/affiliates/click', {
      method: 'POST',
      body: JSON.stringify({ offerId: 'o1' }),
    });

    const response = await trackClick(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toContain('Missing required fields');
  });

  it('tracks click and returns redirect url', async () => {
    mockPrismaClient.$transaction.mockResolvedValue([
      { id: 'c1' },
      { id: 'o1', affiliateUrl: 'https://example.com/redirect' },
    ] as any);

    const request = new NextRequest('http://localhost:3000/api/affiliates/click', {
      method: 'POST',
      headers: {
        'x-forwarded-for': '10.10.10.10',
        'user-agent': 'vitest',
      },
      body: JSON.stringify({
        offerId: 'o1',
        sourceType: 'mod_page',
        modId: 'm1',
        pageUrl: '/mods/m1',
      }),
    });

    const response = await trackClick(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.redirectUrl).toBe('https://example.com/redirect');
  });
});
