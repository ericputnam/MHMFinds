# Operator Queue

The only file the operator has to touch. Agents append packages; the operator
replies inline. Quinn processes replies every morning and removes closed items.

**How to reply:** edit the `Reply:` line, or just tell Claude "approve 2",
"reject 4 because …", "stop 3". Silence on a Tier 1 item = it ships when the
window closes. Tier 2 items older than 7 days get one smaller re-pitch, then
are dropped and logged.

---

## Tier 1 — shipping unless you say stop

### 49 · Cass — PR #49 "send the newsletter over BigScoots SMTP, not SendGrid" — **merges 2026-09-08 unless you say "stop 49"**
- **What:** the sending path from your 2026-09-05 decision: nodemailer SMTP transport used whenever `SMTP_HOST` is set (SendGrid demoted to fallback), bulk mailer that is dry-run by default with a 100/hour hard ceiling, per-recipient List-Unsubscribe + one-click headers, plain-text alternative, preview script, 24 offline tests. **Inert until the SMTP env vars exist** — nothing is sent by merging it. https://github.com/ericputnam/MHMFinds/pull/49
- **Your 10 minutes (still pending — 0 of 5 `SMTP_*` vars in Vercel production on 2026-09-07):** BigScoots panel → pick/create the sending mailbox (`news@musthavemods.com`) → Enable Site SMTP → Email Deliverability tab: SPF/DKIM/DMARC green → add `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` to Vercel Production and `.env.local`. Cass then runs a mail-tester ≥ 9/10 before issue #1 goes to the 20 subscribers.
- **Reply:** (silence = merges 09-08)

### 48 · Sage — PR #48 "server-render the homepage shell — h1, collection links, ItemList in first-byte HTML" — **merges 2026-09-08 unless you say "stop 48"**
- **What:** `app/page.tsx` becomes a force-dynamic server component wrapping the existing client page (ad anchors byte-identical), plus a server-rendered "Browse Sims 4 CC by collection" block (17 links) and ItemList JSON-LD. Served `/` HTML goes from 20,350 B / 0 `<h1>` / 0 `aside#secondary` to 51,188 B / 1 `<h1>` / 1 `aside#secondary` / 17 links. Highest-leverage fix in Sage's Google-collapse diagnosis: the homepage was the #1 click source before July 2025 and now sits at 512 clicks / position 42.2 over 28 days. https://github.com/ericputnam/MHMFinds/pull/48
- **Verified:** type-check 0, build 0, sidebar-sticky-health + mod-click-funnel 48/48, `next start` smoke of the PR build: hydration errors 0 on `/`, `/mods/[id]`, `/go/[id]`. The Vercel preview is behind SSO (no bypass secret), so the preview smoke was inconclusive; `deploy-verify.sh` runs on the custom domain after the merge.
- **Watch:** homepage session RPM ±5% for 7 days after merge (Rio). Rollback: `vercel rollback` or revert the PR.
- **Reply:** (silence = merges 09-08)

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

### Q3 · Confirm the newsletter can send (2026-09-01) — CLOSED 2026-09-05
- Operator decision: send through the BigScoots mailbox over SMTP, not SendGrid. See the Tier 1 item above. `NEWSLETTER_WEEKLY_ENABLED` stays unset until the SMTP transport is live and issue #1 has passed QA.

