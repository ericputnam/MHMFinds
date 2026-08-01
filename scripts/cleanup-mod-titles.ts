#!/usr/bin/env npx tsx
/**
 * Cleanup script for garbage mod titles left behind by scraping.
 *
 * The problem: some scraped mods have titles like "2025 81", "CC #47.2",
 * "Hair 34, 35, 36", or raw slugs like "Im-Peckable-Bird-Houses". Mod page
 * <title> tags use the exact-match format "<title> - Sims 4 CC" (see
 * app/mods/[id]/page.tsx), so garbage titles directly hurt the catalog's
 * long-tail rankings.
 *
 * This script (companion to cleanup-author-data.ts):
 * 1. Flags suspicious titles via heuristics (numeric/date junk, slugs,
 *    generic words, URL fragments)
 * 2. Visits the mod's source/download URL and extracts the real title
 *    from og:title / <title>, stripping site suffixes
 * 3. Falls back to de-slugging the URL path when the page is unreachable
 * 4. Proposes a change only when the derived title is clearly better —
 *    creator date-code conventions like "WM Rings 202001" survive because
 *    the source page reports the same name
 *
 * Usage:
 *   npx tsx scripts/cleanup-mod-titles.ts              # Dry run - report only
 *   npx tsx scripts/cleanup-mod-titles.ts --fix        # Apply fixes
 *   npx tsx scripts/cleanup-mod-titles.ts --fix --limit=10
 *
 * Every proposal (applied or not) is written to
 * reports/mod-title-cleanup-<date>.csv for review/rollback.
 */

import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const FIX = process.argv.includes('--fix');
const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity;

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const REQUEST_DELAY_MS = 2000;

const GENERIC_TITLES = new Set([
  'title', 'untitled', 'download', 'downloads', 'post', 'posts', 'www', 'index',
  'home', 'sims 4', 'sims4', 'cc', 'mod', 'mods', 'new', 'free', 'patreon',
  'early access', 'public', 'update', 'preview', 'sims 4 cc', 'creations',
]);

// Suffixes sites append to page titles, e.g. "Cool Hair | Patreon".
const SITE_SUFFIX_REGEX =
  /\s*[|\-–—•·]\s*(patreon|the sims resource|curseforge|mod the sims|tumblr|simsfinds|sims 4 (cc|mods?)( free download)?|free download|musthavemods.*|itch\.io|ko-fi.*)\s*$/i;

function digitRatio(t: string): number {
  const digits = (t.match(/\d/g) || []).length;
  const alnum = (t.match(/[a-zA-Z0-9]/g) || []).length;
  return alnum === 0 ? 1 : digits / alnum;
}

