# Autonomy Tiers — what the team may do without asking

_Ratified 2026-09-01. Referenced by `charter.md`. Quinn enforces; every agent
tags each move with its tier in the digest._

The operator flips the whole model with one field in `targets.json`:
`"autonomy": "tiered"` (default) or `"autonomy": "ask"` (old behaviour: nothing
ships without approval). Agents read it every run.

## Tier 0 — Ship it, report it

No approval, no veto window. Ships on a feature branch after `npm run build`,
`npm run type-check`, the relevant tests, and the ad-guardrail tests pass.
Merged by Quinn via `gh pr merge --squash`, deployed by Vercel from `main`,
**verified by `scripts/agents/deploy-verify.sh --after-merge --sha <sha>`** (see
"Ship protocol" below). Listed in the digest under **Shipped** and **Changed today**.

| Category | Examples | Hard limits |
|---|---|---|
| Metadata & SEO plumbing | titles, metas, canonicals, OG, JSON-LD, breadcrumbs, `llms.txt`, sitemaps, robots directives for AI crawlers, internal links | never `noindex` a page with >50 GSC clicks/28d without Tier 1 |
| Catalog data | facet backfills, title cleanup, content-type fixes, dedupe, image fixes, collection membership | scripts must have `--dry-run` and be run dry first; ≤5,000 rows per run |
| Collection & facet pages | new pages from the `lib/collections.ts` registry, copy tweaks | must have ≥20 mods and be in the sitemap |
| Pins & auto-social | scheduling pins from published posts/collections via the existing pinner and `mhm-social-scheduler` | respect the ~3 pins/hour drain; no new boards without Tier 1 |
| Capture surfaces (non-ad zones) | newsletter form / Patreon link / account CTA in a page region that is not an ad anchor | `sidebar-sticky-health` tests pass; never inside `<aside id="secondary">` or between `.mv-ads` children |
| Drafts | newsletters, Patreon posts, creator outreach, sponsorship decks — written to `reports/funnel/drafts/` | drafts only; sending is Tier 1 or 2 |
| Analytics & reports | GA4/GSC/Mediavine/Pinterest pulls, DB reads, scoreboard | read-only |
| Tests & tooling | new tests, scripts, agent playbooks, this directory | — |

## Tier 1 — Ship with a 24-hour veto

Announced in the digest under **Shipping tomorrow unless you say stop**, with
the PR link. If the operator has not replied "stop N" by the next morning's run,
Quinn merges it. Tier 0 limits still apply.

| Category | Examples |
|---|---|
| New non-ad features & pages | a `/lookbooks` hub, creator profile pages, a `/premium` explainer, `/play` variants, RSS/JSON feeds, homepage SSR shell |
| Email sends to opted-in lists | weekly newsletter (`NEWSLETTER_WEEKLY_ENABLED`), launch emails, re-engagement to registered accounts |
| Pinterest structure | new boards, new pin formats (video/idea), cadence changes within Pinterest's limits |
| On-site experiments | A/B of CTA copy/placement, countdown length within 10–15s, membership *messaging* (not price) |
| Search-facing structural changes | consolidating thin pages, redirects on pages with <50 clicks/28d, hreflang |
| Creator outreach | sending the human-reviewed template to creators from `hello@`, first 20 per week |

## Tier 2 — Human decides (queued in `operator-queue.md`)

The agent prepares the **complete package** (PR open and green, copy written,
numbers attached, rollback stated) so approval is one word. Items older than
7 days get one smaller re-pitch, then are dropped and logged.

| Category | Why it stays human |
|---|---|
| Money: spend, pricing, payouts, refunds, contracts, new paid tools | it's his money |
| Mediavine ad layout, `functions.php`, sidebar, interstitial ad slots | ~$6–8K/mo depends on it; regression history |
| DB schema migrations, `lib/prisma.ts`, auth, env vars, Vercel config | outage risk |
| Public posts in the operator's or the writer's voice (Patreon, blog, X main account) | SD-1 / human voice |
| Creator agreements, revenue-share terms, anything legal or ToS-adjacent | liability |
| Deleting data, mass redirects (>20 URLs), `noindex` on trafficked pages | irreversibility |

## Never

Secrets in any output. Direct commits to `main` (everything goes through a PR
and the ship protocol, even one-line report commits). SSH edits to
`functions.php`. Merging while the circuit breaker is red. Fake scarcity, fake
countdowns, fake reviews. Buying traffic, followers, or backlinks. Scraping
sources that 403 us.

## The operator's three rules (2026-09-01) and how they are enforced

The operator granted the team commit-and-merge rights to `main` on three
conditions. They are enforced by scripts, not by memory:

1. **Always check whether you broke something** (Vercel during deploy, the
   WordPress blog) and roll back / restore if you did → `deploy-verify.sh`.
2. **A significant RPM/revenue hit is existential; fix it fast** →
   `revenue-guardrail.ts` circuit breaker + automatic rollback.
