import { describe, it, expect, vi, beforeEach } from 'vitest';

// In-memory Prisma stand-in: enough surface for importAmazonEarningsCsv.
const earningsStore = new Map<string, any>();
const clickStore = new Map<string, { id: string; offerId: string }>();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    affiliateEarning: {
      findUnique: vi.fn(async ({ where }: any) => {
        const key = `${where.network_networkTransactionId.network}:${where.network_networkTransactionId.networkTransactionId}`;
        return earningsStore.get(key) ?? null;
      }),
      create: vi.fn(async ({ data }: any) => {
        const key = `${data.network}:${data.networkTransactionId}`;
        const row = { id: `earning_${earningsStore.size + 1}`, ...data };
        earningsStore.set(key, row);
        return row;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        for (const [key, row] of Array.from(earningsStore.entries())) {
          if (row.id === where.id) {
            const updated = { ...row, ...data };
            earningsStore.set(key, updated);
            return updated;
          }
        }
        throw new Error('not found');
      }),
      aggregate: vi.fn(async () => ({
        _count: { id: 1 },
        _sum: { commissionAmount: 1.23 },
      })),
    },
    affiliateClick: {
      findUnique: vi.fn(async ({ where }: any) => clickStore.get(where.id) ?? null),
    },
    affiliateOffer: {
      update: vi.fn(async () => ({})),
    },
    affiliateSyncRun: {
      create: vi.fn(async ({ data }: any) => ({ id: 'run_1', ...data })),
    },
  },
}));

import { importAmazonEarningsCsv } from '@/lib/services/affiliateEarnings/amazonCsvImport';

const SAMPLE_CSV = [
  'Fee earnings report from 06/01/2026 to 06/30/2026',
  'Date Shipped,Product Name,ASIN,Seller,Tracking ID,Sub Tag,Product Link Type,Price,Items Shipped,Returns,Revenue,Ad Fees',
  '06/03/2026,"Gaming Desk, 55 inch",B0AAA111,Amazon.com,musthavemod04-20,click_abc123,Text,129.99,1,0,129.99,5.20',
  '06/10/2026,Cute Mouse Pad,B0BBB222,Amazon.com,musthavemod04-20,,Text,14.99,2,0,29.98,1.20',
  '06/12/2026,Returned Lamp,B0CCC333,Amazon.com,musthavemod04-20,,Text,39.99,1,1,39.99,-1.60',
].join('\n');

describe('importAmazonEarningsCsv', () => {
  beforeEach(() => {
    earningsStore.clear();
    clickStore.clear();
  });

  it('parses rows past the title line, maps fees and statuses, and totals commission', async () => {
    clickStore.set('click_abc123', { id: 'click_abc123', offerId: 'offer_1' });

    const result = await importAmazonEarningsCsv(SAMPLE_CSV);

    expect(result.rowsParsed).toBe(3);
    expect(result.earningsCreated).toBe(3);
    expect(result.earningsUpdated).toBe(0);
    // 5.20 + 1.20; the returned/negative row is 'reversed' and excluded
    expect(result.totalCommission).toBeCloseTo(6.4, 2);

    const rows = Array.from(earningsStore.values());
    const attributed = rows.find((r) => r.subId === 'click_abc123');
    expect(attributed?.clickId).toBe('click_abc123');
    expect(attributed?.offerId).toBe('offer_1');
    expect(attributed?.status).toBe('approved');
    expect(attributed?.saleAmount).toBeCloseTo(129.99, 2);

    const reversed = rows.find((r) => r.campaignId === 'B0CCC333');
    expect(reversed?.status).toBe('reversed');
  });

  it('is idempotent: re-importing the same CSV updates instead of duplicating', async () => {
    await importAmazonEarningsCsv(SAMPLE_CSV);
    const second = await importAmazonEarningsCsv(SAMPLE_CSV);

    expect(second.earningsCreated).toBe(0);
    expect(second.earningsUpdated).toBe(3);
    expect(earningsStore.size).toBe(3);
  });

  it('handles quoted commas in product names', async () => {
    await importAmazonEarningsCsv(SAMPLE_CSV);
    const desk = Array.from(earningsStore.values()).find((r) => r.campaignId === 'B0AAA111');
    expect(desk).toBeDefined();
    expect(desk.saleAmount).toBeCloseTo(129.99, 2);
  });

  it('rejects CSVs without a recognizable header', async () => {
    await expect(importAmazonEarningsCsv('foo,bar\n1,2')).rejects.toThrow(/header row/i);
  });
});
