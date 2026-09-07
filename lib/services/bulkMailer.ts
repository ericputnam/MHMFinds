/**
 * Bulk mailer — throttled list sends over the BigScoots SMTP mailbox
 * (Cass, 2026-09-07; operator decision 2026-09-05, operator-queue T1)
 *
 * The operator's constraints, encoded here so they cannot be forgotten:
 *
 *  - Send through the hosting mailbox, not a per-contact SaaS.
 *  - Never guess the hourly limit upward. Until BigScoots confirms a number,
 *    the ceiling is 100 messages/hour, and `DEFAULT_HOURLY_LIMIT` is the only
 *    place to change it.
 *  - It must not look like spam: every message carries a per-recipient
 *    `List-Unsubscribe` / `List-Unsubscribe-Post` pair, a visible unsubscribe
 *    link in the body, and a real plain-text alternative.
 *  - Warm up. Never all 1,500 accounts in one day: callers pass a slice, and
 *    `maxMessages` is a hard stop on top of the throttle.
 *
 * Nothing in this module sends unless it is called with `dryRun: false` *and*
 * a transport is configured. `previewBulkSend` renders everything and sends
 * nothing, which is how each issue is QA'd before it goes out.
 */

import { emailNotifier, htmlToPlainText, type SendOptions } from './emailNotifier';
import {
  buildUnsubscribeUrl,
  normalizeEmail,
  unsubscribeHeaders,
} from './unsubscribe';

/** BigScoots has not confirmed a limit. 100/hour until they do — never higher. */
export const DEFAULT_HOURLY_LIMIT = 100;
/** Messages per connection burst before the throttle is consulted again. */
export const DEFAULT_BATCH_SIZE = 20;
const HOUR_MS = 60 * 60 * 1000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface BulkMessage {
  subject: string;
  html: string;
  /** Optional; derived from `html` when omitted. */
  text?: string;
}

export interface BulkSendContext {
  email: string;
  unsubscribeUrl: string;
  index: number;
}

export interface BulkSendOptions {
  recipients: string[];
  /** Renders the message for one recipient. Must include the unsubscribe link. */
  build: (ctx: BulkSendContext) => BulkMessage;
  /** Render only; never touches a transport. Defaults to true — sending is opt-in. */
  dryRun?: boolean;
  /** Messages per rolling hour. Clamped to DEFAULT_HOURLY_LIMIT. */
  hourlyLimit?: number;
  batchSize?: number;
  /** Hard stop on this run, applied before the throttle (warm-up control). */
  maxMessages?: number;
  fromName?: string;
  replyTo?: string;
  site?: string;
  /**
   * Assert that the unsubscribe URL answers an unauthenticated POST, per
   * RFC 8058. Only then is `List-Unsubscribe-Post` emitted. Default false:
   * promising one-click and not honouring it is worse than not promising it.
   */
  oneClickUnsubscribe?: boolean;
  /** Injected for tests. */
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  send?: (to: string, subject: string, html: string, options: SendOptions) => Promise<boolean>;
}

export interface BulkRecipientResult {
  email: string;
  subject: string;
  sent: boolean;
  batch: number;
  headers: Record<string, string>;
  /** Present only on a dry run, so QA can eyeball the rendered message. */
  preview?: { html: string; text: string };
  error?: string;
}

export interface BulkSendResult {
  dryRun: boolean;
  transport: string;
  attempted: number;
  sent: number;
  failed: number;
  /** Duplicates, blanks and malformed addresses dropped before sending. */
  skipped: string[];
  /** Dropped because `maxMessages` was reached. */
  deferred: string[];
  batches: number;
  hourlyLimit: number;
  throttleWaitsMs: number[];
  results: BulkRecipientResult[];
}

/** Trim, lowercase, drop blanks/malformed, de-duplicate. Order is preserved. */
export function normalizeRecipients(recipients: string[]): {
  valid: string[];
  skipped: string[];
} {
  const seen = new Set<string>();
  const valid: string[] = [];
  const skipped: string[] = [];

  for (const raw of recipients) {
    const email = normalizeEmail(String(raw ?? ''));
    if (!EMAIL_RE.test(email)) {
      skipped.push(String(raw ?? ''));
      continue;
    }
    if (seen.has(email)) {
      skipped.push(email);
      continue;
    }
    seen.add(email);
    valid.push(email);
  }

  return { valid, skipped };
}

