# Site Membership via Patreon OAuth — Q5 Package (pairs with Q4)

**Status: QUEUED-T2** — auth + env vars are operator-only. PR is open and green, **not merged**.
**Written:** 2026-09-07 by Rio
**Bet:** B2 — Patreon relaunch + site membership. Target non-ad revenue $200/mo by 2026-09-30, $450 by 2026-10-31.
**Branch / PR:** `funnel/rio/membership-patreon-oauth` (PR link in operator-queue Q5)

---

## One paragraph

"Sign in with Patreon" is added to the site. When a patron signs in, we ask Patreon whether they are an active patron of our campaign and, if so, mark their account a member. Members get the `/go` download without the 10-second countdown and a small Member badge; everyone else sees one line under the countdown: "Patrons skip the wait · Connect Patreon · Become a patron". **Nothing changes on the site until `NEXT_PUBLIC_MEMBERSHIP_ENABLED=1` is set** — with the flag off, no provider is registered, the countdown is untouched, and no badge renders. This is the perk that makes the Q4 $3 "Early Access" tier ("skip the download countdown on the site") true on day one instead of "coming soon".

## Why this is the highest-value non-ad move available

- Q4 (tier copy) has been waiting since 09-04. Its strongest concrete perk depends on this build. Approving Q4 + Q5 together is one decision, not two.
- No new billing stack: Patreon is the wallet, Stripe stays unused. `PATREON_CLIENT_ID` / `PATREON_CLIENT_SECRET` already exist in the env.
- The perk costs almost nothing in ads (see "Ad guardrail" below) and rewards exactly the people we want more of.

## What the PR changes (no-op until the flag is on)

| File | Change |
|---|---|
| `lib/membership.ts` (new) | Flag/config helpers, Patreon v2 identity parsing (pure, unit-tested), `fetchPatreonMembership()` (server), pledge-floor knob `qualifiesForMembership()` |
| `lib/authOptions.ts` | Registers `PatreonProvider` **only** when `isPatreonProviderConfigured()`; in the `jwt` callback on a Patreon sign-in, checks membership and persists `User.isPremium`; a Patreon API failure leaves status untouched and never blocks sign-in |
| `app/go/[modId]/GoClient.tsx` | Members: countdown skipped, "Member perk: no countdown" line, GA4 `member_skip_countdown`. Non-members (flag on): one-line CTA with GA4 `patreon_click` (`source=go-member-cta-connect` / `go-member-cta-join`). Layout, `mv-ads` wrapper and empty `aside#secondary` untouched |
| `components/Navbar.tsx` | Crown icon + "Member" line in the user menu when flag on and `isPremium` |
| `env.example`, `.env.example` | The three new names, placeholders only |
| `__tests__/unit/membership.test.ts` (new) | 16 tests: flag off by default, provider gated, campaign lock, patron status, pledge floor, malformed input, and source-level guards that the skip stays gated and `/go` keeps its ad anchors |

No schema change (`User.isPremium` already exists). No `lib/prisma.ts` change. No ad layout change. No `functions.php`.

## Env names the operator must add (values never in git)

| Name | Where | Value |
|---|---|---|
| `NEXT_PUBLIC_MEMBERSHIP_ENABLED` | Vercel Production + `.env.local` | `1` to turn on. **Build-time** (`NEXT_PUBLIC_`), so flipping it needs a redeploy — Quinn does this after merge |
| `PATREON_CLIENT_ID` | already present | unchanged |
| `PATREON_CLIENT_SECRET` | already present | unchanged |
| `PATREON_CAMPAIGN_ID` | Vercel Production + `.env.local` | your campaign id — locks "member" to patrons of *our* page. Strongly recommended; without it any active Patreon patron of anyone would qualify |
| `PATREON_MEMBER_MIN_CENTS` | Vercel Production + `.env.local` | the pricing knob: `300` = $3 tier and up (Option A), `500` = $5 and up (Option B), unset = any active patron |

Also in the Patreon portal (patreon.com/portal/registration/register-clients → the existing client): add the redirect URI `https://musthavemods.com/api/auth/callback/patreon` (and the `www.` form if `NEXTAUTH_URL` uses it). Scopes requested: `identity identity[email] identity.memberships`.

## Pricing options (operator decision — Tier 2)

