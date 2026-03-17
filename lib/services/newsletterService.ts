/**
 * Newsletter Service
 *
 * Manages weekly mod roundup newsletters: subscriber queries, content aggregation,
 * HTML email building (dark theme, table layout), and blast sending via AWS SES.
 */

import { prisma } from '@/lib/prisma';
import { emailNotifier } from './emailNotifier';
import jwt from 'jsonwebtoken';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ModCard {
  id: string;
  title: string;
  thumbnail: string | null;
  author: string | null;
  downloadCount: number;
  favoriteCount: number;
  gameVersion: string;
  contentType: string | null;
  isFree: boolean;
}

interface RoundupData {
  trending: ModCard[];
  mostDownloaded: ModCard[];
  newArrivals: ModCard[];
  subscriberCount: number;
  weekOf: string;
}

interface Subscriber {
  id: string;
  email: string;
  displayName: string | null;
}

interface WaitlistEntry {
  id: string;
  email: string;
}

interface SubscriberStats {
  totalSubscribers: number;
  waitlistEmails: number;
  totalOptedOut: number;
  sendsThisMonth: number;
  lastSendDate: Date | null;
}

interface SendHistoryEntry {
  id: string;
  subject: string;
  recipientCount: number;
  deliveredCount: number;
  failedCount: number;
  status: string;
  sentAt: Date;
  completedAt: Date | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function modToCard(mod: {
  id: string;
  title: string;
  thumbnail: string | null;
  author: string | null;
  downloadCount: number;
  gameVersion: string | null;
  contentType: string | null;
  isFree: boolean;
  _count?: { favorites: number };
  favorites?: unknown[];
}): ModCard {
  return {
    id: mod.id,
    title: mod.title,
    thumbnail: mod.thumbnail,
    author: mod.author,
    downloadCount: mod.downloadCount,
    favoriteCount: mod._count?.favorites ?? 0,
    gameVersion: mod.gameVersion ?? 'Sims 4',
    contentType: mod.contentType,
    isFree: mod.isFree,
  };
}

function formatWeekOf(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

// Game badge colors (solid, no gradients)
function gameBadgeColor(game: string): string {
  switch (game.toLowerCase()) {
    case 'sims 4':
      return '#ec4899';
    case 'minecraft':
      return '#8b5cf6';
    case 'stardew valley':
      return '#22c55e';
    default:
      return '#94a3b8';
  }
}

// ---------------------------------------------------------------------------
// 1. getSubscribers
// ---------------------------------------------------------------------------

async function getSubscribers(): Promise<{
  subscribers: Subscriber[];
  waitlist: WaitlistEntry[];
}> {
  const [subscribers, waitlist] = await Promise.all([
    prisma.user.findMany({
      where: {
        newsletterOptIn: true,
        email: { not: undefined },
      },
      select: {
        id: true,
        email: true,
        displayName: true,
      },
    }),
    prisma.waitlist.findMany({
      where: { notified: false },
      select: { id: true, email: true },
    }),
  ]);

  return { subscribers, waitlist };
}

// ---------------------------------------------------------------------------
// 2. getSubscriberStats
// ---------------------------------------------------------------------------

async function getSubscriberStats(): Promise<SubscriberStats> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalSubscribers, waitlistEmails, totalOptedOut, sendsThisMonth, lastSend] =
    await Promise.all([
      prisma.user.count({ where: { newsletterOptIn: true, email: { not: undefined } } }),
      prisma.waitlist.count({ where: { notified: false } }),
      prisma.user.count({ where: { newsletterOptIn: false } }),
      prisma.newsletterSend.count({
        where: { sentAt: { gte: startOfMonth }, status: 'sent' },
      }),
      prisma.newsletterSend.findFirst({
        where: { status: 'sent' },
        orderBy: { sentAt: 'desc' },
        select: { sentAt: true },
      }),
    ]);

  return {
    totalSubscribers,
    waitlistEmails,
    totalOptedOut,
    sendsThisMonth,
    lastSendDate: lastSend?.sentAt ?? null,
  };
}

// ---------------------------------------------------------------------------
// 3. getWeeklyRoundupData
// ---------------------------------------------------------------------------

