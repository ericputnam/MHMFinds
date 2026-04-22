import { describe, it, expect, beforeEach } from 'vitest';
import { mockPrismaClient, resetPrismaMocks } from '../setup/mocks/prisma';
import { generateMetadata } from '@/app/mods/[id]/page';

describe('generateMetadata for /mods/[id]', () => {
  beforeEach(() => resetPrismaMocks());

  it('returns canonical + OG + Twitter metadata for an existing mod', async () => {
    mockPrismaClient.mod.findUnique.mockResolvedValue({
      id: 'mod-abc',
      title: 'Test Mod Title',
      description: 'A cool mod that does cool things. '.repeat(10),
      shortDescription: 'A cool mod',
      thumbnail: 'https://example.com/thumb.jpg',
    });

    const meta = await generateMetadata({ params: { id: 'mod-abc' } });

    expect(meta.title).toBe('Test Mod Title');
    expect(meta.description).toBeTruthy();
    expect(meta.alternates?.canonical).toBe('https://musthavemods.com/mods/mod-abc');
    expect(meta.openGraph?.title).toBe('Test Mod Title');
    expect(meta.openGraph?.url).toBe('https://musthavemods.com/mods/mod-abc');
    expect((meta.openGraph as any)?.images?.[0]).toMatchObject({ url: 'https://example.com/thumb.jpg' });
    expect(meta.twitter).toBeTruthy();
    expect((meta.twitter as any).card).toBe('summary_large_image');
  });

  it('returns minimal (not-found) metadata when mod does not exist', async () => {
    mockPrismaClient.mod.findUnique.mockResolvedValue(null);
    const meta = await generateMetadata({ params: { id: 'does-not-exist' } });
    expect(meta.title).toMatch(/not found/i);
    expect(meta.alternates?.canonical).toBeFalsy();
  });
});