| | Option A | Option B |
|---|---|---|
| Who is a site member | any active patron pledging ≥ $3 (`PATREON_MEMBER_MIN_CENTS=300`) | patrons pledging ≥ $5 (`=500`) |
| Fits Q4 | Option A ladder ($3 Early Access carries the countdown perk) | Option B ladder ($5 CC Curator carries it) |
| Today's patrons who qualify on day one | 40 ($3) + 0 ($5) = 40 of 47 | 0 of 47 (the $5 tier is empty) |
| Upside | 5,268 free members see a concrete reason to pay $3; low friction | anchors higher; fewer, higher-value members |
| Risk | perk given to existing $3 patrons "for free" (they already pay) | nobody benefits until the relaunch converts people to $5 |

Recommendation: **A**, paired with Q4 Option A. It makes 40 people members the day it ships, which is also the best possible test of whether the perk gets used (GA4 `member_skip_countdown`).

## Revenue math (sources named)

- Baseline non-ad: **$127/mo gross**, 47 paid ($1×7, $3×40, $5×0), 5,268 free — scoreboard 2026-09-07 (public Patreon page).
- Q4 Option A target: 90 patrons ≈ **$475/mo gross** (+$348) — `reports/funnel/drafts/patreon-tier-relaunch-2026-09-04.md`.
- `targets.json` B2 basis: membership via Patreon OAuth 60 members × $3–5 ≈ $250/mo. This build is what that line assumed.
- Direct incremental revenue of Q5 alone is **$0** (Patreon collects; we don't add a price). Its value is conversion: it turns the $3 tier's headline perk from a promise into a feature. Read it by paid-count and `member_skip_countdown` usage, not by a separate revenue line.

## Ad guardrail

- `/go/` had **725 pageviews in the 28 days 2026-08-09 → 09-05** (GA4 property 437117335, `pagePathPlusQueryString` begins with `/go/`). At the 28d session RPM of $15.60 (scoreboard 2026-09-07) the whole page is worth ≤ **$11.31/mo** even if it earned site-average RPM; the fact base (09-01) shows `/go` is not in the top-15 revenue pages. Members are a subset of those views, and the page still renders every ad anchor for them — only the dwell before "Continue" shortens.
- Layout unchanged: `sidebar-sticky-health` 25/25 pass; `mv-ads` still has exactly two children; `aside#secondary` still empty.
- Watch after flip: 7-day `/go` page RPM vs the 7 days before (Mediavine `mv_top_pages` once the MCP is back), plus the daily guardrail.

## Rollback

`NEXT_PUBLIC_MEMBERSHIP_ENABLED=0` + redeploy: provider disappears, countdown returns, badges vanish. No data migration to undo (`isPremium` rows set for patrons can stay; nothing reads them while the flag is off). Or `vercel rollback <previous READY deploy>`.

## Measurement

- **Before (2026-09-07):** 47 paid / $127 gross / 5,268 free; `member_skip_countdown` events 0; `patreon_click` from `/go` 0; 0 Patreon-linked accounts (DB: all 1,533 linked accounts are `credentials`).
- **Read on:** 2026-10-07 (30 days after the flag flips; if unapproved by 09-14 it gets one smaller re-pitch per autonomy.md).
- **Keep if:** ≥ 20 Patreon-linked accounts and paid patrons ≥ 60 by the read date (with Q4 live); `/go` 7d page RPM within −10% of the prior 7d.
- **Kill if:** < 5 Patreon-linked accounts after 30 days with Q4 live (the perk is not wanted) — remove the CTA line, keep the provider.

## Known limitations (honest)

1. Member status is checked at Patreon sign-in only and lives in the 30-day JWT. A patron who cancels keeps perks until their session expires or they sign in with Patreon again. A monthly re-verify job (needs `PATREON_CREATOR_ACCESS_TOKEN`, Q2) is the follow-up.
2. `NEXT_PUBLIC_` flag is inlined at build: set the var, then redeploy.
3. Finding while building: **Google and Discord sign-in have produced 0 linked accounts ever** (DB `Account.provider` groupBy: credentials 1,533, nothing else). The `signIn` callback pre-creates the user by email before the adapter links the OAuth account, and neither provider sets `allowDangerousEmailAccountLinking`, so a first-time Google/Discord login should hit `OAuthAccountNotLinked`. The Patreon provider in this PR sets that flag (Patreon verifies emails) and works with the existing callback. Fixing Google/Discord is a separate Tier 2 auth item — not touched here.

---

## For Quinn — text to apply (Rio's Edit on `.claude/…` was denied by the permission system this run)

### operator-queue.md → under "Tier 2 — needs your decision", after Q4

```
### Q5 · Site membership via Patreon OAuth — "patrons skip the countdown" (Rio, 2026-09-07) — pairs with Q4
- **Package:** `reports/funnel/drafts/membership-patreon-oauth-2026-09-07.md` · PR: funnel/rio/membership-patreon-oauth (open, green, **not merged** — auth = Tier 2).
- **What it does:** adds "Sign in with Patreon"; on sign-in asks Patreon if the person is an active patron of our campaign and marks the account a member; members get the `/go` download without the 10s countdown and a Member badge; non-members see one line "Patrons skip the wait · Connect Patreon · Become a patron". **No-op until `NEXT_PUBLIC_MEMBERSHIP_ENABLED=1`.** `/go` ad anchors untouched; sidebar-sticky tests 25/25.
- **Why:** it is the perk that makes the Q4 $3 tier true instead of "coming soon". No new billing stack. B2 target $200/mo by 09-30.
- **You do (≈10 min):** (1) Patreon portal → existing client → add redirect URI `https://musthavemods.com/api/auth/callback/patreon`; (2) Vercel Production env: `NEXT_PUBLIC_MEMBERSHIP_ENABLED=1`, `PATREON_CAMPAIGN_ID=<campaign id>`, `PATREON_MEMBER_MIN_CENTS=300` (A: $3+) or `500` (B: $5+); confirm `PATREON_CLIENT_ID`/`PATREON_CLIENT_SECRET` exist; (3) reply; Quinn merges + redeploys (flag is build-time).
- **Ad risk:** `/go/` ≈ 725 pageviews/28d × $15.60 RPM ≤ $11/mo for the whole page; members a fraction. Guardrail unaffected.
- **Rollback:** `NEXT_PUBLIC_MEMBERSHIP_ENABLED=0` + redeploy, or `vercel rollback`.
- **Reply:** "approve 5 A" / "approve 5 B" / reject with reason.
```

### playbooks/rio.md → newest entry, above 2026-09-01

```
## 2026-09-07
- Tried: membership via Patreon OAuth as a ready-to-approve T2 package (branch funnel/rio/membership-patreon-oauth, PR open, not merged): Patreon provider in NextAuth + /go countdown skip + member badge, all behind NEXT_PUBLIC_MEMBERSHIP_ENABLED; pricing knob PATREON_MEMBER_MIN_CENTS. Package: reports/funnel/drafts/membership-patreon-oauth-2026-09-07.md → operator-queue Q5.
- Before → after: non-ad $127/mo gross (47 paid: $1×7, $3×40, $5×0; 5,268 free) → target $200/mo by 09-30 (Q4+Q5: relaunch A targets 90 patrons ≈ $475/mo). Ad-loss bound: /go/ 725 GA4 pageviews/28d × $15.60 = ≤ $11.31/mo for the whole page.
- Guardrail, first green since 09-02: 09-05 $269.49 (+12.0% same-weekday), RPM $18.05 (+1.8%), sessions +10.1%, 3-day +1.6%. 28d $5,628.24 (−7.6%) is the E9/E13 mechanical roll-through and is improving: −10.4% (09-04) → −9.7% (09-05) → −7.6% (09-07). E5 counter 0/5 (weekday RPM 09-03 $14.64, 09-04 ≈ $16.30 derived from the guardrail 3-day window, 09-05 $18.05). Mediavine MCP unavailable; figures from guardrail/scoreboard JSON + GA4.
- Finding: 0 Google/Discord-linked accounts ever (all 1,533 are credentials) — signIn pre-create + no allowDangerousEmailAccountLinking → OAuthAccountNotLinked. Separate T2.
- Verdict: MORE DATA (read on 2026-10-07, 30 days after the flag flips).
- Next time: pitch Q4 and Q5 as one decision.
```

_Rio, Product & Revenue — 2026-09-07_