async function getWeeklyRoundupData(): Promise<RoundupData> {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Trending: top 6 mods by new favorites this week
  const trendingGroups = await prisma.favorite.groupBy({
    by: ['modId'],
    where: { createdAt: { gte: oneWeekAgo } },
    _count: { modId: true },
    orderBy: { _count: { modId: 'desc' } },
    take: 6,
  });

  // Most downloaded: top 6 mods by new downloads this week
  const downloadGroups = await prisma.download.groupBy({
    by: ['modId'],
    where: { createdAt: { gte: oneWeekAgo } },
    _count: { modId: true },
    orderBy: { _count: { modId: 'desc' } },
    take: 6,
  });

  // New arrivals: newest 6 non-NSFW mods
  const newArrivalsRaw = await prisma.mod.findMany({
    where: { isNSFW: false },
    orderBy: { createdAt: 'desc' },
    take: 6,
    select: {
      id: true,
      title: true,
      thumbnail: true,
      author: true,
      downloadCount: true,
      gameVersion: true,
      contentType: true,
      isFree: true,
      _count: { select: { favorites: true } },
    },
  });

  // Fetch mod details for trending IDs
  let trending: ModCard[] = [];
  if (trendingGroups.length > 0) {
    const trendingMods = await prisma.mod.findMany({
      where: { id: { in: trendingGroups.map((g) => g.modId) } },
      select: {
        id: true,
        title: true,
        thumbnail: true,
        author: true,
        downloadCount: true,
        gameVersion: true,
        contentType: true,
        isFree: true,
        _count: { select: { favorites: true } },
      },
    });
    // Preserve the groupBy ordering
    const modMap = new Map(trendingMods.map((m) => [m.id, m]));
    trending = trendingGroups
      .map((g) => modMap.get(g.modId))
      .filter(Boolean)
      .map((m) => modToCard(m!));
  }

  // Fetch mod details for download IDs
  let mostDownloaded: ModCard[] = [];
  if (downloadGroups.length > 0) {
    const downloadMods = await prisma.mod.findMany({
      where: { id: { in: downloadGroups.map((g) => g.modId) } },
      select: {
        id: true,
        title: true,
        thumbnail: true,
        author: true,
        downloadCount: true,
        gameVersion: true,
        contentType: true,
        isFree: true,
        _count: { select: { favorites: true } },
      },
    });
    const modMap = new Map(downloadMods.map((m) => [m.id, m]));
    mostDownloaded = downloadGroups
      .map((g) => modMap.get(g.modId))
      .filter(Boolean)
      .map((m) => modToCard(m!));
  }

  // Fallback: if trending or mostDownloaded have < 6 results, pad with overall top mods
  if (trending.length < 6 || mostDownloaded.length < 6) {
    const existingIds = new Set([
      ...trending.map((m) => m.id),
      ...mostDownloaded.map((m) => m.id),
    ]);
    const fallbackMods = await prisma.mod.findMany({
      where: { isNSFW: false, id: { notIn: Array.from(existingIds) } },
      orderBy: { downloadCount: 'desc' },
      take: 12,
      select: {
        id: true,
        title: true,
        thumbnail: true,
        author: true,
        downloadCount: true,
        gameVersion: true,
        contentType: true,
        isFree: true,
        _count: { select: { favorites: true } },
      },
    });
    const fallbackCards = fallbackMods.map(modToCard);

    while (trending.length < 6 && fallbackCards.length > 0) {
      trending.push(fallbackCards.shift()!);
    }
    while (mostDownloaded.length < 6 && fallbackCards.length > 0) {
      mostDownloaded.push(fallbackCards.shift()!);
    }
  }

  const newArrivals = newArrivalsRaw.map(modToCard);

  const subscriberCount = await prisma.user.count({
    where: { newsletterOptIn: true, email: { not: undefined } },
  });

  return {
    trending,
    mostDownloaded,
    newArrivals,
    subscriberCount,
    weekOf: formatWeekOf(now),
  };
}

// ---------------------------------------------------------------------------
// 4. generateUnsubscribeToken
// ---------------------------------------------------------------------------

function generateUnsubscribeToken(userId: string): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('NEXTAUTH_SECRET is not configured');
  }
  return jwt.sign({ userId, type: 'newsletter-unsub' }, secret, { expiresIn: '90d' });
}

// ---------------------------------------------------------------------------
// 5. verifyUnsubscribeToken
// ---------------------------------------------------------------------------

