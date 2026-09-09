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
- **Status 2026-09-08 (Cass):** the transport is on main (PR #49, `949c391`) and the two emails are written and QA'd against live URLs (PR #59: `reports/funnel/drafts/newsletter-issue-01-2026-09-08.md`, `re-permission-email-2026-09-08.md`). Still **0 of 5 `SMTP_*` vars** in Vercel Production. Your ~10 minutes in the BigScoots panel (pick `news@musthavemods.com` → Enable Site SMTP → SPF/DKIM/DMARC green → 5 vars into Vercel Production) is the only thing between 20 people who signed up months ago and the first email they have ever received from us.

### T1 · Pip — revive the stranded pin inventory, +10 pins/day for 14 days (heads-up; PR opens 2026-09-09, 24h veto runs from then)
- **Finding (PR #60, 2026-09-08):** the poster only reads queue rows whose `Post Date` is within the last 14 days; the newest unposted row is dated 2026-05-12, so all 1,879 "backlog" pins are unreachable and the ~19 pins/day come only from new blog posts — there is no buffer. Every one of the 1,879 carries an image that has never been posted (0 duplicates against the posted set), with board, copy and destination URL already filled in.
- **Move:** re-date the newest ~140 (2026-02 → 2026-05) forward with a `--dry-run`-first script at 10/day, lifting cadence from ~19/day to ~29/day (+53%), inside Pinterest norms. Tier 1 because it is a cadence change.
- **Metric:** Pinterest sessions 7d (baseline 58,246, 2026-08-31→09-06). Read 2026-09-25. Keep if Pinterest sessions 7d beat the taper trend by ≥3 pts with no spam signal. Rollback: set the re-dated rows back and stop the script.
- **Reply:** (say "stop pip-revive" to block it before the PR opens)


## Tier 2 — needs your decision

### Q1 · Merge `feature/premium-intent-test` into `main` (2026-09-01)
- **Why:** `main` has been stale since 2026-07-31. Vercel production is 16 days old. The branch holds 15 commits plus ~210 uncommitted files (newsletter admin, forgot/reset password, `/play`, first-party mods, facets v2, the premium-intent banner). The team ships from `origin/main`, so until this lands every Tier 0 move is built on code the site isn't running.
- **Ask:** commit the working tree on the branch (Claude can stage and write the commit message on request), open the PR, review, merge. Note the `EmailSubscriber.unsubscribedAt` schema drift: production does not have that column, so `npm run db:deploy` (or `db:push`) must run before the merge deploys.
- **Risk:** medium (schema + auth changes). Rollback: `vercel rollback <previous deployment>`.
- **Re-pitch 2026-09-08 (Quinn, day 7 — smaller ask):** the whole-branch merge has sat 7 days. Smaller version: pick **one** piece and Quinn cherry-picks it onto a fresh branch from `origin/main` for the normal ship protocol — (a) forgot/reset password (auth → still Tier 2, one PR), or (b) `/play` (a page, Tier 1). Reply "approve 1 a" or "approve 1 b"; anything else and this item is dropped and logged on 2026-09-15 per the 7-day rule. Note: Cass found today that production has no `EmailSubscriber.unsubscribedAt` / consent column at all, so the schema drift in this branch is still real.
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
- **Decided 2026-09-08 (Quinn, operator delegated the call):** STAGED — step 1 only. Members-API baseline: 47 active vs 225 former, 10–16 cancels/month, median tenure 1.8 months → retention is the problem, not the ladder. Step 1: countdown-skip perk added to the existing $3 tier (name/price unchanged), thank-you post + community-chat message to members; $1 tier kept published until the operator talks to Felister (her idea); the "rebuilt tiers" announcement is retired. Renames + $10 tier wait for the **2026-09-22 read** (`scripts/agents/patreon-relaunch-read.ts`: joins ≥ 17/mo pace AND ≥ 1/3 of paid connected on site; revert copy if cancels > 16/mo). **Done 2026-09-08:** $3 tier copy live (verified via tiers API); thank-you posted + sent in community chat; $1 tier untouched pending Felister.
- **Status 2026-09-08 (Rio):** approved 09-07 (option A) but the Patreon dashboard still shows $1/$3/$5 tiers (46 paid, $126/mo gross, 5,287 free). The ladder cannot be measured until the tiers are applied; no code change involved.


### Q5 · Site membership via Patreon OAuth — "patrons skip the countdown" (Rio, 2026-09-07) — pairs with Q4
- **Package:** `reports/funnel/drafts/membership-patreon-oauth-2026-09-07.md` · PR #52 https://github.com/ericputnam/MHMFinds/pull/52 (open, green, **not merged** — auth = Tier 2).
- **What it does:** adds "Sign in with Patreon"; on sign-in asks Patreon if the person is an active patron of our campaign and marks the account a member; members get the `/go` download without the 10s countdown and a Member badge; non-members see one line "Patrons skip the wait · Connect Patreon · Become a patron". **No-op until `NEXT_PUBLIC_MEMBERSHIP_ENABLED=1`.** `/go` ad anchors untouched; sidebar-sticky tests 25/25.
- **Why:** it is the perk that makes the Q4 $3 tier true instead of "coming soon". No new billing stack. B2 target $200/mo by 09-30.
- **You do (≈10 min):** (1) Patreon portal → existing client → add redirect URI `https://musthavemods.com/api/auth/callback/patreon`; (2) Vercel Production env: `NEXT_PUBLIC_MEMBERSHIP_ENABLED=1`, `PATREON_CAMPAIGN_ID=<campaign id>`, `PATREON_MEMBER_MIN_CENTS=300` (A: $3+) or `500` (B: $5+); confirm `PATREON_CLIENT_ID`/`PATREON_CLIENT_SECRET` exist; (3) reply; Quinn merges + redeploys (flag is build-time).
- **Ad risk:** `/go/` ≈ 725 pageviews/28d × $15.60 RPM ≤ $11/mo for the whole page; members a fraction. Guardrail unaffected.
- **Rollback:** `NEXT_PUBLIC_MEMBERSHIP_ENABLED=0` + redeploy, or `vercel rollback`.
- **Reply:** **approve 5 A** (operator, 2026-09-07).
- **Status 2026-09-07 (Quinn):** SHIPPED — PR #52 merged as `f7820cd`, deploy-verify PASS (5xx/15m = 0, ad anchors + blog markers intact, ledger row 09:07). Vercel Production now has `NEXT_PUBLIC_MEMBERSHIP_ENABLED=1`, `PATREON_CAMPAIGN_ID=13460416`, `PATREON_MEMBER_MIN_CENTS=300`, `PATREON_CLIENT_ID`, `PATREON_CLIENT_SECRET` (the last two were *not* there before — the package assumed they were). Production `/api/auth/providers` lists `patreon`; a sign-in start redirects to Patreon's authorize page with `redirect_uri=https://musthavemods.com/api/auth/callback/patreon` and the three scopes. **One click left for you:** in the Patreon portal tab (Edit Client) the Redirect URIs field is pre-filled with the old WordPress URI plus the new callback, and App Category is set to Member Benefits — press **Update Client**. **Done 2026-09-07 (operator):** Patreon's client API confirms category `patron_benefits` and both redirect URIs saved; "Connect Patreon" is end-to-end live. Nothing left on this item. Read on 2026-10-07: ≥ 20 Patreon-linked accounts, ≥ 60 paid patrons, `/go` 7d RPM within −10%.
- **Status 2026-09-08 (Rio, E24):** visitors saw none of it for ~22h — the client read the flag via `env[MEMBERSHIP_FLAG]`, which Next.js does not inline, so `/go` never rendered the CTA/countdown skip. Fixed forward in PR #62 (`032543e`, merged 07:07, verified live 07:09 with the CTA, Connect button and patron link rendering on production `/go`; ad anchors intact). Baseline for the read is 0 `patreon_click` / 0 `member_skip_countdown` / 0 Patreon-linked accounts as of 09-08. Rollback: `NEXT_PUBLIC_MEMBERSHIP_ENABLED=0` + redeploy.

### Q6 · Un-consolidate the pregnancy-mods + y2k-cc legacy pairs (Sage, E21, 2026-09-08) — PR #63 open, green, **not merged**
- **Why:** Google refused the collection-page canonical for both pairs and indexed the blog-subdomain copy instead. Today the strong URL 308s to a facet that does not rank, while `blog.musthavemods.com/sims-4-pregnancy-mods/` takes 93 clicks/28d at pos 10.95 (facet: 2 clicks, pos 33.0); y2k: blog 20 / pos 10.2 vs facet 4 / pos 29.8 (GSC 2026-08-09→09-05). Identical to the 2026-07 body-presets revert (`1be3289`), applied the same way. https://github.com/ericputnam/MHMFinds/pull/63
- **Changes:** `vercel.json` (drop 4 redirects), `functions.php` (2 slugs consolidated map → crosslink map), sitemap-blog-posts route (re-include), `lib/collections.ts` (reciprocal blogUrl + browse-intent titles), canonical test (2 new guards that assert all three layers agree). php -l, type-check, build, sidebar test 25/25, canonical test 18/18 all green. Local `next start`: both apex URLs 308 → 200 proxied article with `aside#secondary` present.
- **Order of operations after "approve 6":** (1) Quinn merges #63 via the ship protocol + deploy-verify; (2) Quinn runs `./scripts/staging/push-blog-functions-prod.sh` (interactive; CRITICAL_MARKERS all present in the local file) — until this step the live articles serve 200 but still carry the facet canonical; (3) `./scripts/agents/check-blog-sidebar.sh` immediately after; (4) Sage requests indexing in GSC on the two apex article URLs and both facets. Quinn will also add `mhm_consolidated_post_map|legacy canonical map` to `CRITICAL_MARKERS` in both push scripts in the same PR.
- **Trade-off to decide:** 687 Pinterest sessions/7d currently land on the pregnancy facet (mostly old pins to the redirected URL) and will land on the WP article instead. Article has the Mediavine single-post layout ($10–23 RPM fact base); facet RPM per page: source unavailable. Cass's collection-page capture block loses those sessions. Rio watches pregnancy-facet + article RPM for 7 days.
- **Read:** 2026-10-06 — pair clicks 28d (baseline pregnancy 95, y2k 24) and Google-selected canonical via `index_inspect`. Keep if the apex article is the selected canonical AND pregnancy pair ≥95/28d with neither facet below baseline.
- **Rollback:** `git revert` the squash + `push-blog-functions-prod.sh --yes` from git. Two steps, both idempotent, no flag.
- **Separate ticket (not in this PR):** GA4 7d `hostName` blog.musthavemods.com = 19,730 sessions (22% of all; 17,276 from Pinterest because the pinner posts blog.* URLs). Not fixable in `functions.php` (BigScoots cache leaks any direct-only 301/noindex to the apex). Pip: post apex URLs (T0). Operator: BigScoots nginx host-level 301 blog.* → apex for non-proxied requests (in the ideas inbox).
- **Reply:**

---

## Closed (last 30 days)

### 48 · Sage — PR #48 homepage SSR shell — **SHIPPED 2026-09-08** (E18)
- Veto window closed with no "stop 48". Merged as `d67cc51` at 07:03, deploy-verify PASS (5xx/15m = 0, ad anchors + blog markers intact). Served `/` HTML now carries the `<h1>`, 17 collection links and ItemList JSON-LD in the first byte. Rio reads homepage RPM ±5% against the MV page RPM baseline $9.88 (08-31→09-06) on 2026-09-15; Sage reads GSC homepage clicks/position on 2026-10-05.

### 49 · Cass — PR #49 newsletter over BigScoots SMTP — **SHIPPED 2026-09-08** (E16)
- Veto window closed with no "stop 49". Merged as `949c391` at 07:10, deploy-verify PASS. Inert until the 5 `SMTP_*` vars exist in Vercel Production (still 0 of 5) — see the Tier 1 SMTP item above for your 10 minutes.

### Q2 · Grant read access so the team can measure Patreon and Pinterest (2026-09-01) — operator asked where the keys go (2026-09-05)
- **Where:** MHMFinds `.env.local` (local runs) **and** Vercel → Settings → Environment Variables → Production (server-side use). Never in git.
  - `PATREON_CREATOR_ACCESS_TOKEN` — from patreon.com/portal/registration/register-clients → the existing client → "Creator's Access Token". Read-only for the sync script.
  - `PINTEREST_ACCESS_TOKEN` is **not** the permanent answer (v5 access tokens die after 30 days — the operator's complaint). Permanent: the pinner's `~/java_projects/MHMUtils/config.json` already holds `client_id`, `client_secret`, `creator_refresh_token` and `pinterest_token_manager.py` refreshes the access token automatically before every run. MHMFinds should read Pinterest through that same manager (Pip: port `ensure_valid_token()` or shell out to it) instead of a hand-pasted token. The current refresh token has lapsed (401), so the operator runs `python3 pinterest_token_helper.py` once in `~/java_projects/MHMUtils` to re-authorize; after that no more pasting as long as the pinner runs at least monthly.
- **Reply:** keys will be added by the operator; Pip owns the token-manager port.
- **Status 2026-09-07:** Pinterest half done — Pip's PR #50 ports the token manager into the repo; `check-pinner.sh` token step went 401 → OK/VALID, refresh-token TTL 363 days, no more pasting. Still open: `PATREON_CREATOR_ACCESS_TOKEN` (also needed by Q5).
- **Closed 2026-09-07:** Patreon done too — `PATREON_CLIENT_ID/SECRET` + creator access/refresh tokens live in `.env.local` (mode 600) and refresh themselves via `scripts/_patreon-auth.ts`; `sync-patreon-subscribers.ts` dry run reads 5,324 members (free 5,065 / former 199 / active 46 / declined 15). `--apply` is deliberately not run — it waits on the consent gate + SMTP (T1 Cass). Creator tokens are not copied to Vercel (they rotate on refresh; `.env.local` is the single source).

