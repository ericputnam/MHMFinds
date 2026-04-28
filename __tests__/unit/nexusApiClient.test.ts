/**
 * Unit tests for the Nexus Mods author extractor.
 *
 * Mirrors the structure of the fromPatreonApi tests in `authorExtractor.test.ts`:
 *   - URL parsing (parseNexusUrl) tested directly
 *   - API behavior (fromNexusApi) tested via mocked axios
 *
 * The API is keyed by NEXUS_API_KEY. When the key is unset, `fromNexusApi`
 * returns a no-candidate result without ever calling the network — that's
 * exercised in the "no API key" test below.
 */

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import axios from 'axios';

import {
  parseNexusUrl,
  fromNexusApi,
} from '@/lib/services/scraperExtraction/nexusApiClient';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

// We toggle NEXUS_API_KEY on each test case, so save and restore.
const ORIGINAL_KEY = process.env.NEXUS_API_KEY;

beforeEach(() => {
  process.env.NEXUS_API_KEY = 'test-key-1234';
});

afterEach(() => {
  process.env.NEXUS_API_KEY = ORIGINAL_KEY;
  vi.clearAllMocks();
});

// ============================================
// parseNexusUrl
// ============================================

describe('parseNexusUrl', () => {
  it('parses canonical Nexus URL', () => {
    expect(parseNexusUrl('https://www.nexusmods.com/stardewvalley/mods/2400'))
      .toEqual({ gameDomain: 'stardewvalley', modId: '2400' });
  });

  it('parses URL without www subdomain', () => {
    expect(parseNexusUrl('https://nexusmods.com/skyrimspecialedition/mods/123'))
      .toEqual({ gameDomain: 'skyrimspecialedition', modId: '123' });
  });

  it('parses URL with trailing slash', () => {
    expect(parseNexusUrl('https://www.nexusmods.com/stardewvalley/mods/8505/'))
      .toEqual({ gameDomain: 'stardewvalley', modId: '8505' });
  });

  it('parses URL with query string and tab fragment', () => {
    expect(
      parseNexusUrl('https://www.nexusmods.com/stardewvalley/mods/2400?tab=description'),
    ).toEqual({ gameDomain: 'stardewvalley', modId: '2400' });
  });

  it('returns null for non-Nexus hosts', () => {
    expect(parseNexusUrl('https://www.curseforge.com/sims4/mods/123')).toBeNull();
    expect(parseNexusUrl('https://nexusmods.com.evil.example/foo/mods/1')).toBeNull();
  });

  it('returns null for Nexus URLs that aren\'t mod detail pages', () => {
    expect(parseNexusUrl('https://www.nexusmods.com/stardewvalley/mods/'))
      .toBeNull();
    expect(parseNexusUrl('https://www.nexusmods.com/stardewvalley/users/123'))
      .toBeNull();
    expect(parseNexusUrl('https://www.nexusmods.com/')).toBeNull();
  });

  it('returns null for malformed URLs', () => {
    expect(parseNexusUrl('not a url')).toBeNull();
    expect(parseNexusUrl('')).toBeNull();
  });
});

// ============================================
// fromNexusApi
// ============================================

