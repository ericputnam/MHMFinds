import type { NetworkClient, NormalizedEarning, EarningStatus } from './types';

// Rakuten Advertising (LinkShare) Events API.
// Docs: https://developers.rakutenadvertising.com/guides/events
// Auth: OAuth2 client-credentials — Basic base64(clientId:clientSecret) against
// /token with scope=<publisher SID>, then Bearer token on the Events API.
//
// Note per Rakuten docs: rows with is_event === 'Y' are unconfirmed events that
// advertisers may still cancel — we store them as 'pending'. Negative-commission
// rows are corrections/returns — stored as 'reversed'.

const TOKEN_URL = 'https://api.linksynergy.com/token';
const EVENTS_URL = 'https://api.linksynergy.com/events/1.0/transactions';
const PAGE_LIMIT = 1000;
const MAX_PAGES = 20;

interface RakutenTransaction {
  etransaction_id: string;
  order_id?: string;
  advertiser_name?: string;
  mid?: number | string; // advertiser (merchant) ID
  sale_amount?: number;
  commissions?: number;
  currency?: string;
  transaction_date?: string;
  process_date?: string;
  is_event?: string; // 'Y' = unconfirmed event, 'N' = confirmed transaction
  u1?: string; // our subid
}

function mapStatus(tx: RakutenTransaction): EarningStatus {
  if ((tx.commissions ?? 0) < 0) return 'reversed';
  if ((tx.is_event || '').toUpperCase() === 'Y') return 'pending';
  return 'approved';
}

async function getAccessToken(): Promise<string> {
  const clientId = process.env.RAKUTEN_CLIENT_ID!;
  const clientSecret = process.env.RAKUTEN_CLIENT_SECRET!;
  const sid = process.env.RAKUTEN_SID!;
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials', scope: sid }).toString(),
  });
  if (!res.ok) {
    throw new Error(`Rakuten token endpoint ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const data = await res.json();
  if (!data.access_token) throw new Error('Rakuten token response missing access_token');
  return data.access_token;
}

// Events API expects "YYYY-MM-DD HH:MM:SS" timestamps.
function formatDate(d: Date): string {
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

export const rakutenClient: NetworkClient = {
  network: 'rakuten',
  requiredEnvVars: ['RAKUTEN_CLIENT_ID', 'RAKUTEN_CLIENT_SECRET', 'RAKUTEN_SID'],

  isConfigured() {
    return Boolean(
      process.env.RAKUTEN_CLIENT_ID &&
        process.env.RAKUTEN_CLIENT_SECRET &&
        process.env.RAKUTEN_SID
    );
  },

  async fetchEarnings(since: Date, until: Date): Promise<NormalizedEarning[]> {
    const token = await getAccessToken();
    const earnings: NormalizedEarning[] = [];

    for (let page = 1; page <= MAX_PAGES; page++) {
      const params = new URLSearchParams({
        transaction_date_start: formatDate(since),
        transaction_date_end: formatDate(until),
        limit: String(PAGE_LIMIT),
        page: String(page),
      });
      const res = await fetch(`${EVENTS_URL}?${params}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      if (!res.ok) {
        throw new Error(`Rakuten Events API ${res.status}: ${(await res.text()).slice(0, 300)}`);
      }
      const transactions: RakutenTransaction[] = await res.json();
      if (!Array.isArray(transactions) || transactions.length === 0) break;

      for (const tx of transactions) {
        if (!tx.etransaction_id) continue;
        earnings.push({
          network: 'rakuten',
          networkTransactionId: tx.etransaction_id,
          subId: tx.u1 || null,
          saleAmount: tx.sale_amount ?? 0,
          commissionAmount: tx.commissions ?? 0,
          currency: tx.currency || 'USD',
          status: mapStatus(tx),
          advertiserName: tx.advertiser_name || null,
          campaignId: tx.mid != null ? String(tx.mid) : null,
          eventDate: tx.transaction_date ? new Date(tx.transaction_date) : new Date(0),
          postingDate: tx.process_date ? new Date(tx.process_date) : null,
          rawData: tx,
        });
      }

      if (transactions.length < PAGE_LIMIT) break;
    }

    return earnings;
  },
};