### Q4 · Patreon tier relaunch — package ready (Rio, 2026-09-04)
- **Package:** `reports/funnel/drafts/patreon-tier-relaunch-2026-09-04.md` (merged to main, PR #34). Tier copy + free→paid announcement draft are written; you paste into Patreon (~5 min).
- **Current:** 47 paid, $127/mo gross ($1×7, $3×40, $5×0), 5,201 free members.
- **Option A (conservative):** $3 Early Access / $5 CC Curator / $10 Sims Muse — target 90 patrons ≈ $475/mo gross (+$348).
- **Option B (simplified):** $5 / $10 only, grandfather existing — anchors higher, fewer tiers.
- **Ask:** reply "approve 4 option A" or "approve 4 option B" (or reject with reason). Perks reuse things already built/planned (early lookbooks, countdown skip, mod-topic votes) — no new infrastructure.
- **Risk:** low; pricing is operator-only (Tier 2). Rollback: revert tiers in Patreon dashboard.
- **Reply:** **approve 4 option A** (operator, 2026-09-07).
- **Status 2026-09-07 (Quinn):** site side done — the "skip the download countdown" perk is live for $3+ patrons (Q5 / PR #52, `PATREON_MEMBER_MIN_CENTS=300`), so the Option A copy is true on day one. **Left for you (~5 min, Patreon dashboard, operator-only):** (1) rename/re-price tiers to $3 Early Access / $5 CC Curator / $10 Sims Muse with the Option A copy in the package — one edit: the countdown line should read "Skip the download countdown on MustHaveMods.com (connect Patreon on any download page)"; retire the $1 tier for new joins (existing 7 grandfathered); (2) post the announcement draft in your voice. Rio reads paid count + gross from the scoreboard daily; keep if ≥ 60 paid and ≥ $200/mo by 2026-10-07.


### Q5 · Site membership via Patreon OAuth — "patrons skip the countdown" (Rio, 2026-09-07) — pairs with Q4
- **Package:** `reports/funnel/drafts/membership-patreon-oauth-2026-09-07.md` · PR #52 https://github.com/ericputnam/MHMFinds/pull/52 (open, green, **not merged** — auth = Tier 2).
- **What it does:** adds "Sign in with Patreon"; on sign-in asks Patreon if the person is an active patron of our campaign and marks the account a member; members get the `/go` download without the 10s countdown and a Member badge; non-members see one line "Patrons skip the wait · Connect Patreon · Become a patron". **No-op until `NEXT_PUBLIC_MEMBERSHIP_ENABLED=1`.** `/go` ad anchors untouched; sidebar-sticky tests 25/25.
- **Why:** it is the perk that makes the Q4 $3 tier true instead of "coming soon". No new billing stack. B2 target $200/mo by 09-30.
- **You do (≈10 min):** (1) Patreon portal → existing client → add redirect URI `https://musthavemods.com/api/auth/callback/patreon`; (2) Vercel Production env: `NEXT_PUBLIC_MEMBERSHIP_ENABLED=1`, `PATREON_CAMPAIGN_ID=<campaign id>`, `PATREON_MEMBER_MIN_CENTS=300` (A: $3+) or `500` (B: $5+); confirm `PATREON_CLIENT_ID`/`PATREON_CLIENT_SECRET` exist; (3) reply; Quinn merges + redeploys (flag is build-time).
- **Ad risk:** `/go/` ≈ 725 pageviews/28d × $15.60 RPM ≤ $11/mo for the whole page; members a fraction. Guardrail unaffected.
- **Rollback:** `NEXT_PUBLIC_MEMBERSHIP_ENABLED=0` + redeploy, or `vercel rollback`.
- **Reply:** **approve 5 A** (operator, 2026-09-07).
- **Status 2026-09-07 (Quinn):** SHIPPED — PR #52 merged as `f7820cd`, deploy-verify PASS (5xx/15m = 0, ad anchors + blog markers intact, ledger row 09:07). Vercel Production now has `NEXT_PUBLIC_MEMBERSHIP_ENABLED=1`, `PATREON_CAMPAIGN_ID=13460416`, `PATREON_MEMBER_MIN_CENTS=300`, `PATREON_CLIENT_ID`, `PATREON_CLIENT_SECRET` (the last two were *not* there before — the package assumed they were). Production `/api/auth/providers` lists `patreon`; a sign-in start redirects to Patreon's authorize page with `redirect_uri=https://musthavemods.com/api/auth/callback/patreon` and the three scopes. **One click left for you:** in the Patreon portal tab (Edit Client) the Redirect URIs field is pre-filled with the old WordPress URI plus the new callback, and App Category is set to Member Benefits — press **Update Client**. **Done 2026-09-07 (operator):** Patreon's client API confirms category `patron_benefits` and both redirect URIs saved; "Connect Patreon" is end-to-end live. Nothing left on this item. Read on 2026-10-07: ≥ 20 Patreon-linked accounts, ≥ 60 paid patrons, `/go` 7d RPM within −10%.

---

## Closed (last 30 days)

### Q2 · Grant read access so the team can measure Patreon and Pinterest (2026-09-01) — operator asked where the keys go (2026-09-05)
- **Where:** MHMFinds `.env.local` (local runs) **and** Vercel → Settings → Environment Variables → Production (server-side use). Never in git.
  - `PATREON_CREATOR_ACCESS_TOKEN` — from patreon.com/portal/registration/register-clients → the existing client → "Creator's Access Token". Read-only for the sync script.
  - `PINTEREST_ACCESS_TOKEN` is **not** the permanent answer (v5 access tokens die after 30 days — the operator's complaint). Permanent: the pinner's `~/java_projects/MHMUtils/config.json` already holds `client_id`, `client_secret`, `creator_refresh_token` and `pinterest_token_manager.py` refreshes the access token automatically before every run. MHMFinds should read Pinterest through that same manager (Pip: port `ensure_valid_token()` or shell out to it) instead of a hand-pasted token. The current refresh token has lapsed (401), so the operator runs `python3 pinterest_token_helper.py` once in `~/java_projects/MHMUtils` to re-authorize; after that no more pasting as long as the pinner runs at least monthly.
- **Reply:** keys will be added by the operator; Pip owns the token-manager port.
- **Status 2026-09-07:** Pinterest half done — Pip's PR #50 ports the token manager into the repo; `check-pinner.sh` token step went 401 → OK/VALID, refresh-token TTL 363 days, no more pasting. Still open: `PATREON_CREATOR_ACCESS_TOKEN` (also needed by Q5).
- **Closed 2026-09-07:** Patreon done too — `PATREON_CLIENT_ID/SECRET` + creator access/refresh tokens live in `.env.local` (mode 600) and refresh themselves via `scripts/_patreon-auth.ts`; `sync-patreon-subscribers.ts` dry run reads 5,324 members (free 5,065 / former 199 / active 46 / declined 15). `--apply` is deliberately not run — it waits on the consent gate + SMTP (T1 Cass). Creator tokens are not copied to Vercel (they rotate on refresh; `.env.local` is the single source).

