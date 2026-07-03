import type { NetworkClient, NormalizedEarning, EarningStatus } from './types';

// Impact.com Mediapartners (publisher) Actions API.
// Docs: https://integrations.impact.com/impact-publisher/reference/the-action-object
// Auth: HTTP Basic with AccountSID:AuthToken (Impact dashboard → Settings → API).
//
// The live publisher account is 2956236 (visible in every /c/2956236/... tracking
// link seeded in prisma/seed-affiliates.ts and prisma/seed-oyrosy.ts).

const API_BASE = 'https://api.impact.com';
const PAGE_SIZE = 1000;
const MAX_PAGES = 20; // safety cap; 20k actions per sync window is far beyond current volume

interface ImpactAction {
  Id: string;
  CampaignId?: string;
  CampaignName?: string;
  State?: string; // PENDING | APPROVED | REVERSED | PAID
  Payout?: string; // our commission
  Amount?: string; // sale amount
  Currency?: string;
  EventDate?: string;
  LockingDate?: string;
  SubId1?: string;
}

function mapState(state: string | undefined): EarningStatus {
  switch ((state || '').toUpperCase()) {
    case 'APPROVED':
      return 'approved';
    case 'REVERSED':
      return 'reversed';
    case 'PAID':
      return 'paid';
    default:
      return 'pending';
  }
}

export const impactClient: NetworkClient = {
  network: 'impact',
  requiredEnvVars: ['IMPACT_ACCOUNT_SID', 'IMPACT_AUTH_TOKEN'],

  isConfigured() {
    return Boolean(process.env.IMPACT_ACCOUNT_SID && process.env.IMPACT_AUTH_TOKEN);
  },

  async fetchEarnings(since: Date, until: Date): Promise<NormalizedEarning[]> {
    const sid = process.env.IMPACT_ACCOUNT_SID!;
    const token = process.env.IMPACT_AUTH_TOKEN!;
    const auth = Buffer.from(`${sid}:${token}`).toString('base64');

    const earnings: NormalizedEarning[] = [];
    let nextUri: string | null =
      `/Mediapartners/${sid}/Actions?` +
      new URLSearchParams({
        StartDate: since.toISOString(),
        EndDate: until.toISOString(),
        PageSize: String(PAGE_SIZE),
      }).toString();

    for (let page = 0; page < MAX_PAGES && nextUri; page++) {
      const res: Response = await fetch(`${API_BASE}${nextUri}`, {
        headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
      });
      if (!res.ok) {
        throw new Error(`Impact Actions API ${res.status}: ${(await res.text()).slice(0, 300)}`);
      }
      const data: any = await res.json();
      const actions: ImpactAction[] = data.Actions || [];

      for (const action of actions) {
        if (!action.Id) continue;
        earnings.push({
          network: 'impact',
          networkTransactionId: action.Id,
          subId: action.SubId1 || null,
          saleAmount: parseFloat(action.Amount || '0') || 0,
          commissionAmount: parseFloat(action.Payout || '0') || 0,
          currency: action.Currency || 'USD',
          status: mapState(action.State),
          advertiserName: action.CampaignName || null,
          campaignId: action.CampaignId ? String(action.CampaignId) : null,
          eventDate: action.EventDate ? new Date(action.EventDate) : new Date(0),
          postingDate: action.LockingDate ? new Date(action.LockingDate) : null,
          rawData: action,
        });
      }

      nextUri = data['@nextpageuri'] || null;
    }

    return earnings;
  },
};
