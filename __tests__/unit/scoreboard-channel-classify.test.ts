/**
 * E409 (Pip, 2026-11-15): the scoreboard's source → channel rule lives in
 * `scoreboard-channel-lib.ts` and reads Bing-syndicated search referrals
 * (`*.search.yahoo.com`, `cn.bing.com`, `ntp.msn.com`) as `other_search`,
 * not `other`, and does not file `medium=email` as AI (`'email'.includes('ai')`
 * was true in the inline chain). Red pre-fix: the syndicated cases, the email
 * case, and the "scoreboard imports the lib" source assertion.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  AI_REFERRERS,
  BING_SYNDICATED_REFERRAL_HOSTS,
  classifyChannel,
  isBingSyndicatedReferral,
} from '../../scripts/agents/scoreboard-channel-lib';

const ROOT = join(__dirname, '..', '..');

describe('scoreboard channel classification (E409)', () => {
  it('Bing-syndicated search referrals are search, not other', () => {
    expect(classifyChannel('uk.search.yahoo.com', 'referral').channel).toBe('other_search');
    expect(classifyChannel('fr.search.yahoo.com', 'referral').channel).toBe('other_search');
    expect(classifyChannel('cn.bing.com', 'referral').channel).toBe('other_search');
    expect(classifyChannel('ntp.msn.com', 'referral').channel).toBe('other_search');
    // GA4 capitalisation does not matter
    expect(classifyChannel('UK.Search.Yahoo.com', 'Referral').channel).toBe('other_search');
  });

  it('the host match is exact on the parsed host, never a substring', () => {
    expect(isBingSyndicatedReferral('search.yahoo.com')).toBe(true);
    expect(isBingSyndicatedReferral('de.search.yahoo.com')).toBe(true);
    expect(isBingSyndicatedReferral('search.yahoo.com.evil.example')).toBe(false);
    expect(isBingSyndicatedReferral('notcn.bing.com')).toBe(false);
    expect(isBingSyndicatedReferral('bing.com')).toBe(false);
    expect(isBingSyndicatedReferral('www.bing.com')).toBe(false);
    expect(isBingSyndicatedReferral('msn.com')).toBe(false);
    expect(BING_SYNDICATED_REFERRAL_HOSTS.length).toBeGreaterThanOrEqual(3);
  });

  it('the pre-existing rows classify exactly as the inline chain did', () => {
    expect(classifyChannel('Pinterest', 'organic').channel).toBe('pinterest');
    expect(classifyChannel('pinterest.com', 'referral').channel).toBe('pinterest');
    expect(classifyChannel('fr.pinterest.com', 'referral').channel).toBe('pinterest');
    expect(classifyChannel('google', 'organic').channel).toBe('google_organic');
    expect(classifyChannel('bing', 'organic').channel).toBe('bing_organic');
    expect(classifyChannel('(direct)', '(none)').channel).toBe('direct');
    expect(classifyChannel('musthavemods.tumblr.com', 'referral').channel).toBe('tumblr');
    expect(classifyChannel('reddit.com', 'referral').channel).toBe('reddit');
    expect(classifyChannel('yahoo', 'organic').channel).toBe('other_search');
    expect(classifyChannel('duckduckgo', 'organic').channel).toBe('other_search');
    expect(classifyChannel('ecosia.org', 'organic').channel).toBe('other_search');
    // `email` contains `ai`; the inline chain filed these as ai_referral (red pre-fix)
    expect(classifyChannel('newsletter', 'email')).toEqual({ channel: 'email', ai: false });
    expect(classifyChannel('sendgrid.net', 'referral')).toEqual({ channel: 'email', ai: false });
    expect(classifyChannel('cpc', 'paid').ai).toBe(false);
    expect(classifyChannel('simmersguide.com', 'referral').channel).toBe('other');
    expect(classifyChannel('home-hero', '(not set)').channel).toBe('other');
    expect(classifyChannel('(not set)', '(not set)').channel).toBe('other');
  });

  it('AI referrers override, and flag the ai total, exactly as before', () => {
    expect(classifyChannel('chatgpt.com', 'ai-assistant')).toEqual({ channel: 'ai_referral', ai: true });
    expect(classifyChannel('gemini.google.com', 'ai-assistant')).toEqual({ channel: 'ai_referral', ai: true });
    expect(classifyChannel('bing.com/chat', 'referral')).toEqual({ channel: 'ai_referral', ai: true });
    expect(classifyChannel('some-assistant.example', 'ai').ai).toBe(true);
    expect(classifyChannel('some-assistant.example', 'ai-assistant').ai).toBe(true);
    expect(classifyChannel('bing', 'organic').ai).toBe(false);
    expect(classifyChannel('cn.bing.com', 'referral').ai).toBe(false);
    expect(AI_REFERRERS).toContain('chatgpt');
  });

  it('funnel-scoreboard.ts classifies through the lib, not an inline chain', () => {
    const src = readFileSync(join(ROOT, 'scripts/agents/funnel-scoreboard.ts'), 'utf-8')
      // strip comments so a quoted pattern in prose cannot satisfy or fail the check
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(src).toMatch(/from '\.\/scoreboard-channel-lib'/);
    expect(src).toMatch(/classifyChannel\(/);
    expect(src).not.toMatch(/ch = 'bing_organic'/);
    expect(src).not.toMatch(/const AI_REFERRERS\s*=/);
  });
});
