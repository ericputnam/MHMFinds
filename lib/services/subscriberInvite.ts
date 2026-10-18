/**
 * Subscriber → account invite (Cass, E233, 2026-10-18).
 *
 * Who it is for: `waitlist` rows (people who opted in to the weekly mod email)
 * whose address has NO `users` row. On 10-18 that was 22 of 181 subscribers —
 * not 181: 159 already have an account, most of them because they ticked the
 * sign-up opt-in (`signup-optin`). The 22 came from footer / home-hero /
 * go-interstitial / collection-page forms and have never been asked to make one.
 *
 * Why NOT `createPasswordToken(…, 'invite')` + `sendPasswordEmail` (the 10-07
 * inbox spec): `/api/auth/reset-password` POST looks the token's address up in
 * `users` and answers "invalid or expired" when there is no row, so an invite
 * token mailed to a subscriber with no account can never be redeemed. Making it
 * redeemable means either pre-creating 22 accounts nobody asked for (which would
 * also print +22 registered accounts on the B1 scoreboard the moment the script
 * ran — owned-audience adds that are not adds) or changing the auth route (Tier
 * 2). So the invite links to the ordinary credentials sign-up instead: the
 * reader creates their own account with their own password, and an account
 * counts only when a person made it. No token is minted, so no live secret
 * rides this email.
 *
 * Safety invariants live HERE, not in the script, so every caller inherits them:
 * - recipients are opted-in subscribers only, oldest first;
 * - anyone with an account is dropped;
 * - anyone already invited (any prior live invite row, file ledger or
 *   NotificationLog) is dropped — the email says "one-time" and means it;
 * - `EXCLUDED_RECIPIENT_HASHES` (via `partitionExcluded`) and every reject hash
 *   any live weekly send recorded are dropped;
 * - a hard cap per run;
 * - the record stores sha256 hashes only, never an address, and never a URL
 *   carrying an address (GA4 would capture it in page_location).
 */
import { partitionExcluded, hashRecipient } from './sendExclusions';
import { escapeHtml } from './newsletterIssue';
import { withUtm } from './newsletterWeekly';

export const INVITE_CAMPAIGN = 'invite-01';
/** Code-only ceiling per run, independent of `--limit`. */
export const INVITE_HARD_CAP = 50;
export const INVITE_SITE = 'https://musthavemods.com';

/** Trailing slash is load-bearing (`trailingSlash: true`); no address in the URL, ever. */
export function inviteSignupUrl(site: string = INVITE_SITE): string {
  return withUtm(`${site}/sign-in/?mode=signup&ref=${INVITE_CAMPAIGN}`, INVITE_CAMPAIGN);
}

export interface InviteWaitlistRow {
  email: string;
  createdAt: Date;
  id: string;
}

export interface InviteSelection {
  /** In send order (oldest subscriber first), capped. */
  recipients: string[];
  /** Eligible but past the cap — the next run picks them up (idempotent). */
  deferred: number;
  /** Counts of every reason a waitlist row was dropped. */
  counts: {
    waitlist: number;
    hasAccount: number;
    alreadyInvited: number;
    excluded: number;
    weeklyReject: number;
    eligible: number;
  };
}

const norm = (e: string) => String(e ?? '').trim().toLowerCase();

/**
 * Pure selection. `accountEmails` = every `users.email` that matches a waitlist
 * address (any case). `invitedHashes` = hashes from prior LIVE invite rows.
 * `weeklyRejectHashes` = every `rejects[].hash` the weekly sends recorded.
 */
export function selectInviteRecipients(input: {
  waitlist: readonly InviteWaitlistRow[];
  accountEmails: Iterable<string>;
  invitedHashes: Iterable<string>;
  weeklyRejectHashes: Iterable<string>;
  limit?: number;
}): InviteSelection {
  const accounts = new Set(Array.from(input.accountEmails, norm));
  const invited = new Set(input.invitedHashes);
  const rejects = new Set(input.weeklyRejectHashes);

  const ordered = [...input.waitlist].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id)
  );

  const seen = new Set<string>();
  const noAccount: string[] = [];
  let hasAccount = 0;
  let alreadyInvited = 0;
  let weeklyReject = 0;
  for (const row of ordered) {
    const e = norm(row.email);
    if (!e.includes('@') || seen.has(e)) continue;
    seen.add(e);
    if (accounts.has(e)) { hasAccount++; continue; }
    const h = hashRecipient(e);
    if (invited.has(h)) { alreadyInvited++; continue; }
    if (rejects.has(h)) { weeklyReject++; continue; }
    noAccount.push(e);
  }

  const { kept, excluded } = partitionExcluded(noAccount);
  const requested = input.limit && input.limit > 0 ? Math.floor(input.limit) : INVITE_HARD_CAP;
  const cap = Math.min(requested, INVITE_HARD_CAP);
  return {
    recipients: kept.slice(0, cap),
    deferred: Math.max(0, kept.length - cap),
    counts: {
      waitlist: seen.size,
      hasAccount,
      alreadyInvited,
      excluded: excluded.length,
      weeklyReject,
      eligible: kept.length,
    },
  };
}