export function chunk<T>(items: T[], size: number): T[][] {
  const n = Math.max(1, Math.floor(size));
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += n) out.push(items.slice(i, i + n));
  return out;
}

/** Requested limit, clamped to the ceiling we are allowed to assume. */
export function resolveHourlyLimit(requested?: number): number {
  const envLimit = Number(process.env.SMTP_HOURLY_LIMIT || 0);
  const candidate = requested ?? (envLimit > 0 ? envLimit : DEFAULT_HOURLY_LIMIT);
  if (!Number.isFinite(candidate) || candidate < 1) return DEFAULT_HOURLY_LIMIT;
  return Math.min(Math.floor(candidate), DEFAULT_HOURLY_LIMIT);
}

const realSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Send one issue to a list, in batches, under a rolling-hour throttle.
 * Defaults to a dry run: the caller has to ask for a real send.
 */
export async function sendBulk(options: BulkSendOptions): Promise<BulkSendResult> {
  const dryRun = options.dryRun !== false;
  const hourlyLimit = resolveHourlyLimit(options.hourlyLimit);
  const batchSize = Math.max(1, options.batchSize ?? DEFAULT_BATCH_SIZE);
  const sleep = options.sleep ?? realSleep;
  const now = options.now ?? (() => Date.now());
  const send = options.send ?? emailNotifier.send.bind(emailNotifier);
  const transport = emailNotifier.transport();

  const { valid, skipped } = normalizeRecipients(options.recipients);

  const cap = options.maxMessages ?? valid.length;
  const targets = valid.slice(0, Math.max(0, cap));
  const deferred = valid.slice(targets.length);

  if (!dryRun && transport === 'none') {
    throw new Error(
      'sendBulk: refusing to send with no transport configured. Set SMTP_HOST (preferred) or run with dryRun.'
    );
  }

  const batches = chunk(targets, batchSize);
  const throttleWaitsMs: number[] = [];
  const results: BulkRecipientResult[] = [];

  let sentThisWindow = 0;
  let windowStart = now();
  let index = 0;

  for (let b = 0; b < batches.length; b++) {
    for (const email of batches[b]) {
      // Rolling-hour throttle: when the window is full, wait it out.
      if (sentThisWindow >= hourlyLimit) {
        const wait = Math.max(0, windowStart + HOUR_MS - now());
        throttleWaitsMs.push(wait);
        if (wait > 0) await sleep(wait);
        windowStart = now();
        sentThisWindow = 0;
      }

      const unsubscribeUrl = buildUnsubscribeUrl(email, options.site);
      const message = options.build({ email, unsubscribeUrl, index });
      const text = message.text ?? htmlToPlainText(message.html);
      const headers = unsubscribeHeaders(email, {
        site: options.site,
        oneClick: options.oneClickUnsubscribe === true,
      });

      if (!message.html.includes(unsubscribeUrl)) {
        throw new Error(
          `sendBulk: rendered message for recipient #${index} is missing its unsubscribe link. ` +
            'Every list message must contain a visible per-recipient unsubscribe URL.'
        );
      }

      if (dryRun) {
        results.push({
          email,
          subject: message.subject,
          sent: false,
          batch: b,
          headers,
          preview: { html: message.html, text },
        });
      } else {
        let ok = false;
        let error: string | undefined;
        try {
          ok = await send(email, message.subject, message.html, {
            text,
            headers,
            fromName: options.fromName,
            replyTo: options.replyTo,
            skipLog: true,
          });
        } catch (e) {
          error = String(e);
        }
        results.push({ email, subject: message.subject, sent: ok, batch: b, headers, error });
      }

      sentThisWindow++;
      index++;
    }
  }

  return {
    dryRun,
    transport,
    attempted: targets.length,
    sent: results.filter((r) => r.sent).length,
    failed: results.filter((r) => !r.sent && !r.preview).length,
    skipped,
    deferred,
    batches: batches.length,
    hourlyLimit,
    throttleWaitsMs,
    results,
  };
}

/** Render an issue without any transport involvement. QA gate before a send. */
export function previewBulkSend(
  options: Omit<BulkSendOptions, 'dryRun' | 'send'>
): Promise<BulkSendResult> {
  return sendBulk({ ...options, dryRun: true });
}
