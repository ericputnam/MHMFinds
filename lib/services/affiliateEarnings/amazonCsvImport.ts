import { prisma } from '@/lib/prisma';
import type { EarningStatus } from './types';

// Amazon Associates has no earnings-reporting API (the Creators API is gated
// behind a 10-sale threshold — see docs/affiliate-curation-plan.md), so Amazon
// commissions come in via manual CSV upload of the Associates Central
// "Earnings report" (Fee earnings). This parser is deliberately tolerant of
// column naming drift across report versions: it matches headers by keyword.

export interface AmazonImportResult {
  rowsParsed: number;
  earningsCreated: number;
  earningsUpdated: number;
  rowsSkipped: number;
  totalCommission: number;
}

// Minimal CSV line parser with quoted-field support.
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields.map((f) => f.trim());
}

function findColumn(headers: string[], keywords: string[]): number {
  return headers.findIndex((h) => {
    const normalized = h.toLowerCase();
    return keywords.some((k) => normalized.includes(k));
  });
}

function parseMoney(value: string | undefined): number {
  if (!value) return 0;
  const num = parseFloat(value.replace(/[$,]/g, ''));
  return Number.isFinite(num) ? num : 0;
}

/**
 * Import an Amazon Associates earnings-report CSV.
 * Dedupe key is a composite of date+asin+amounts, so re-uploading the same
 * (or an overlapping) report is idempotent.
 */
export async function importAmazonEarningsCsv(csvText: string): Promise<AmazonImportResult> {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);

  // Amazon reports sometimes prepend a title line before the real header —
  // find the first line that looks like a header (contains a date-ish and a
  // fee/earnings-ish column).
  let headerIndex = -1;
  let headers: string[] = [];
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const candidate = parseCsvLine(lines[i]).map((h) => h.toLowerCase());
    const hasDate = candidate.some((h) => h.includes('date'));
    const hasFees = candidate.some(
      (h) => h.includes('fee') || h.includes('earning') || h.includes('commission')
    );
    if (hasDate && hasFees) {
      headerIndex = i;
      headers = parseCsvLine(lines[i]);
      break;
    }
  }
  if (headerIndex === -1) {
    throw new Error(
      'Could not find a header row with date and fee/earnings columns. ' +
        'Expected an Amazon Associates earnings report CSV.'
    );
  }

  const dateCol = findColumn(headers, ['date']);
  const nameCol = findColumn(headers, ['name', 'title', 'product']);
  const asinCol = findColumn(headers, ['asin']);
  const revenueCol = findColumn(headers, ['revenue', 'price']);
  const feesCol = findColumn(headers, ['ad fees', 'fees', 'earning', 'commission']);
  // Note: NOT 'tracking' — Amazon's "Tracking ID" column is the store tag
  // (musthavemod04-20), not our per-click ascsubtag.
  const subtagCol = findColumn(headers, ['subtag', 'sub tag', 'sub-tag', 'ascsubtag']);
  const returnsCol = findColumn(headers, ['return', 'refund']);

  const result: AmazonImportResult = {
    rowsParsed: 0,
    earningsCreated: 0,
    earningsUpdated: 0,
    rowsSkipped: 0,
    totalCommission: 0,
  };
  const touchedOfferIds: string[] = [];

  for (const line of lines.slice(headerIndex + 1)) {
    const fields = parseCsvLine(line);
    if (fields.length < 2) continue;
    result.rowsParsed++;

    const dateRaw = dateCol >= 0 ? fields[dateCol] : '';
    const eventDate = dateRaw ? new Date(dateRaw) : null;
    if (!eventDate || isNaN(eventDate.getTime())) {
      result.rowsSkipped++;
      continue;
    }

    const asin = asinCol >= 0 ? fields[asinCol] : '';
    const name = nameCol >= 0 ? fields[nameCol] : '';
    const saleAmount = parseMoney(revenueCol >= 0 ? fields[revenueCol] : '');
    const commissionAmount = parseMoney(feesCol >= 0 ? fields[feesCol] : '');
    const subId = subtagCol >= 0 && fields[subtagCol] ? fields[subtagCol] : null;
    const isReturn = returnsCol >= 0 && parseMoney(fields[returnsCol]) > 0;

    const status: EarningStatus =
      isReturn || commissionAmount < 0 ? 'reversed' : 'approved';

    // Stable dedupe key across re-uploads of the same report row.
    const networkTransactionId = [
      eventDate.toISOString().slice(0, 10),
      asin || name.slice(0, 40),
      saleAmount.toFixed(2),
      commissionAmount.toFixed(2),
      subId || '',
    ].join(':');

    // The ascsubtag we inject at click time is the AffiliateClick.id.
    let clickId: string | null = null;
    let offerId: string | null = null;
    if (subId) {
      const click = await prisma.affiliateClick.findUnique({
        where: { id: subId },
        select: { id: true, offerId: true },
      });
      if (click) {
        clickId = click.id;
        offerId = click.offerId;
        touchedOfferIds.push(click.offerId);
      }
    }

    const data = {
      subId,
      clickId,
      offerId,
      saleAmount,
      commissionAmount,
      currency: 'USD',
      status,
      advertiserName: 'Amazon',
      campaignId: asin || null,
      eventDate,
      postingDate: null,
      rawData: { line, headers } as any,
    };

    const existing = await prisma.affiliateEarning.findUnique({
      where: { network_networkTransactionId: { network: 'amazon', networkTransactionId } },
      select: { id: true },
    });
    if (existing) {
      await prisma.affiliateEarning.update({ where: { id: existing.id }, data });
      result.earningsUpdated++;
    } else {
      await prisma.affiliateEarning.create({
        data: { network: 'amazon', networkTransactionId, ...data },
      });
      result.earningsCreated++;
    }
    if (status !== 'reversed') result.totalCommission += commissionAmount;
  }

  // Refresh rollups for any offers we managed to attribute.
  for (const offerId of Array.from(new Set(touchedOfferIds))) {
    const agg = await prisma.affiliateEarning.aggregate({
      where: { offerId, status: { not: 'reversed' } },
      _count: { id: true },
      _sum: { commissionAmount: true },
    });
    await prisma.affiliateOffer.update({
      where: { id: offerId },
      data: { conversions: agg._count.id, revenue: agg._sum.commissionAmount ?? 0 },
    });
  }

  await prisma.affiliateSyncRun.create({
    data: {
      trigger: 'csv_import',
      status: 'completed',
      networksSynced: ['amazon'],
      earningsCreated: result.earningsCreated,
      earningsUpdated: result.earningsUpdated,
      totalCommission: result.totalCommission,
      completedAt: new Date(),
    },
  });

  return result;
}
