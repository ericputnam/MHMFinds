import type { AffiliateNetwork } from './network';

export type EarningStatus = 'pending' | 'approved' | 'reversed' | 'paid';

// Common shape every network client normalizes its report rows into.
export interface NormalizedEarning {
  network: AffiliateNetwork;
  networkTransactionId: string;
  subId: string | null;
  saleAmount: number;
  commissionAmount: number;
  currency: string;
  status: EarningStatus;
  advertiserName: string | null;
  campaignId: string | null;
  eventDate: Date;
  postingDate: Date | null;
  rawData: unknown;
}

export interface NetworkClient {
  network: AffiliateNetwork;
  /** True when the required env-var credentials are present. */
  isConfigured(): boolean;
  /** Names of the env vars this client needs (for the admin config-status UI). */
  requiredEnvVars: string[];
  /** Fetch conversions/commissions in the window, normalized. */
  fetchEarnings(since: Date, until: Date): Promise<NormalizedEarning[]>;
}