function verifyUnsubscribeToken(token: string): { userId: string } | null {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null;

  try {
    const payload = jwt.verify(token, secret) as { userId: string; type: string };
    if (payload.type !== 'newsletter-unsub') return null;
    return { userId: payload.userId };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// 6. buildRoundupHtml
// ---------------------------------------------------------------------------

function buildModCardHtml(mod: ModCard): string {
  const badgeColor = gameBadgeColor(mod.gameVersion);
  const thumbnailSrc = mod.thumbnail || 'https://musthavemods.com/placeholder-mod.png';
  const authorText = mod.author ? `by ${mod.author}` : '';
  const downloadsText = mod.downloadCount.toLocaleString();

  return `
    <td style="width:50%;padding:6px;vertical-align:top;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#151B2B;border-radius:8px;overflow:hidden;">
        <tr>
          <td style="padding:0;">
            <a href="https://musthavemods.com/" style="text-decoration:none;" target="_blank">
              <img src="${thumbnailSrc}" alt="${mod.title}" width="260" height="150" style="display:block;width:100%;height:150px;object-fit:cover;border-radius:8px 8px 0 0;" />
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 12px 12px 12px;">
            <a href="https://musthavemods.com/" style="text-decoration:none;color:#f1f5f9;font-weight:bold;font-size:14px;font-family:Arial,Helvetica,sans-serif;display:block;margin-bottom:4px;" target="_blank">${mod.title}</a>
            ${authorText ? `<div style="color:#94a3b8;font-size:12px;font-family:Arial,Helvetica,sans-serif;margin-bottom:6px;">${authorText}</div>` : ''}
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td style="font-size:11px;color:#94a3b8;font-family:Arial,Helvetica,sans-serif;">${downloadsText} downloads</td>
                <td style="text-align:right;">
                  <span style="display:inline-block;background-color:${badgeColor};color:#ffffff;font-size:10px;font-weight:bold;padding:2px 8px;border-radius:9999px;font-family:Arial,Helvetica,sans-serif;">${mod.gameVersion}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>`;
}

function buildModGridHtml(mods: ModCard[]): string {
  let rows = '';
  for (let i = 0; i < mods.length; i += 2) {
    const left = mods[i];
    const right = mods[i + 1];
    rows += '<tr>';
    rows += buildModCardHtml(left);
    if (right) {
      rows += buildModCardHtml(right);
    } else {
      rows += '<td style="width:50%;padding:6px;"></td>';
    }
    rows += '</tr>';
  }
  return rows;
}

function buildRoundupHtml(data: RoundupData, recipientUserId?: string): string {
  const unsubHref = recipientUserId
    ? `https://musthavemods.com/api/newsletter/unsubscribe?token=${generateUnsubscribeToken(recipientUserId)}`
    : '#';

  const trendingGrid = buildModGridHtml(data.trending);
  const newArrivalsGrid = buildModGridHtml(data.newArrivals);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>MustHaveMods Weekly Mod Roundup</title>
</head>
<body style="margin:0;padding:0;background-color:#0B0F19;font-family:Arial,Helvetica,sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#0B0F19;">
    <tr>
      <td align="center" style="padding:20px 10px;">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="padding:30px 24px 20px 24px;text-align:center;">
              <div style="font-size:28px;font-weight:bold;color:#ec4899;font-family:Arial,Helvetica,sans-serif;margin-bottom:4px;">MustHaveMods</div>
              <div style="font-size:18px;color:#f1f5f9;font-family:Arial,Helvetica,sans-serif;margin-bottom:6px;">Weekly Mod Roundup</div>
              <div style="font-size:13px;color:#94a3b8;font-family:Arial,Helvetica,sans-serif;">Week of ${data.weekOf} &bull; ${data.subscriberCount.toLocaleString()} subscribers</div>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 24px;">
              <div style="border-top:1px solid #1e293b;"></div>
            </td>
          </tr>

          <!-- Trending This Week -->
          <tr>
            <td style="padding:24px 24px 8px 24px;">
              <div style="font-size:20px;font-weight:bold;color:#f1f5f9;font-family:Arial,Helvetica,sans-serif;margin-bottom:4px;">Trending This Week</div>
              <div style="font-size:13px;color:#94a3b8;font-family:Arial,Helvetica,sans-serif;margin-bottom:16px;">Most favorited mods this week</div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 18px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                ${trendingGrid}
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:20px 24px 0 24px;">
              <div style="border-top:1px solid #1e293b;"></div>
            </td>
          </tr>

          <!-- New This Week -->
          <tr>
            <td style="padding:24px 24px 8px 24px;">
              <div style="font-size:20px;font-weight:bold;color:#f1f5f9;font-family:Arial,Helvetica,sans-serif;margin-bottom:4px;">New This Week</div>
              <div style="font-size:13px;color:#94a3b8;font-family:Arial,Helvetica,sans-serif;margin-bottom:16px;">Fresh mods just added</div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 18px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                ${newArrivalsGrid}
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding:30px 24px;text-align:center;">
              <a href="https://musthavemods.com/" target="_blank" style="display:inline-block;background-color:#ec4899;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:9999px;font-size:16px;font-weight:bold;font-family:Arial,Helvetica,sans-serif;">Browse All Mods &rarr;</a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 24px 30px 24px;text-align:center;">
              <div style="border-top:1px solid #1e293b;padding-top:16px;">
                <div style="font-size:12px;color:#64748b;font-family:Arial,Helvetica,sans-serif;margin-bottom:8px;">
                  You're receiving this because you signed up at MustHaveMods.com
                </div>
                <a href="${unsubHref}" style="font-size:12px;color:#94a3b8;font-family:Arial,Helvetica,sans-serif;text-decoration:underline;" target="_blank">Unsubscribe</a>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// 7. sendTestEmail
// ---------------------------------------------------------------------------

async function sendTestEmail(
  toEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const data = await getWeeklyRoundupData();
    const html = buildRoundupHtml(data); // preview mode, no unsub token
    const subject = `[TEST] MustHaveMods Weekly Mod Roundup - ${data.weekOf}`;
    const success = await emailNotifier.send(toEmail, subject, html);
    return { success };
  } catch (error) {
    console.error('[NewsletterService] sendTestEmail error:', error);
    return { success: false, error: String(error) };
  }
}

// ---------------------------------------------------------------------------
// 8. sendBlast
// ---------------------------------------------------------------------------

async function sendBlast(
  adminUserId: string
): Promise<{ sendId: string; recipientCount: number }> {
  const data = await getWeeklyRoundupData();
  const subject = `MustHaveMods Weekly Mod Roundup - ${data.weekOf}`;

  // Create the send record
  const send = await prisma.newsletterSend.create({
    data: {
      subject,
      status: 'sending',
      sentById: adminUserId,
    },
  });

  const { subscribers } = await getSubscribers();
  let deliveredCount = 0;
  let failedCount = 0;

  // Send in batches of 10 with 1 second delay between batches
  for (let i = 0; i < subscribers.length; i += 10) {
    const batch = subscribers.slice(i, i + 10);

    const results = await Promise.allSettled(
      batch.map(async (subscriber) => {
        const html = buildRoundupHtml(data, subscriber.id);
        try {
          const success = await emailNotifier.send(subscriber.email, subject, html);

          await prisma.newsletterRecipientLog.create({
            data: {
              sendId: send.id,
              userId: subscriber.id,
              email: subscriber.email,
              status: success ? 'sent' : 'failed',
              sentAt: success ? new Date() : undefined,
              errorMessage: success ? undefined : 'Email delivery failed',
            },
          });

          return success;
        } catch (error) {
          // Log the failure but don't stop the blast
          await prisma.newsletterRecipientLog.create({
            data: {
              sendId: send.id,
              userId: subscriber.id,
              email: subscriber.email,
              status: 'failed',
              errorMessage: String(error),
            },
          });
          return false;
        }
      })
    );

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        deliveredCount++;
      } else {
        failedCount++;
      }
    }

    // Delay between batches (skip after last batch)
    if (i + 10 < subscribers.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // Update send record with final counts
  await prisma.newsletterSend.update({
    where: { id: send.id },
    data: {
      recipientCount: subscribers.length,
      deliveredCount,
      failedCount,
      status: 'sent',
      completedAt: new Date(),
    },
  });

  return { sendId: send.id, recipientCount: subscribers.length };
}

// ---------------------------------------------------------------------------
// 9. getSendHistory
// ---------------------------------------------------------------------------

async function getSendHistory(): Promise<SendHistoryEntry[]> {
  const sends = await prisma.newsletterSend.findMany({
    orderBy: { sentAt: 'desc' },
    take: 20,
    select: {
      id: true,
      subject: true,
      recipientCount: true,
      deliveredCount: true,
      failedCount: true,
      status: true,
      sentAt: true,
      completedAt: true,
    },
  });

  return sends;
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const newsletterService = {
  getSubscribers,
  getSubscriberStats,
  getWeeklyRoundupData,
  generateUnsubscribeToken,
  verifyUnsubscribeToken,
  buildRoundupHtml,
  sendTestEmail,
  sendBlast,
  getSendHistory,
};