/** Hashes from prior LIVE invite ledger rows (jsonl lines or NotificationLog bodies). */
export function invitedHashesFromRecords(records: readonly unknown[]): Set<string> {
  const out = new Set<string>();
  for (const r of records) {
    const row = r as { mode?: unknown; kind?: unknown; invitedHashes?: unknown };
    if (!row || row.mode !== 'live' || row.kind !== INVITE_CAMPAIGN || !Array.isArray(row.invitedHashes)) continue;
    for (const h of row.invitedHashes) if (typeof h === 'string' && /^[0-9a-f]{64}$/.test(h)) out.add(h);
  }
  return out;
}

/** Every `rejects[].hash` on any weekly ledger line (E205 rows). */
export function weeklyRejectHashesFromRecords(records: readonly unknown[]): Set<string> {
  const out = new Set<string>();
  for (const r of records) {
    const row = r as { kind?: unknown; rejects?: unknown };
    if (!row || typeof row.kind !== 'string' || !row.kind.startsWith('weekly-issue-') || !Array.isArray(row.rejects)) continue;
    for (const x of row.rejects as Array<{ hash?: unknown }>) {
      if (x && typeof x.hash === 'string' && /^[0-9a-f]{64}$/.test(x.hash)) out.add(x.hash);
    }
  }
  return out;
}

/** Parse a jsonl file body, skipping blank or malformed lines. */
export function parseJsonl(body: string): unknown[] {
  const out: unknown[] = [];
  for (const line of body.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    try { out.push(JSON.parse(t)); } catch { /* skip */ }
  }
  return out;
}

export const INVITE_SUBJECT = 'Save the mods you find on MustHaveMods';

/**
 * The invite. Honest copy: no deadline, no "spots", no claim that an account
 * already exists. One-time, and says so. Unsubscribe is the same per-recipient
 * link the weekly issue carries (sendBulk refuses to send without it).
 */
export function renderInvite(ctx: { unsubscribeUrl: string; postalAddress: string; site?: string }): {
  subject: string;
  html: string;
  text: string;
} {
  if (!ctx.unsubscribeUrl) throw new Error('renderInvite: unsubscribeUrl is required');
  const site = ctx.site ?? INVITE_SITE;
  const cta = inviteSignupUrl(site);
  const home = withUtm(`${site}/`, INVITE_CAMPAIGN);
  const postal = ctx.postalAddress ? `${escapeHtml(ctx.postalAddress)}<br>\n` : '';
  const html = `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#1e293b;border:1px solid #334155;border-radius:14px;padding:32px;">
          <tr><td>
            <p style="margin:0 0 24px;font-size:18px;font-weight:700;color:#ec4899;">MustHaveMods</p>
            <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#ffffff;">Keep the mods you find</h1>
            <div style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#cbd5e1;">
              You get our weekly mod email. If you'd like somewhere to keep the finds,
              a free MustHaveMods account lets you save mods to favorites and come back
              to them from any device.<br /><br />
              It's free, and the weekly email doesn't change either way.
            </div>
            <a href="${escapeHtml(cta)}" style="display:inline-block;background:#ec4899;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 26px;border-radius:9px;">Create a free account</a>
            <p style="margin:28px 0 0;font-size:13px;line-height:1.6;color:#94a3b8;">
              This is a one-time note — we won't send it again. If you'd rather not
              have an account, just ignore it.
            </p>
          </td></tr>
        </table>
        <p style="margin:20px 0 0;font-size:11px;line-height:1.6;color:#64748b;">
          ${postal}<a href="${ctx.unsubscribeUrl}" style="color:#64748b;">Unsubscribe</a> &nbsp;&middot;&nbsp; <a href="${escapeHtml(home)}" style="color:#64748b;">musthavemods.com</a>
        </p>
      </td></tr>
    </table>
  </body>
</html>`;
  const text = [
    'Keep the mods you find',
    '',
    "You get our weekly mod email. If you'd like somewhere to keep the finds, a free MustHaveMods account lets you save mods to favorites and come back to them from any device.",
    '',
    "It's free, and the weekly email doesn't change either way.",
    '',
    `Create a free account: ${cta}`,
    '',
    "This is a one-time note — we won't send it again. If you'd rather not have an account, just ignore it.",
    '',
    ...(ctx.postalAddress ? [ctx.postalAddress] : []),
    `Unsubscribe: ${ctx.unsubscribeUrl}`,
  ].join('\n');
  return { subject: INVITE_SUBJECT, html, text };
}

/** Sorted hashes of the recipients a live run attempted — the idempotency record. */
export function hashList(emails: readonly string[]): string[] {
  return emails.map((e) => hashRecipient(e)).sort();
}
