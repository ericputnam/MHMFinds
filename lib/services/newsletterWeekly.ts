/**
 * Weekly newsletter — DB-driven issue builder + cron send path
 * (Cass, 2026-09-21, "Weekly newsletter as a distribution channel")
 *
 * Everything below is behind `NEWSLETTER_WEEKLY_ENABLED` (checked in two
 * places: the cron route, and again in `sendWeeklyNewsletter` itself, so no
 * future caller can send by skipping the route). Reuses the existing manual
 * send path end to end — same template (`lib/services/newsletterIssue.ts`),
 * same throttle/compliance guards (`lib/services/bulkMailer.ts`), same
 * hard-bounce exclusion list (`lib/services/sendExclusions.ts`) — so a live
 * send behaves identically whether it was triggered by a human running
 * `newsletter-send-test.ts` or by the Monday cron.
 *
 * `buildWeeklyIssueData` takes a narrow `NewsletterDb` interface instead of a
 * `PrismaClient` so the issue builder is testable offline with an in-memory
 * fake (see `__tests__/unit/newsletter-weekly.test.ts`) — no network, no DB,
 * matching the "pure" rule `newsletterIssue.ts` documents for the renderer.
 * Only `sendWeeklyNewsletter` (bottom of the file) touches the real database
 * and the real transport.
 */
import { appendFileSync, mkdirSync } from 'fs';
import type { Prisma } from '@prisma/client';

import {
  ALLOWED_IMAGE_HOSTS,
  formatCount,
  isAllowedImageUrl,
  renderIssue,
  type IssueAsk,
  type IssueData,
  type IssueMod,
  type IssuePost,
} from './newsletterIssue';
import { resolvePostalAddress, sendBulk } from './bulkMailer';
import { partitionExcluded } from './sendExclusions';
import { SIMS4_COLLECTIONS, buildWhereClause, collectionHref, type CollectionDefinition } from '../collections';

const SITE = 'https://musthavemods.com';
const REPLY_TO = 'simsnews@musthavemods.com';

/**
 * Issue #1 (2026-09-14) was hand-built from `ISSUE_01` and sent manually to
 * the 23 footer/sign-in subscribers of the day — it predates this pipeline
 * and is not counted by it. The automated pipeline's content week starts the
 * following Monday, so its first issue is numbered 2. Deterministic from the
 * date rather than a DB read, so the number is the same whether this is
 * called from a dry run, a preview, or the live cron.
 */