3. **Full autonomy for the daily pulse, but make what you did obvious** →
   `reports/funnel/changelog.md` ledger, `reports/funnel/incidents/`, and the
   digest's "Changed today" section.

### Ship protocol (every merge, every tier, no exceptions)

1. Branch from `origin/main` in the runner's worktree: `funnel/<agent>/<slug>`.
2. Checks, all green: `npm run build`, `npm run type-check`,
   `npx vitest run __tests__/unit/sidebar-sticky-health.test.ts` (any change under
   `app/`, `components/`, `middleware.ts`), the tests for what you touched,
   `npm run security:check-admin-auth` if `app/api/admin` changed,
   `bash -n` for shell scripts. **`type-check` is never optional, even for a
   "scripts-only" or "docs-only" PR**: `next build` on Vercel type-checks every
   `.ts` under `scripts/` too (tsconfig `include: **/*.ts`), so a type error in a
   standalone script fails the production build (PR #19, 2026-09-02).
3. PR body: `Tier:` / `Stage:` / `Metric:` / `Before:` / `Read on:` /
   `Keep if:` / `Rollback:` lines. Ends with the Claude Code footer.
4. `gh pr merge --squash --delete-branch`, then read the merge sha
   (`git fetch origin main && git rev-parse origin/main`).
5. **`./scripts/agents/deploy-verify.sh --after-merge --sha <sha> --label "<agent>: PR #N <title>"`**.
   It waits for the Vercel build, renders the key pages in headless Chromium,
   checks the Mediavine loader + `aside#secondary` + `.mv-ads`, runs
   `check-blog-sidebar.sh`, and counts 5xx. Exit 0 = shipped. Exit 2 = it
   already rolled production back; read the incident file and fix forward on a
   new PR. Exit 3 = still broken after rollback; stop everything and lead the
   digest with it.
6. The ledger row it writes to `reports/funnel/changelog.md` *is* the record
   of the change. Quote it in the digest under **Changed today**. A merge
   without a ledger row did not happen.

Changes with no production surface (reports, playbooks, queue files) still go
through steps 1–4 and 6 (`deploy-verify` still runs: Vercel builds every merge,
and a broken build is a failure the operator must see).

### Rollback authority — always granted

Any agent may, at any time and without asking, run
`./scripts/agents/deploy-verify.sh --rollback [--to <deployment-url>] --label "<why>"`
or `./scripts/staging/push-blog-functions-prod.sh --yes` (restores
`functions.php` from git — the runner's copy is `origin/main`). Rolling back
is never a Tier 2 action. Rolling *forward* a Tier 2 surface still is.
Restoring a BigScoots host backup (full WordPress restore) is operator-only;
if `functions.php` from git does not fix the blog, write the incident and stop.

### Circuit breaker (`scripts/agents/revenue-guardrail.ts`, first thing every morning)

Compares the last finalized Mediavine day and the trailing 3 days with the same
weekdays of the previous 4 weeks.

| Status | Condition | What happens |
|---|---|---|
| 🟢 green | revenue ≥ 90 % of expected, health ok | normal day |
| 🟡 yellow | revenue < 90 % (day or 3-day) | **no Tier 1 merges today**; Tier 0 only; Rio investigates and writes one line in the digest |
| 🔴 red-rpm | RPM < 85 % *and* revenue < 80 % | if a production deploy landed inside the window: **automatic rollback** to the last deploy before it (runner does this before Quinn starts), incident file, digest leads with it, no merges until Rio closes it. If nothing deployed: investigate (Mediavine-side), no merges of anything touching ad pages |
| 🔴 red-health | any Mediavine health field not ok | Rio's only move is diagnosing it; `check-blog-sidebar.sh` failure → `functions.php` restore |
| 🔴 red-traffic | sessions < 80 % with RPM intact | Pip's problem (Pinterest/pinner), not a rollback trigger |

Manual: `npx tsx scripts/agents/revenue-guardrail.ts --md reports/funnel/guardrail-YYYY-MM-DD.md`.
`FUNNEL_AUTO_ROLLBACK=0` disables the automatic rollback (report only).

## How the runner enforces this

`scripts/agents/run-funnel-daily.sh` creates a fresh worktree from
`origin/main`, runs the scoreboard, then runs Quinn with this file in context.
Quinn spawns the five agents; each agent's move ends in one of:

- `SHIPPED (T0): <PR url>` — merged after checks.
- `QUEUED-T1: <PR url> — merges <date> unless stopped` — appended to `operator-queue.md` and the digest.
- `QUEUED-T2: <package path>` — appended to `operator-queue.md`.
- `NO MOVE: <reason + what would unblock it>` — allowed, but two in a row on the same agent is a red flag Quinn reports.

Nothing merges whose PR body lacks the `Tier:` line, the before-snapshot, and
the keep/kill rule.
