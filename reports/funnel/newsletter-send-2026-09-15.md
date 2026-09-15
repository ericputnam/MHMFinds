# Newsletter send ledger — read 2026-09-15 (Cass, E54)

Counts and timestamps only. No subscriber address appears in this file, in the
JSONL ledger, or in any command run to produce them. Env vars are named, never
read out.

## 1. Was issue #1 sent on 2026-09-14? — YES

| Question | Answer | Source |
|---|---|---|
| Merge that made the send possible | PR #96 `4a8774a`, 2026-09-14 10:53Z | `git log` |
| Send time | **2026-09-14 10:58:06Z** (5 min after merge) | `Date:` header of the original message wrapped in the DSN below |
| Subject that went out | `Your first MustHaveMods roundup: 6 new CC lists` (= `ISSUE_01.subject`) | same DSN, original `Subject:` |
| Sending path | `scripts/agents/newsletter-send-test.ts --from-db --only issue` over SMTP (`SMTP_HOST` mailbox) | only live path that renders that subject |
| List at send time | **23** `waitlist` rows (newest created 2026-09-13T09:55Z; none created or deleted since) | Prisma count 2026-09-15 06:5xZ |
| Attempted / sent / failed | **source unavailable** — the script wrote no ledger and `bulkMailer` passes `skipLog: true`, so `notification_logs` has **0 rows all-time** | Prisma `notificationLog.count()` = 0 |
| Hard bounces | **1** — DSN received 2026-09-14 06:58:11 -0400, `Status: 5.0.0`, `Diagnostic-Code: smtp; 550 5.7.1 No such user` | read-only IMAP, `INBOX` |
| Soft bounces / delayed | 0 observed | IMAP: only 2 messages in INBOX all-time; the other is a 2025-10-27 DSN for an unrelated Surfer report |
| Auto-replies | 0 | IMAP `SEARCH SUBJECT "Automatic reply" / "Out of Office"` since 13-Sep = 0 |
| Spam complaints | **not observable** (no feedback loop on the BigScoots mailbox) | — |
| Unsubscribes | **0** — an unsubscribe deletes the `waitlist` row; 23 rows on 09-13, 23 rows on 09-15 | Prisma |
| Replies to `Reply-To` (`simsnews@`) | 0 | IMAP |
| Sent-folder copy | none (SMTP submission does not store Sent copies; `INBOX.Sent` = 0 messages) | IMAP |
| Delivered (best estimate) | **≤ 22 of 23** (exact count: source unavailable) | derived |
| mail-tester | not re-run today (template unchanged since the 8.5/10 run on 09-13) | — |

Folder scan (counts only, all folders): `INBOX` 2 messages (1 since 09-14),
`INBOX.spam` 0, `INBOX.Junk` 0, `INBOX.Trash` 0, `INBOX.Sent` 0,
`INBOX.Drafts` 0, `INBOX.Archive` 0.

**E44 keep-if** ("bounces ≤ 2 and unsubs ≤ 2 of 23, no spam complaint"): at
today's read, 1 hard bounce, 0 unsubscribes, complaints unobservable. The
2026-09-21 read stands; nothing here pauses issue #2.

Why this took a day to establish: `bulkMailer.sendBulk()` deliberately skips
`notification_logs` ("bulk sends do their own accounting") and the send script
did no accounting of its own. The only trace of the first email this site ever
sent to subscribers was a bounce in the sending mailbox. Fixed in this PR (§3).

## 2. Dry runs today (this PR, sends 0)

| Path | Recipients | Attempted | Sent | Checks |
|---|---|---|---|---|
| `--from-db --only issue --dry` | 23 | 23 | 0 | unsubscribe URL `https://musthavemods.com/api/unsubscribe/?e=…&t=…` (apex, signed); 0 slashless internal hrefs; `EMAIL_POSTAL_ADDRESS` value present in the footer; `errors: 0` |
| `--accounts-from-db --only repermission --dry` | 100 of 387 eligible | 100 | 0 | confirm URL `https://musthavemods.com/api/subscribe/confirm/?e=…&t=…` ×2 (button + plain link), unsubscribe URL ×1, postal line present; `errors: 0` |

Both runs appended a counts-only line to `reports/funnel/newsletter-sends.jsonl`
(the 09-14 send is seeded there as a `reconstructed: true` row citing the DSN).

## 3. What changed in the send script (Tier 0)

- **Ledger on every run.** `newsletter-send-test.ts` appends one JSON line per
  run — kind, subject, dry/live, source, transport, recipients, attempted, sent,
  failed, skipped, deferred, batches, hourlyLimit, offset, cwd — to
  `reports/funnel/newsletter-sends.jsonl` (tracked) and
  `logs/newsletter-send.log` (gitignored). Never a per-address row.
- **Re-permission day-1 path.** `--accounts-from-db --only repermission
  [--limit N] [--offset N] [--dry]` selects the draft's day-1 segment (≥ 1
  favourite, created ≤ 90 days, not in `waitlist`, no `@admin.local`),
  oldest-first so `--offset` pages without overlap. `REPERMISSION_HARD_CAP = 100`
  per run is code-only and wins over `--limit`. Dry run is the default of
  `sendBulk`; a live send still needs the explicit absence of `--dry` plus
  `SMTP_HOST` and `EMAIL_POSTAL_ADDRESS`.
- **No per-address output on any DB-sourced run** (`dbSourced` gate on both
  paths; previously the re-permission path printed `email:status` pairs).
- Tests: `__tests__/unit/bulk-mailer.test.ts` +2 source-level assertions
  (ledger written by both paths and carries no `results`; hard cap present and
  every per-address console line is gated).

## 4. Re-permission campaign — Before (2026-09-15), queued T1

- Registered accounts 1,649 (1,648 with an address); **1,640 not in `waitlist`**;
  809 with ≥ 1 favourite; **387 in the day-1 segment** (≥ 1 favourite, created
  ≤ 90 d); 422 in the day-3 segment (≥ 1 favourite, older than 90 d).
- `waitlist` rows with `source = 're-permission'`: **0**. Subscribers 23.
- Proposed schedule (each batch is one command, counts-only output, ledger line
  written): 09-16 `--offset 0` (100), 09-17 `--offset 100` (100), 09-18
  `--offset 200` (100), 09-19 `--offset 300` (87). Gate between batches: hard
  bounces < 3 % of the batch and 0 complaints, read from the mailbox the same way
  as §1. Day-3 segment needs a `--segment` flag (not built) — do not send it from
  this path.
- Kill rule (draft §6): complaints ≥ 0.3 % at any batch stops the campaign.

## 5. Follow-ups (next run, Tier 0 unless noted)

1. **Prune the hard-bounced address from `waitlist` before issue #2** — a
   script that reads DSNs from the mailbox and deletes matching rows, printing
   counts only. Re-sending to a 550 address damages reputation for nothing.
2. UTM tags on the six post links before issue #2 (09-13 note; still open) so
   clicks show up in GA4.
3. `E44` read 2026-09-21: repeat §1 from the mailbox; add `waitlist` delta and
   GA4 sessions with `utm_source=newsletter` once (2) ships.

— Cass, Capture