export const FIRST_AUTOMATED_ISSUE_WEEK_START = new Date('2026-09-15T00:00:00Z');
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function computeIssueNumber(now: Date = new Date()): number {
  const weeks = Math.floor((now.getTime() - FIRST_AUTOMATED_ISSUE_WEEK_START.getTime()) / WEEK_MS);
  return Math.max(2, weeks + 2);
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

/** Rendered verbatim like `ISSUE_01.dateLabel` — no `Intl`/locale dependence. */
export function formatDateLabel(d: Date): string {
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

function humanizeContentType(ct: string | null | undefined): string {
  if (!ct) return 'CC';
  return ct
    .split('-')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

/** Strip to a plain blurb under `max` chars, breaking on a word boundary. Never throws. */
function truncateBlurb(text: string | null | undefined, max = 140): string | null {
  if (!text) return null;
  const flat = String(text).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!flat) return null;
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

/** The subset of `Mod` fields the issue builder reads. */
export interface ModRow {
  id: string;
  title: string;
  thumbnail: string | null;
  shortDescription: string | null;
  description: string | null;
  contentType: string | null;
  downloadCount: number;
  createdAt: Date;
}

export interface SavedModRow extends ModRow {
  saves: number;
}

/**
 * Narrow DB surface the builder needs. The real implementation
 * (`createPrismaDataSource`, below) is a thin Prisma adapter; tests pass an
 * in-memory fake that satisfies the same shape.
 */
export interface NewsletterDb {
  /** Verified, non-NSFW mods with an image, newest/most-downloaded first, created on/after `since`. */
  findRecentMods(opts: { since: Date; take: number }): Promise<ModRow[]>;
  /** Most-favorited mods of all time, most saves first. */
  findMostSaved(opts: { take: number }): Promise<SavedModRow[]>;
  /** Count of verified, non-NSFW mods matching a collection's facet filter. */
  countMods(where: Prisma.ModWhereInput): Promise<number>;
  /** Total catalog size (verified, non-NSFW) for the "browse all N" line. */
  catalogCount(): Promise<number>;
}

/**
 * UTM-tags an on-site URL so GA4 attributes the resulting session to
 * `source=newsletter` / `medium=email` (the metric this whole pipeline is
 * measured on — see `experiments.md`). Only applied to `musthavemods.com`
 * links; an off-site URL (e.g. the Patreon ask) is returned unchanged, since
 * we don't control UTM handling there and it wouldn't attribute in our GA4
 * property anyway.
 */
function withUtm(url: string, campaign: string): string {
  try {
    const u = new URL(url);
    if (!u.hostname.endsWith('musthavemods.com')) return url;
    u.searchParams.set('utm_source', 'newsletter');
    u.searchParams.set('utm_medium', 'email');
    u.searchParams.set('utm_campaign', campaign);
    return u.toString();
  } catch {
    return url;
  }
}

function toIssuePost(m: ModRow): IssuePost {
  const blurb =
    truncateBlurb(m.shortDescription) ??
    truncateBlurb(m.description) ??
    `${humanizeContentType(m.contentType)} added to the catalog this week.`;
  return {
    title: m.title,
    url: `${SITE}/mods/${m.id}/`,
    blurb,
    image: m.thumbnail ?? '',
    alt: m.title,
  };
}

function toIssueMod(m: SavedModRow): IssueMod {
  return {
    name: m.title,
    url: `${SITE}/mods/${m.id}/`,
    image: m.thumbnail ?? '',
    category: humanizeContentType(m.contentType),
    saves: m.saves,
  };
}

/**
 * Pick `need` recent mods with an image on an allowed host
 * (`newsletterIssue.ts` throws otherwise — most mod images are hosted on
 * blog.musthavemods.com, but some source hosts (Patreon, TSR, Tumblr CDNs)
 * are not, so this over-fetches and filters rather than trusting the first
 * page). Widens the window (7d → 14d → 21d → 28d) if the last 7 days don't
 * yield enough eligible mods — a slow content week should never crash the
 * send, only reach further back.
 */
async function pickRecentPosts(db: NewsletterDb, now: Date, need: number): Promise<IssuePost[]> {
  const windows = [7, 14, 21, 28];
  for (const days of windows) {
    const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const candidates = await db.findRecentMods({ since, take: Math.max(need * 5, 25) });
    const eligible = candidates.filter((m) => m.thumbnail && isAllowedImageUrl(m.thumbnail));
    if (eligible.length >= Math.min(need, 2)) {
      return eligible.slice(0, need).map(toIssuePost);
    }
  }
  throw new Error(
    `buildWeeklyIssueData: fewer than 2 recent mods with an image on ${ALLOWED_IMAGE_HOSTS.join(
      ' or '
    )} in the last ${windows[windows.length - 1]} days — refusing to send a hollow issue.`
  );
}

async function pickSaved(db: NewsletterDb, need: number): Promise<IssueMod[]> {
  const candidates = await db.findMostSaved({ take: need * 5 });
  return candidates
    .filter((m) => m.thumbnail && isAllowedImageUrl(m.thumbnail))
    .slice(0, need)
    .map(toIssueMod);
}

/** Deterministic weekly rotation through the collection registry — no DB read needed to pick one. */
export function pickCollectionDefinition(now: Date = new Date()): CollectionDefinition {
  const weekIndex = Math.floor(now.getTime() / WEEK_MS);
  const list = SIMS4_COLLECTIONS;
  return list[((weekIndex % list.length) + list.length) % list.length];
}

async function buildCollectionBlock(
  db: NewsletterDb,
  c: CollectionDefinition
): Promise<IssueData['collection']> {
  // Same shape as app/games/[game]/[topic]/page.tsx's fetchCollectionMods:
  // filter facets first, then the shared safety filters every collection
  // page applies — so the count quoted in the email matches the count the
  // linked page actually shows.
  const where: Prisma.ModWhereInput = {
    ...buildWhereClause(c.filter),
    gameVersion: c.game,
    isNSFW: false,
  };
  const count = await db.countMods(where);
  return {
    label: 'If you only click one thing',
    title: c.title,
    url: `${SITE}${collectionHref(c)}`,
    blurb: `${formatCount(count)} ${c.title.toLowerCase()} pieces on the site right now. ${c.tagline}`.trim(),
    ctaLabel: 'Open the collection',
  };
}

const ASKS: [IssueAsk, IssueAsk] = [
  {
    title: 'Save what you like',
    body: 'A free account keeps your finds in one place instead of 30 open tabs.',
    ctaLabel: 'Create a free account',
    ctaUrl: `${SITE}/sign-in/`,
  },
  {
    title: 'Skip the download countdown',
    body: 'Patrons at $3 or more connect Patreon on any download page and the 10-second wait disappears.',
    ctaLabel: 'Become a patron',
    ctaUrl: 'https://www.patreon.com/musthavemods',
  },
];

/** Builds the full issue. Throws (never sends a placeholder issue) if the catalog can't fill it. */
export async function buildWeeklyIssueData(db: NewsletterDb, opts?: { now?: Date }): Promise<IssueData> {
  const now = opts?.now ?? new Date();
  const number = computeIssueNumber(now);
  const posts = await pickRecentPosts(db, now, 6);
  const saved = await pickSaved(db, 4);
  const collectionDef = pickCollectionDefinition(now);
  const collection = await buildCollectionBlock(db, collectionDef);
  const catalogCount = await db.catalogCount();
  const campaign = `weekly-issue-${pad2(number)}`;

  return {
    number,
    dateLabel: formatDateLabel(now),
    subject: `This week on MustHaveMods — ${posts.length} new finds`,
    intro:
      "Here's what's new this week: fresh finds picked from everything added to the catalog in the last 7 days.",
    posts: posts.map((p) => ({ ...p, url: withUtm(p.url, campaign) })),
    collection: { ...collection, url: withUtm(collection.url, campaign) },
    saved: saved.map((m) => ({ ...m, url: withUtm(m.url, campaign) })),
    catalogCount,
    asks: [
      { ...ASKS[0], ctaUrl: withUtm(ASKS[0].ctaUrl, campaign) },
      ASKS[1], // Patreon — off-site, untagged (see withUtm)
    ],
    signoff: "That's it. Next one lands in a week. — The MustHaveMods team",
  };
}

/* ------------------------------------------------------------------ */
/* Live send — real DB, real transport. Only sendWeeklyNewsletter()    */
/* below touches either.                                               */
/* ------------------------------------------------------------------ */

/**
 * Same ceiling as `bulkMailer`'s per-hour throttle (`DEFAULT_HOURLY_LIMIT`).
 * A cron `maxDuration` of 300s cannot absorb a throttle sleep across an hour
 * boundary, so one run never attempts more than one hour's worth of mail;
 * anyone past the cap is simply not sent to on this run (`deferred` in the
 * result) rather than the function timing out mid-send.
 */
export const WEEKLY_NEWSLETTER_HARD_CAP = 100;

const LEDGER_PATH = 'reports/funnel/newsletter-sends.jsonl';
const LOG_PATH = 'logs/newsletter-send.log';

/**
 * Counts-only send ledger, same shape as `newsletter-send-test.ts` writes.
 * Best-effort: a Vercel production filesystem is read-only outside `/tmp`, so
 * this write is expected to fail there and is wrapped accordingly — the
 * durable record of a cron send is the `NotificationLog` row below, not this
 * file. Never an address, never a subject with an address in it.
 */
function appendFileLedger(entry: Record<string, unknown>): void {
  const line = JSON.stringify({ at: new Date().toISOString(), ...entry }) + '\n';
  for (const path of [LOG_PATH, LEDGER_PATH]) {
    try {
      mkdirSync(path.slice(0, path.lastIndexOf('/')), { recursive: true });
      appendFileSync(path, line);
    } catch {
      // Expected on Vercel (read-only FS outside /tmp) — the DB row is the durable ledger there.
    }
  }
}

/**
 * The narrow slice of `PrismaClient` this module reads. Accepting the client
 * as a parameter (rather than importing `@/lib/prisma` directly) lets the
 * cron route use the shared serverless-safe singleton while a standalone
 * script (`newsletter-preview.ts --weekly`) passes a direct connection
 * (`DIRECT_DATABASE_URL`, `directPrisma()` in `newsletter-send-test.ts`) —
 * the Accelerate-proxied `DATABASE_URL` singleton is Next.js-runtime-only
 * and does not resolve `prisma+postgres://` outside of it.
 */
type PrismaLike = {
  mod: {
    findMany: (args: any) => Promise<ModRow[]>;
    count: (args: any) => Promise<number>;
  };
  favorite: {
    groupBy: (args: any) => Promise<Array<{ modId: string; _count: { modId: number } }>>;
  };
};

export function createPrismaDataSource(prisma: PrismaLike): NewsletterDb {
  return {
    async findRecentMods({ since, take }) {
      return prisma.mod.findMany({
        where: { isVerified: true, isNSFW: false, createdAt: { gte: since }, thumbnail: { not: null } },
        orderBy: [{ downloadCount: 'desc' }, { createdAt: 'desc' }],
        take,
        select: {
          id: true,
          title: true,
          thumbnail: true,
          shortDescription: true,
          description: true,
          contentType: true,
          downloadCount: true,
          createdAt: true,
        },
      });
    },
    async findMostSaved({ take }) {
      const grouped = await prisma.favorite.groupBy({
        by: ['modId'],
        _count: { modId: true },
        orderBy: { _count: { modId: 'desc' } },
        take: take * 5,
      });
      if (!grouped.length) return [];
      const mods = await prisma.mod.findMany({
        where: { id: { in: grouped.map((g) => g.modId) }, isVerified: true, isNSFW: false },
        select: {
          id: true,
          title: true,
          thumbnail: true,
          shortDescription: true,
          description: true,
          contentType: true,
          downloadCount: true,
          createdAt: true,
        },
      });
      const byId = new Map(mods.map((m) => [m.id, m]));
      const out: SavedModRow[] = [];
      for (const g of grouped) {
        const m = byId.get(g.modId);
        if (m) out.push({ ...m, saves: g._count.modId });
      }
      return out;
    },
    async countMods(where) {
      return prisma.mod.count({ where });
    },
    async catalogCount() {
      return prisma.mod.count({ where: { isVerified: true, isNSFW: false } });
    },
  };
}

/**
 * Builds this week's issue against the real database (via the shared,
 * serverless-safe `@/lib/prisma` singleton), without sending anything. Used
 * by `sendWeeklyNewsletter` below, which always runs inside the Next.js
 * route runtime. A standalone script (e.g. `newsletter-preview.ts --weekly`)
 * cannot use this — it must build its own `createPrismaDataSource(directPrisma())`
 * with a direct `DIRECT_DATABASE_URL` connection instead (see that script).
 */
export async function buildLiveWeeklyIssueData(opts?: { now?: Date }): Promise<IssueData> {
  const { prisma } = await import('../prisma');
  return buildWeeklyIssueData(createPrismaDataSource(prisma), opts);
}

export interface WeeklySendResult {
  success: boolean;
  skipped?: boolean;
  reason?: string;
  issueNumber?: number;
  subject?: string;
  recipients?: number;
  attempted?: number;
  sent?: number;
  failed?: number;
  skippedRecipients?: number;
  deferred?: number;
  excludedCount?: number;
  hardCap?: number;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * The only function the cron route calls. Re-checks `NEWSLETTER_WEEKLY_ENABLED`
 * itself (the route already gates on it) so no future caller — an admin
 * button, a script, a test — can trigger a live send just by skipping the
 * route. Recipients are every `waitlist` row (the same single/double
 * opt-in universe `--from-db` uses for the manual issue send) minus the
 * hard-bounce exclusion list.
 */
export async function sendWeeklyNewsletter(): Promise<WeeklySendResult> {
  if (process.env.NEWSLETTER_WEEKLY_ENABLED !== 'true') {
    return { success: true, skipped: true, reason: 'NEWSLETTER_WEEKLY_ENABLED is not "true"' };
  }

  const { prisma } = await import('../prisma');
  const issue = await buildLiveWeeklyIssueData();

  const rows = await prisma.waitlist.findMany({ select: { email: true } });
  const allEmails = Array.from(
    new Set(rows.map((r) => r.email.trim().toLowerCase()).filter((e) => e.includes('@')))
  );
  const { kept: recipients, excluded } = partitionExcluded(allEmails);

  const kind = `weekly-issue-${pad2(issue.number)}`;

  if (!recipients.length) {
    const summary: WeeklySendResult = {
      success: true,
      issueNumber: issue.number,
      subject: issue.subject,
      recipients: 0,
      attempted: 0,
      sent: 0,
      failed: 0,
      excludedCount: excluded.length,
      hardCap: WEEKLY_NEWSLETTER_HARD_CAP,
    };
    appendFileLedger({ kind, subject: issue.subject, mode: 'live', source: 'cron', ...summary });
    await writeNotificationLog(kind, issue.subject, summary, true);
    return summary;
  }

  const postalAddress = resolvePostalAddress();
  const result = await sendBulk({
    recipients,
    dryRun: false,
    maxMessages: WEEKLY_NEWSLETTER_HARD_CAP,
    site: SITE,
    replyTo: REPLY_TO,
    fromName: 'MustHaveMods',
    postalAddress,
    build: ({ unsubscribeUrl }) => renderIssue(issue, { unsubscribeUrl, postalAddress, site: SITE }),
  });

  const summary: WeeklySendResult = {
    success: result.failed === 0,
    issueNumber: issue.number,
    subject: issue.subject,
    recipients: recipients.length,
    attempted: result.attempted,
    sent: result.sent,
    failed: result.failed,
    skippedRecipients: result.skipped.length,
    deferred: result.deferred.length,
    excludedCount: excluded.length,
    hardCap: WEEKLY_NEWSLETTER_HARD_CAP,
  };
  appendFileLedger({
    kind,
    subject: issue.subject,
    mode: 'live',
    source: 'cron',
    site: SITE,
    transport: result.transport,
    batches: result.batches,
    hourlyLimit: result.hourlyLimit,
    ...summary,
  });
  await writeNotificationLog(kind, issue.subject, summary, summary.success);
  return summary;
}

/**
 * Durable ledger row for a cron send. `NotificationLog` already exists (no
 * schema change) and is the one write in this module guaranteed to persist
 * on Vercel's read-only production filesystem. Counts only, in `body` as
 * JSON — never a recipient address or a per-recipient status.
 */
async function writeNotificationLog(
  event: string,
  subject: string,
  summary: WeeklySendResult,
  success: boolean
): Promise<void> {
  try {
    const { prisma } = await import('../prisma');
    await prisma.notificationLog.create({
      data: {
        type: 'digest',
        channel: 'email',
        event,
        subject,
        body: JSON.stringify(summary),
        success,
      },
    });
  } catch (e) {
    console.warn(`[weekly-newsletter] NotificationLog write failed: ${String(e).slice(0, 160)}`);
  }
}