describe('fromNexusApi', () => {
  it('returns null for non-Nexus URLs (does NOT hit the network)', async () => {
    mockedAxios.get = vi.fn();
    const r = await fromNexusApi('https://example.com/mods/123');
    expect(r).toBeNull();
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  it('returns no-candidate when NEXUS_API_KEY is unset (no network call)', async () => {
    delete process.env.NEXUS_API_KEY;
    mockedAxios.get = vi.fn();
    const r = await fromNexusApi('https://www.nexusmods.com/stardewvalley/mods/123');
    expect(r).toEqual({ candidate: null });
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  it('extracts author from a successful 200 response', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      status: 200,
      data: {
        name: 'Bigger Backpack',
        author: 'spacechase0 and bcmpinc',
        uploaded_by: 'spacechase0',
        uploaded_users_profile_url: 'https://www.nexusmods.com/users/12345',
      },
    });
    const r = await fromNexusApi(
      'https://www.nexusmods.com/stardewvalley/mods/1845',
    );
    expect(r?.candidate?.value).toBe('spacechase0 and bcmpinc');
    expect(r?.candidate?.confidence).toBe('high');
    expect(r?.candidate?.strategy).toBe('nexus-api');
    // Confirm we hit the right endpoint with the right shape.
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://api.nexusmods.com/v1/games/stardewvalley/mods/1845.json',
      expect.objectContaining({
        headers: expect.objectContaining({ apikey: 'test-key-1234' }),
      }),
    );
  });

  it('falls back to uploaded_by when author is missing', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      status: 200,
      data: { author: '', uploaded_by: 'lone-uploader' },
    });
    const r = await fromNexusApi(
      'https://www.nexusmods.com/stardewvalley/mods/123',
    );
    expect(r?.candidate?.value).toBe('lone-uploader');
    expect(r?.candidate?.strategy).toBe('nexus-api-uploaded-by');
  });

  it('does NOT duplicate uploaded_by when it equals author (case-insensitive)', async () => {
    // When both fields hold the same handle, only `nexus-api` should win and
    // we shouldn't push an identical fallback into the priority list.
    mockedAxios.get = vi.fn().mockResolvedValue({
      status: 200,
      data: { author: 'shekurika', uploaded_by: 'Shekurika' },
    });
    const r = await fromNexusApi(
      'https://www.nexusmods.com/stardewvalley/mods/8505',
    );
    expect(r?.candidate?.value).toBe('shekurika');
    expect(r?.candidate?.strategy).toBe('nexus-api');
  });

  it('trims whitespace in author/uploaded_by', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      status: 200,
      data: { author: '  Pathoschild  ', uploaded_by: '' },
    });
    const r = await fromNexusApi(
      'https://www.nexusmods.com/stardewvalley/mods/169',
    );
    expect(r?.candidate?.value).toBe('Pathoschild');
  });

  it('returns isMissing=true on 404 (deleted/hidden mod)', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      status: 404,
      data: { message: 'Not Found' },
    });
    const r = await fromNexusApi(
      'https://www.nexusmods.com/stardewvalley/mods/99999',
    );
    expect(r?.candidate).toBeNull();
    expect(r?.isMissing).toBe(true);
  });

  it('returns no-candidate on 401 (bad/missing key)', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      status: 401,
      data: { message: 'Please provide a valid API key' },
    });
    const r = await fromNexusApi(
      'https://www.nexusmods.com/stardewvalley/mods/1',
    );
    expect(r?.candidate).toBeNull();
    expect(r?.isMissing).toBeUndefined();
  });

  it('returns no-candidate on 429 (rate-limited)', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      status: 429,
      data: { message: 'Hourly rate limit exceeded' },
    });
    const r = await fromNexusApi(
      'https://www.nexusmods.com/stardewvalley/mods/1',
    );
    expect(r?.candidate).toBeNull();
  });

  it('returns no-candidate on 500 (server error)', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      status: 500,
      data: { message: 'Internal Server Error' },
    });
    const r = await fromNexusApi(
      'https://www.nexusmods.com/stardewvalley/mods/1',
    );
    expect(r?.candidate).toBeNull();
  });

  it('returns no-candidate on network error (throws)', async () => {
    mockedAxios.get = vi.fn().mockRejectedValue(new Error('ECONNRESET'));
    const r = await fromNexusApi(
      'https://www.nexusmods.com/stardewvalley/mods/1',
    );
    expect(r?.candidate).toBeNull();
  });

  it('returns no-candidate when both author and uploaded_by are missing', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      status: 200,
      data: { name: 'Unknown', author: '', uploaded_by: '' },
    });
    const r = await fromNexusApi(
      'https://www.nexusmods.com/stardewvalley/mods/1',
    );
    expect(r?.candidate).toBeNull();
  });

  it('rejects denylisted author and falls through to uploaded_by', async () => {
    // "Default" is in the badAuthorPatterns denylist. The chain should
    // skip it and use uploaded_by instead.
    mockedAxios.get = vi.fn().mockResolvedValue({
      status: 200,
      data: { author: 'Default', uploaded_by: 'real-handle' },
    });
    const r = await fromNexusApi(
      'https://www.nexusmods.com/stardewvalley/mods/1',
    );
    expect(r?.candidate?.value).toBe('real-handle');
    expect(r?.candidate?.strategy).toBe('nexus-api-uploaded-by');
  });

  it('returns no-candidate when both author and uploaded_by are denylisted', async () => {
    // "Default" and "Title" are both in BAD_AUTHOR_PATTERNS — they're the
    // kinds of legacy garbage values the URL-extractor used to capture.
    mockedAxios.get = vi.fn().mockResolvedValue({
      status: 200,
      data: { author: 'Default', uploaded_by: 'Title' },
    });
    const r = await fromNexusApi(
      'https://www.nexusmods.com/stardewvalley/mods/1',
    );
    expect(r?.candidate).toBeNull();
  });

  it('handles non-string author/uploaded_by values gracefully', async () => {
    // Defensive: API could in theory return numbers/null/objects in these
    // fields. We should fall through, not crash.
    mockedAxios.get = vi.fn().mockResolvedValue({
      status: 200,
      data: { author: 12345, uploaded_by: null },
    });
    const r = await fromNexusApi(
      'https://www.nexusmods.com/stardewvalley/mods/1',
    );
    expect(r?.candidate).toBeNull();
  });
});