export function isGarbageTitle(title: string): string | null {
  const t = title.trim();
  if (/^[\d\s\-_.#,()]+$/.test(t)) return 'numeric-only';
  if (digitRatio(t) > 0.5 && t.length < 25) return 'mostly-digits';
  if (t.length < 4) return 'too-short';
  if (GENERIC_TITLES.has(t.toLowerCase())) return 'generic';
  if (/https?:|www\.|\.com|\.net|%[0-9a-f]{2}|\.zip|\.package|\.rar/i.test(t)) return 'url-fragment';
  if (!t.includes(' ') && t.includes('-') && t.length > 12) return 'slug-like';
  return null;
}

// Listicle/roundup headlines are never a mod's name — the scraper's
// sourceUrl (and sometimes re-posts) point at article pages.
const LISTICLE_REGEX =
  /^\d+\+?\s|\bbest\b.*\b(cc|mods?)\b|must[- ]have|ultimate list|finds? for|top \d+/i;

/** Clean a title scraped from a source page. Returns null if unusable. */
function cleanFetchedTitle(raw: string): string | null {
  let t = raw.trim().replace(/\s+/g, ' ');
  // Strip site suffixes repeatedly ("X | Y | Patreon")
  for (let i = 0; i < 3; i++) t = t.replace(SITE_SUFFIX_REGEX, '').trim();
  if (t.length < 4 || t.length > 120) return null;
  if (!/[a-zA-Z]{3}/.test(t)) return null;
  if (GENERIC_TITLES.has(t.toLowerCase())) return null;
  if (LISTICLE_REGEX.test(t)) return null;
  if (looksLikeSentence(t)) return null;
  // Reject decorative-unicode titles (emoji/symbol art around the name) —
  // the URL slug is a cleaner source for those.
  const ascii = (t.match(/[\x20-\x7E]/g) || []).length;
  if (ascii / t.length < 0.7) return null;
  return t;
}

/** Post-body excerpts masquerading as titles (Tumblr especially). */
function looksLikeSentence(t: string): boolean {
  return t.length > 60 || /\.\.\.|…/.test(t) || /\s[Ii]\s/.test(t);
}

/** Compare titles ignoring case, punctuation, and separators. */
function normalized(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

const isMhmUrl = (url: string) => /musthavemods\.com/i.test(url);

/** Strip a leading "Author - " / "Author: " / "Author's " brand prefix. */
function stripAuthorPrefix(title: string, author: string | null): string {
  if (!author || author.length < 3) return title;
  const esc = author.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^${esc}[_']*s?['\u2019]?\\s*[-:|\u2013\u2014]?\\s*`, 'i');
  const stripped = title.replace(re, '').trim();
  return stripped.length >= 4 ? stripped : title;
}

/** De-slug the last path segment of a URL into a human title. */
function titleFromUrlSlug(url: string): string | null {
  try {
    const segments = new URL(url).pathname.split('/').filter(Boolean);
    // Prefer the last segment that isn't purely numeric (Patreon post IDs)
    const slug = [...segments].reverse().find((s) => !/^\d+$/.test(s) && s.length > 6);
    if (!slug) return null;
    const t = decodeURIComponent(slug)
      .replace(/\.(html?|php)$/i, '')
      .replace(/^\d{3,}(?=[a-z])/i, '') // decorative digit-runs glued to the name
      .replace(/[-_]+/g, ' ')
      .replace(/\s+\d{5,}\s*$/, '') // trailing post IDs
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase());
    return t.length >= 4 && /[a-zA-Z]{3}/.test(t) ? t : null;
  } catch {
    return null;
  }
}

async function fetchSourceTitle(url: string): Promise<string | null> {
  try {
    const res = await axios.get(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
      timeout: 15000,
      maxRedirects: 5,
      validateStatus: (s) => s === 200,
    });
    const $ = cheerio.load(res.data);
    const og = $('meta[property="og:title"]').attr('content');
    const candidates = [og, $('title').first().text(), $('h1').first().text()];
    for (const c of candidates) {
      if (!c) continue;
      const cleaned = cleanFetchedTitle(c);
      if (cleaned && !isGarbageTitle(cleaned)) return cleaned;
    }
    return null;
  } catch {
    return null; // 403s from Patreon/CurseForge etc. — fall back to slug
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  // Accelerate caps responses at 5MB — paginate with a narrow select.
  const mods: { id: string; title: string; sourceUrl: string | null; downloadUrl: string | null; author: string | null }[] = [];
  let cursor: string | undefined;
  while (true) {
    const batch = await prisma.mod.findMany({
      select: { id: true, title: true, sourceUrl: true, downloadUrl: true, author: true },
      take: 2000,
      orderBy: { id: 'asc' },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    mods.push(...batch);
    if (batch.length < 2000) break;
    cursor = batch[batch.length - 1].id;
  }

  const flagged = mods
    .map((m) => ({ ...m, reason: isGarbageTitle(m.title) }))
    .filter((m) => m.reason)
    .slice(0, LIMIT);

  console.log(`Scanned ${mods.length} mods — ${flagged.length} flagged${FIX ? ' (FIX mode)' : ' (dry run)'}\n`);

  const rows: string[] = ['id,reason,old_title,new_title,method,applied'];
  let fixed = 0;

  for (const m of flagged) {
    // downloadUrl is the creator's page; sourceUrl is often the MHM
    // listicle the mod was scraped from — never a title source.
    const candidates: { title: string; method: string }[] = [];
    const urls = [m.downloadUrl, m.sourceUrl].filter(
      (u): u is string => Boolean(u) && !isMhmUrl(u!),
    );

    let fetched = false;
    for (const u of urls) {
      const t = await fetchSourceTitle(u);
      fetched = true;
      if (t) {
        candidates.push({ title: t, method: 'creator-page' });
        break;
      }
    }
    for (const u of urls) {
      const t = titleFromUrlSlug(u);
      if (t) {
        candidates.push({ title: t, method: 'url-slug' });
        break;
      }
    }
    // Last resort for slug-like titles: de-slug the title itself.
    if (m.reason === 'slug-like') {
      candidates.push({
        title: m.title.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim(),
        method: 'de-slugged-title',
      });
    }
    if (fetched) await sleep(REQUEST_DELAY_MS);

    // Only propose a change when it's a real improvement: different
    // beyond punctuation/case, and not garbage itself.
    const pick = candidates
      .map((c) => ({ ...c, title: stripAuthorPrefix(c.title, m.author) }))
      .find(
        (c) =>
          (normalized(c.title) !== normalized(m.title) || c.method === 'de-slugged-title') &&
          // A candidate that only wraps the current title in a creator
          // prefix ("LEXEL_s' LEXEL-Gravity") is not an improvement.
          !normalized(c.title).endsWith(' ' + normalized(m.title)) &&
          c.title !== m.title &&
          !isGarbageTitle(c.title) &&
          !LISTICLE_REGEX.test(c.title) &&
          !looksLikeSentence(c.title),
      );
    const newTitle = pick?.title ?? null;
    const method = pick?.method ?? 'none';
    const isImprovement = Boolean(pick);

    const applied = Boolean(FIX && isImprovement);
    if (applied) {
      await prisma.mod.update({ where: { id: m.id }, data: { title: newTitle! } });
      fixed++;
    }

    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    rows.push([m.id, m.reason, esc(m.title), esc(newTitle || ''), method, String(applied)].join(','));
    console.log(
      `${applied ? '[FIXED]' : isImprovement ? '[WOULD FIX]' : '[NO CANDIDATE]'} ${m.id} (${m.reason})\n` +
        `    "${m.title}" -> ${newTitle ? `"${newTitle}" (${method})` : '(no better title found)'}`,
    );
  }

  const reportPath = path.join(
    __dirname,
    '..',
    'reports',
    `mod-title-cleanup-${new Date().toISOString().slice(0, 10)}.csv`,
  );
  fs.writeFileSync(reportPath, rows.join('\n') + '\n');
  console.log(`\n${FIX ? `Applied ${fixed} fixes.` : 'Dry run — nothing written to the database.'}`);
  console.log(`Report: ${reportPath}`);
}

main().finally(() => prisma.$disconnect());
