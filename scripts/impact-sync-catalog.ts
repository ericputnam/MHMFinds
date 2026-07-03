#!/usr/bin/env -S npx tsx
/**
 * Impact catalog sync — turns APPROVED Impact.com programs into live, tracked
 * AffiliateOffer rows automatically. This replaces the manual "paste tracking
 * links into the admin" step entirely:
 *
 *   1. Pulls our contracted campaigns and warns on Expired contracts.
 *   2. For catalog-backed programs (Redbubble, Logitech G, GTRacing), pages the
 *      product feed, scores items against Sims-audience keywords, and picks the
 *      best N — each item already carries a publisher-tagged tracking URL.
 *   3. For programs without a usable catalog (CapCut), mints a deep tracking
 *      link via the TrackingLinks API.
 *   4. Upserts AffiliateOffer rows (network: 'impact', personaValidated: true)
 *      and activates them, so they serve immediately through /api/affiliates
 *      and /api/affiliates/match. Click-time subid injection (subId1) then ties
 *      Impact Actions back to placements for EPC-per-placement reporting.
 *
 * Idempotent: re-runs update price/image/name in place (matched by
 * affiliateUrl, falling back to partner+name) and never duplicate.
 *
 *   npx tsx scripts/impact-sync-catalog.ts --dry-run   # plan only, no writes
 *   npx tsx scripts/impact-sync-catalog.ts             # sync + activate
 *   npx tsx scripts/impact-sync-catalog.ts --no-activate  # upsert as inactive
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local', override: true });

// Scripts can't rely on Prisma Accelerate URLs for fresh schema — use the
// direct connection (Accelerate's schema cache lags behind migrations).
if (process.env.DIRECT_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_DATABASE_URL;
}

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes('--dry-run');
const ACTIVATE = !process.argv.includes('--no-activate');

const SID = process.env.IMPACT_ACCOUNT_SID;
const TOKEN = process.env.IMPACT_AUTH_TOKEN;
const API_BASE = 'https://api.impact.com';

const ALL_THEMES = ['cozy', 'modern', 'minimalist', 'luxury', 'fantasy'];

interface CatalogTarget {
  partner: string;
  programId: string;
  category: string;
  catalogIds: string[];
  /** Highest priority: item must match one of these to be considered on-topic. */
  primaryKeywords: string[];
  /** Bonus scoring — aesthetic fit for the Sims CC audience. */
  bonusKeywords: string[];
  maxOffers: number;
  matchingThemes: string[];
  priority: number;
}

/** Programs with a browsable product feed. */
const CATALOG_TARGETS: CatalogTarget[] = [
  {
    // Fan-art posters/stickers — closest live match to the Displate thesis.
    partner: 'redbubble',
    programId: '11754',
    category: 'decor',
    // US stickers feed. (Catalog 9134, the GB full product feed, consistently
    // returns HTTP 400 on the Items endpoint — excluded until Impact fixes it.)
    catalogIds: ['8110'],
    primaryKeywords: ['sims', 'plumbob', 'cottagecore', 'pastel room', 'kawaii'],
    bonusKeywords: ['poster', 'sticker', 'aesthetic', 'cozy', 'pastel', 'y2k', 'fairy', 'mushroom'],
    maxOffers: 8,
    matchingThemes: ['cozy', 'modern', 'fantasy'],
    priority: 70,
  },
  {
    // Aurora line is Logitech's pastel collection aimed squarely at this demo.
    partner: 'logitech-g',
    programId: '11355',
    category: 'peripherals',
    catalogIds: ['15749'], // Logitech G en_US
    primaryKeywords: ['aurora', 'g735', 'g705', 'pink', 'white mist'],
    bonusKeywords: ['wireless', 'headset', 'mouse', 'keyboard'],
    maxOffers: 4,
    matchingThemes: ['cozy', 'modern', 'minimalist'],
    priority: 55,
  },
  {
    partner: 'gtracing',
    programId: '18111',
    category: 'gaming-chairs',
    catalogIds: ['13261'],
    primaryKeywords: ['pink', 'white', 'pastel', 'footrest'],
    bonusKeywords: ['gaming chair', 'ergonomic'],
    maxOffers: 2,
    matchingThemes: ['modern', 'luxury'],
    priority: 40,
  },
];

