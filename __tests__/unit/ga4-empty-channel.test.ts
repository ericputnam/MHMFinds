/**
 * GA4Connector.matchesChannel used `keyword.includes(channel)`, which is true for every
 * keyword when the channel is ''. A row with no channel group was therefore credited to
 * the first source tested (google). Red pre-fix.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({ prisma: {}, default: {} }));

import { ga4Connector } from '@/lib/services/ga4Connector';

const matches = (channel: string, source: string): boolean => (ga4Connector as any).matchesChannel(channel, source);

describe('GA4 channel matching', () => {
  it('an empty channel matches no traffic source', () => {
    for (const source of ['google', 'pinterest', 'direct', 'social']) {
      expect(matches('', source), source).toBe(false);
    }
  });

  it('a real channel still matches', () => {
    expect(['google', 'pinterest', 'direct', 'social'].some((s) => matches('organic search', s))).toBe(true);
  });
});
