# Newsletter sending over BigScoots SMTP — readiness report (2026-09-08)

_Cass (capture), signed off by Quinn. For the operator. Nothing has been sent to any
subscriber or account; the only recipient so far is the operator's test inbox and
mail-tester.com._

## What you will find in the test inbox

Two emails from **MustHaveMods <simsnews@musthavemods.com>** (Reply-To the same):

| Subject | What it is |
|---|---|
| Your first MustHaveMods roundup — 6 new CC lists | Newsletter issue #1, built from the six newest published collection pages |
| Do you want the weekly Sims 4 finds email? | Re-permission ask for the ~1,500 dormant registered accounts (button is a preview; the confirm endpoint is not built yet) |

Both carry `List-Unsubscribe` + `List-Unsubscribe-Post` headers and a per-recipient
unsubscribe link in the footer.

## Deliverability (mail-tester.com)

| Run | Score | Cause of deductions |
|---|---|---|
| First render | 5.0 / 10 | SpamAssassin `FONT_INVIS_MSGID` (+2.5) on the white-on-white preheader; sender showed as noreply@ |
| After fixes | 7.5 / 10 | https://www.mail-tester.com/test-8aevsoomg — SpamAssassin now 0.0. Remaining: no DKIM, DMARC `p=none`, shared BigScoots IP on one minor blocklist, Patreon 403s the link checker (false positive) |

Gate before any real send stays **≥ 9 / 10**. Everything left to reach it is outside the repo (see "Only you can do").

## Shipped and verified (ship protocol, ledger rows in `changelog.md`)

- **PR #66** — `/api/unsubscribe` route (GET confirm page, POST removes the row; forged or malformed links rejected before the DB) + From address resolved at send time so mail leaves as simsnews@. deploy-verify PASS, 2cfed2d.
- **PR #67** — links, headers and the confirm form now use `/api/unsubscribe/` (trailing slash). Found on the live probe: `trailingSlash: true` made every link answer 308 first; Gmail/Yahoo one-click POSTs do not reliably follow redirects. deploy-verify PASS, 7a7ed94.
- **PR #68** (this one) — `mailto:` unsubscribe target defaults to simsnews@ because unsubscribe@ does not exist on BigScoots.

## Open finding: the unsubscribe links in the test emails return "Link not recognized"

The link tokens are HMAC-signed with `UNSUBSCRIBE_SECRET`, falling back to `NEXTAUTH_SECRET`.
The test script ran on the laptop, so it signed with the local `NEXTAUTH_SECRET`; production
verifies with Vercel's, which is different. Neither environment has `UNSUBSCRIBE_SECRET`.
Env vars are Tier 2, so this is yours. One dedicated value in both places fixes it:

```bash
cd ~/java_projects/MHMFinds && S=$(openssl rand -hex 32) && printf '\nUNSUBSCRIBE_SECRET=%s\n' "$S" >> .env.local && printf '%s' "$S" | vercel env add UNSUBSCRIBE_SECRET production && vercel redeploy https://mhm-finds-dw5l-7kp09o6o3-ericputnams-projects.vercel.app && unset S
```

The value is never displayed. Once it is in, the team re-sends the example pair and checks the
link returns the confirm page (GET only; the test address is never actually unsubscribed).

## Only you can do

1. **CAN-SPAM postal address** for the footer (currently a bracketed placeholder). A PO box or the registered business address is fine.
2. **DKIM**: BigScoots portal → the musthavemods.com site → *Email Deliverability* → enable DKIM (they publish the DNS record). Worth ~1.5 points on mail-tester and it is the single biggest inbox-placement lever. After a week of clean DKIM, move DMARC to `p=quarantine`.
3. **Hourly send limit** for simsnews@ (BigScoots support or the mailbox settings page). The mailer is capped at 100/hour until you confirm a higher number.
4. **`UNSUBSCRIBE_SECRET`** as above.
5. **Tier 2 migration** `Waitlist.unsubscribedAt` (soft delete instead of deleting the row) — package in `operator-queue.md`. Not blocking: deleting the row is compliant, it just loses the audit trail.

## One thing to reconcile before the Q1 branch merges

Your `feature/premium-intent-test` tree has `app/api/newsletter/unsubscribe/route.ts` built on an
`EmailSubscriber` model with `unsubscribedAt` and cuid-based links. Main now has `/api/unsubscribe`
built on `Waitlist` with email-based links. When that branch merges there must be one route and one
model; the branch's design is the better one (no address in URLs, soft delete). The team will fold
`/api/unsubscribe` into it at merge time rather than maintain both.

## What happens after you say go

Day 1: newsletter issue #1 to the waitlist (20 addresses), then re-permission to ~100 recently active
accounts once the confirm endpoint is built and tested the same way. Day 3 and day 7 widen per the
warm-up plan; never accounts dormant >180 days; hard stop at complaints ≥ 0.3 %.

— Quinn, GM