/** Programs without a catalog — we mint deep tracking links instead. */
const DEEPLINK_TARGETS = [
  {
    partner: 'capcut',
    programId: '22474',
    category: 'software',
    offers: [
      {
        name: 'CapCut Pro — Edit Your Sims TikToks & Reels',
        description:
          'The free-to-start video editor behind most Sims TikToks. Pro unlocks premium effects, auto-captions, and background removal for your builds and CAS videos.',
        deepLink: 'https://www.capcut.com/',
        imageUrl: 'https://lf16-web-buz.capcut.com/obj/capcut-web-buz-us/common/images/new_logo.png',
        matchingThemes: ALL_THEMES,
        priority: 60,
      },
    ],
  },
];

interface ImpactItem {
  Name?: string;
  Description?: string;
  CurrentPrice?: string;
  OriginalPrice?: string;
  ImageUrl?: string;
  Url?: string;
  StockAvailability?: string;
}

function authHeader(): Record<string, string> {
  const auth = Buffer.from(`${SID}:${TOKEN}`).toString('base64');
  return { Authorization: `Basic ${auth}`, Accept: 'application/json' };
}

async function apiGet<T = any>(path: string): Promise<T | null> {
  const res = await fetch(`${API_BASE}/Mediapartners/${SID}${path}`, { headers: authHeader() });
  if (!res.ok) {
    console.error(`  Impact API ${path.split('?')[0]} -> HTTP ${res.status}`);
    return null;
  }
  return (await res.json()) as T;
}

async function mintTrackingLink(programId: string, deepLink: string): Promise<string | null> {
  const res = await fetch(`${API_BASE}/Mediapartners/${SID}/Programs/${programId}/TrackingLinks`, {
    method: 'POST',
    headers: { ...authHeader(), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ DeepLink: deepLink }).toString(),
  });
  if (!res.ok) {
    console.error(`  TrackingLinks(${programId}) -> HTTP ${res.status}`);
    return null;
  }
  const json: any = await res.json().catch(() => null);
  return json?.TrackingURL ?? null;
}

/** Score an item against a target's keywords; 0 = off-topic. */
function scoreItem(item: ImpactItem, target: CatalogTarget): number {
  const hay = `${item.Name ?? ''} ${item.Description ?? ''}`.toLowerCase();
  let score = 0;
  for (const kw of target.primaryKeywords) if (hay.includes(kw)) score += 10;
  if (score === 0) return 0;
  for (const kw of target.bonusKeywords) if (hay.includes(kw)) score += 2;
  return score;
}

