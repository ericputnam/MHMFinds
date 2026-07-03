import type { NetworkClient, NormalizedEarning, EarningStatus } from './types';

// CJ Affiliate Commission Detail API (GraphQL).
// Docs: https://developers.cj.com/graphql/reference/Commission%20Detail
// Auth: Bearer personal access token (CJ Developer Portal → Authentication).
//
// The `sid` query param we append to CJ deep links comes back as `shopperId`
// on each commission record — that is our AffiliateClick.id join key.
// The API limits each posting-date window to 31 days, so the sync service
// keeps windows under that (see earningsSync.ts SYNC_WINDOW_DAYS).

const API_URL = 'https://commissions.api.cj.com/query';
const MAX_PAGES = 20;

interface CjCommissionRecord {
  commissionId: string;
  actionStatus?: string; // new | extended | locked | closed
  advertiserName?: string;
  advertiserId?: string | number;
  postingDate?: string;
  eventDate?: string;
  pubCommissionAmountUsd?: number | string;
  saleAmountUsd?: number | string;
  shopperId?: string; // echoes the `sid` param from the tracking link
  orderId?: string;
}

function mapStatus(record: CjCommissionRecord): EarningStatus {
  const commission = Number(record.pubCommissionAmountUsd ?? 0);
  if (commission < 0) return 'reversed';
  switch ((record.actionStatus || '').toLowerCase()) {
    case 'locked':
      return 'approved';
    case 'closed':
      return 'paid';
    default: // new, extended
      return 'pending';
  }
}

export const cjClient: NetworkClient = {
  network: 'cj',
  requiredEnvVars: ['CJ_PERSONAL_ACCESS_TOKEN', 'CJ_PUBLISHER_ID'],

  isConfigured() {
    return Boolean(process.env.CJ_PERSONAL_ACCESS_TOKEN && process.env.CJ_PUBLISHER_ID);
  },

  async fetchEarnings(since: Date, until: Date): Promise<NormalizedEarning[]> {
    const token = process.env.CJ_PERSONAL_ACCESS_TOKEN!;
    const publisherId = process.env.CJ_PUBLISHER_ID!;

    const earnings: NormalizedEarning[] = [];
    let sinceCommissionId: string | null = null;

    for (let page = 0; page < MAX_PAGES; page++) {
      const cursorArg: string = sinceCommissionId
        ? `, sinceCommissionId: "${sinceCommissionId}"`
        : '';
      const query = `{
        publisherCommissions(
          forPublishers: ["${publisherId}"],
          sincePostingDate: "${since.toISOString()}",
          beforePostingDate: "${until.toISOString()}"${cursorArg}
        ) {
          count
          payloadComplete
          maxCommissionId
          records {
            commissionId
            actionStatus
            advertiserName
            advertiserId
            postingDate
            eventDate
            pubCommissionAmountUsd
            saleAmountUsd
            shopperId
            orderId
          }
        }
      }`;

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });
      if (!res.ok) {
        throw new Error(`CJ Commission API ${res.status}: ${(await res.text()).slice(0, 300)}`);
      }
      const data = await res.json();
      if (data.errors?.length) {
        throw new Error(`CJ Commission API GraphQL error: ${JSON.stringify(data.errors).slice(0, 300)}`);
      }

      const payload = data.data?.publisherCommissions;
      const records: CjCommissionRecord[] = payload?.records || [];

      for (const record of records) {
        if (!record.commissionId) continue;
        earnings.push({
          network: 'cj',
          networkTransactionId: String(record.commissionId),
          subId: record.shopperId || null,
          saleAmount: Number(record.saleAmountUsd ?? 0) || 0,
          commissionAmount: Number(record.pubCommissionAmountUsd ?? 0) || 0,
          currency: 'USD',
          status: mapStatus(record),
          advertiserName: record.advertiserName || null,
          campaignId: record.advertiserId != null ? String(record.advertiserId) : null,
          eventDate: record.eventDate ? new Date(record.eventDate) : new Date(0),
          postingDate: record.postingDate ? new Date(record.postingDate) : null,
          rawData: record,
        });
      }

      if (payload?.payloadComplete !== false || !payload?.maxCommissionId) break;
      sinceCommissionId = String(payload.maxCommissionId);
    }

    return earnings;
  },
};
