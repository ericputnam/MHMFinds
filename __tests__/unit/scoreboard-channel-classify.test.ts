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
  SEARCH_REFERRAL_HOSTS,
  classifyChannel,
  isBingSyndicatedReferral,
  isSearchReferral,
} from '../../scripts/agents/scoreboard-channel-lib';

const ROOT = join(__dirname, '..', '..');

describe('scoreboard channel classification (E409)', () => {
  // 2026-11-17 follow-up: engines outside the Bing family that GA4 files as referral
  // (yandex.ru 254, ya.ru 58, search.brave.com 41, noai.duckduckgo.com 21,
  // oceanhero.today 19 sessions in 11-09→11-15). Red pre-fix: every line of the
  // first block below read `other`.
  it('non-Bing search-engine referral hosts are search, not other', () => {
    expect(classifyChannel('yandex.ru', 'referral').channel).toBe('other_search');
    expect(classifyChannel('ya.ru', 'referral').channel).toBe('other_search');
    expect(classifyChannel('yandex.by', 'referral').channel).toBe('other_search');
    expect(classifyChannel('yandex.kz', 'referral').channel).toBe('other_search');
    expect(classifyChannel('yandex.com.tr', 'referral').channel).toBe('other_search');
    expect(classifyChannel('alice.yandex.ru', 'referral').channel).toBe('other_search');
    expect(classifyChannel('search.brave.com', 'referral').channel).toBe('other_search');
    expect(classifyChannel('noai.duckduckgo.com', 'referral').channel).toBe('other_search');
    expect(classifyChannel('oceanhero.today', 'referral').channel).toBe('other_search');
    expect(classifyChannel('Search.Brave.com', 'Referral').channel).toBe('other_search');
    // the rows GA4 already files as organic are untouched
    expect(classifyChannel('yandex', 'organic').channel).toBe('other_search');
    expect(classifyChannel('qwant.com', 'organic').channel).toBe('other_search');
    // measured and rejected hosts stay where they were
    expect(classifyChannel('m.baidu.com', 'referral').channel).toBe('other');
    expect(classifyChannel('wenxin.baidu.com', 'referral').channel).toBe('other');
    expect(classifyChannel('startpage.com', 'referral').channel).toBe('other');
    expect(classifyChannel('bing.com', 'referral').channel).toBe('other');
    // exact host match, never a substring
    expect(isSearchReferral('yandex.ru.evil.example')).toBe(false);
    expect(isSearchReferral('notyandex.ru')).toBe(false);
    expect(isSearchReferral('brave.com')).toBe(false);
    expect(isSearchReferral('duckduckgo.com.evil.example')).toBe(false);
    expect(isSearchReferral('myoceanhero.today')).toBe(false);
    // the Bing family still answers through the same door
    expect(isSearchReferral('uk.search.yahoo.com')).toBe(true);
    expect(SEARCH_REFERRAL_HOSTS.length).toBeGreaterThanOrEqual(5);
  });

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