async function collectCatalogOffers(target: CatalogTarget) {
  type Scored = { item: ImpactItem; score: number };
  const scored: Scored[] = [];
  const seenNames = new Set<string>();

  for (const catalogId of target.catalogIds) {
    let page = 1;
    // Page the full feed; keyword filtering happens client-side because the
    // ItemSearch endpoints are 403 on this account tier.
    for (; page <= 40; page++) {
      const json = await apiGet<any>(`/Catalogs/${catalogId}/Items?PageSize=1000&Page=${page}`);
      const items: ImpactItem[] = json?.Items ?? [];
      if (!items.length) break;
      for (const item of items) {
        if (!item.Name || !item.Url || !item.ImageUrl) continue;
        if (item.StockAvailability && item.StockAvailability.toLowerCase() === 'outofstock') continue;
        const score = scoreItem(item, target);
        if (score <= 0) continue;
        const nameKey = item.Name.toLowerCase().trim();
        if (seenNames.has(nameKey)) continue;
        seenNames.add(nameKey);
        scored.push({ item, score });
      }
      if (items.length < 1000) break;
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, target.maxOffers).map(({ item }) => ({
    name: item.Name!.slice(0, 120),
    description: (item.Description ?? '').replace(/\s+/g, ' ').trim().slice(0, 240) || null,
    imageUrl: item.ImageUrl!,
    affiliateUrl: item.Url!,
    partner: target.partner,
    category: target.category,
    matchingThemes: target.matchingThemes,
    priority: target.priority,
    originalPrice: item.CurrentPrice ? Number(item.CurrentPrice) : null,
  }));
}

interface OfferInput {
  name: string;
  description: string | null;
  imageUrl: string;
  affiliateUrl: string;
  partner: string;
  category: string;
  matchingThemes: string[];
  priority: number;
  originalPrice: number | null;
}

async function upsertOffer(offer: OfferInput): Promise<'created' | 'updated'> {
  const existing = await prisma.affiliateOffer.findFirst({
    where: { OR: [{ affiliateUrl: offer.affiliateUrl }, { partner: offer.partner, name: offer.name }] },
  });
  const data = {
    ...offer,
    // /api/affiliates/match ranks by finalScore desc; without this the new
    // audience-fit offers would sort below the legacy Amazon rows (which have
    // researched scores). Derive from priority: fit-ranked 60-90 range.
    finalScore: offer.priority + 20,
    network: 'impact',
    sourceType: 'impact',
    validationStatus: 'validated',
    personaValidated: true,
    personaScore: 5,
    isActive: ACTIVATE,
  };
  if (existing) {
    await prisma.affiliateOffer.update({ where: { id: existing.id }, data });
    return 'updated';
  }
  await prisma.affiliateOffer.create({ data });
  return 'created';
}

async function main() {
  if (!SID || !TOKEN || TOKEN.startsWith('REPL') || TOKEN.startsWith('your-')) {
    console.error('IMPACT_ACCOUNT_SID / IMPACT_AUTH_TOKEN not configured in .env.local — aborting.');
    process.exit(1);
  }

  console.log(`Impact catalog sync ${DRY_RUN ? '(DRY RUN)' : ''}\n`);

  // 1. Contract health — warn loudly on anything expired.
  const campaignsJson = await apiGet<any>('/Campaigns?PageSize=100');
  const campaigns: any[] = campaignsJson?.Campaigns ?? [];
  console.log('=== Campaign contracts ===');
  for (const c of campaigns) {
    const flag = c.ContractStatus === 'Active' ? '  ' : '⚠️ ';
    console.log(`${flag}${c.CampaignName} (${c.CampaignId}): ${c.ContractStatus}`);
  }
  const activeIds = new Set(campaigns.filter((c) => c.ContractStatus === 'Active').map((c) => String(c.CampaignId)));

  // 2. Build the offer set.
  const collected: OfferInput[] = [];

  for (const target of CATALOG_TARGETS) {
    if (!activeIds.has(target.programId)) {
      console.log(`\nSkipping ${target.partner} — contract not Active.`);
      continue;
    }
    console.log(`\nScanning catalogs for ${target.partner}...`);
    const offers = await collectCatalogOffers(target);
    console.log(`  ${offers.length}/${target.maxOffers} audience-fit items found`);
    collected.push(...offers);
  }

  for (const target of DEEPLINK_TARGETS) {
    if (!activeIds.has(target.programId)) {
      console.log(`\nSkipping ${target.partner} — contract not Active.`);
      continue;
    }
    for (const o of target.offers) {
      const trackingUrl = DRY_RUN
        ? `(dry-run: would mint tracking link for ${o.deepLink})`
        : await mintTrackingLink(target.programId, o.deepLink);
      if (!trackingUrl) continue;
      collected.push({
        name: o.name,
        description: o.description,
        imageUrl: o.imageUrl,
        affiliateUrl: trackingUrl,
        partner: target.partner,
        category: target.category,
        matchingThemes: o.matchingThemes,
        priority: o.priority,
        originalPrice: null,
      });
    }
  }

  // 3. Upsert.
  console.log(`\n=== ${DRY_RUN ? 'Would sync' : 'Syncing'} ${collected.length} offers ===`);
  let created = 0;
  let updated = 0;
  for (const offer of collected) {
    console.log(`  [${offer.partner}/${offer.category}] ${offer.name.slice(0, 70)}`);
    if (DRY_RUN) continue;
    const result = await upsertOffer(offer);
    result === 'created' ? created++ : updated++;
  }

  if (!DRY_RUN) {
    console.log(`\nCreated ${created}, updated ${updated}, active=${ACTIVATE}.`);
    const liveByPartner = await prisma.affiliateOffer.groupBy({
      by: ['partner'],
      where: { isActive: true },
      _count: true,
    });
    console.log('Active offers by partner:', JSON.stringify(liveByPartner));
  }

  console.log(
    '\nReminders:\n' +
      '  - Expired contracts (e.g. Canva) need a re-application in the Impact UI.\n' +
      '  - Non-Impact partners (Awin/Displate/CDKeys) still need their own signups.\n' +
      '  - Conversions land via the commission-sync cron; check reports/affiliates/daily/.'
  );
}

main()
  .catch((err) => {
    console.error('Sync failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
