# Operator Queue

The only file the operator has to touch. Agents append packages; the operator
replies inline. Quinn processes replies every morning and removes closed items.

**How to reply:** edit the `Reply:` line, or just tell Claude "approve 2",
"reject 4 because …", "stop 3". Silence on a Tier 1 item = it ships when the
window closes. Tier 2 items older than 7 days get one smaller re-pitch, then
are dropped and logged.

---

## Tier 1 — shipping unless you say stop

### T1 · Cass — newsletter sends through the BigScoots mailbox, not SendGrid (operator decision 2026-09-05)
- **Operator said:** we already have SMTP and a mailbox on BigScoots; the old tool charged per contact so we dropped it; ideally we email *everyone*; it must not look like spam; do not go the SendGrid (pay) path.
- **Build (Cass, Tier 1, no credentials touched):** `lib/services/emailNotifier.ts` gains an SMTP transport (`nodemailer`) that is used whenever `SMTP_HOST` is set; the SendGrid branch stays only as a fallback. Env names: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`. Sends go out in throttled batches under BigScoots' hourly limit (ask BigScoots for the number; until confirmed cap at 100/hour — never guess higher), with `List-Unsubscribe` + `List-Unsubscribe-Post` headers, the per-recipient unsubscribe link that already exists, a plain-text alternative, and a bounce check on the mailbox after each batch. Warm-up: first issue to the 17 subscribers, then engaged registered accounts, then the rest — never all 1,500 accounts in one day.
- **Consent gate:** registered accounts did not opt in to marketing. Before any bulk send to accounts, Cass ships a one-time re-permission email ("want the weekly finds?") and only the people who click join the list. Patreon free members are reached through Patreon posts, not by exporting their emails.
- **Deliverability (operator, ~10 min in the BigScoots panel):** pick the sending mailbox (a dedicated `news@musthavemods.com` is cleaner than sharing `admin@`; `simsnews@` also works), click **Enable Site SMTP** for it, open the **Email Deliverability** tab and make sure SPF, DKIM and DMARC all show green for musthavemods.com. Then put the SMTP host, port, user and password into Vercel (Production) and `.env.local` under the names above. Cass will confirm with a mail-tester.com score ≥ 9/10 before the first real issue.
- **Ships when:** the env vars exist in Vercel. Until then Cass builds and tests against a local mailbox.


## Tier 2 — needs your decision

### Q1 · Merge `feature/premium-intent-test` into `main` (2026-09-01)
- **Why:** `main` has been stale since 2026-07-31. Vercel production is 16 days old. The branch holds 15 commits plus ~210 uncommitted files (newsletter admin, forgot/reset password, `/play`, first-party mods, facets v2, the premium-intent banner). The team ships from `origin/main`, so until this lands every Tier 0 move is built on code the site isn't running.
- **Ask:** commit the working tree on the branch (Claude can stage and write the commit message on request), open the PR, review, merge. Note the `EmailSubscriber.unsubscribedAt` schema drift: production does not have that column, so `npm run db:deploy` (or `db:push`) must run before the merge deploys.
- **Risk:** medium (schema + auth changes). Rollback: `vercel rollback <previous deployment>`.
- **Reply:**

### Q2 · Grant read access so the team can measure Patreon and Pinterest (2026-09-01) — operator asked where the keys go (2026-09-05)
- **Where:** MHMFinds `.env.local` (local runs) **and** Vercel → Settings → Environment Variables → Production (server-side use). Never in git.
  - `PATREON_CREATOR_ACCESS_TOKEN` — from patreon.com/portal/registration/register-clients → the existing client → "Creator's Access Token". Read-only for the sync script.
  - `PINTEREST_ACCESS_TOKEN` is **not** the permanent answer (v5 access tokens die after 30 days — the operator's complaint). Permanent: the pinner's `~/java_projects/MHMUtils/config.json` already holds `client_id`, `client_secret`, `creator_refresh_token` and `pinterest_token_manager.py` refreshes the access token automatically before every run. MHMFinds should read Pinterest through that same manager (Pip: port `ensure_valid_token()` or shell out to it) instead of a hand-pasted token. The current refresh token has lapsed (401), so the operator runs `python3 pinterest_token_helper.py` once in `~/java_projects/MHMUtils` to re-authorize; after that no more pasting as long as the pinner runs at least monthly.
- **Reply:** keys will be added by the operator; Pip owns the token-manager port.

### Q3 · Confirm the newsletter can send (2026-09-01) — CLOSED 2026-09-05
- Operator decision: send through the BigScoots mailbox over SMTP, not SendGrid. See the Tier 1 item above. `NEWSLETTER_WEEKLY_ENABLED` stays unset until the SMTP transport is live and issue #1 has passed QA.

### Q4 · Patreon tier relaunch — package ready (Rio, 2026-09-04)
- **Package:** `reports/funnel/drafts/patreon-tier-relaunch-2026-09-04.md` (merged to main, PR #34). Tier copy + free→paid announcement draft are written; you paste into Patreon (~5 min).
- **Current:** 47 paid, $127/mo gross ($1×7, $3×40, $5×0), 5,201 free members.
- **Option A (conservative):** $3 Early Access / $5 CC Curator / $10 Sims Muse — target 90 patrons ≈ $475/mo gross (+$348).
- **Option B (simplified):** $5 / $10 only, grandfather existing — anchors higher, fewer tiers.
- **Ask:** reply "approve 4 option A" or "approve 4 option B" (or reject with reason). Perks reuse things already built/planned (early lookbooks, countdown skip, mod-topic votes) — no new infrastructure.
- **Risk:** low; pricing is operator-only (Tier 2). Rollback: revert tiers in Patreon dashboard.
- **Reply:**

---

## Closed (last 30 days)

_(none)_
