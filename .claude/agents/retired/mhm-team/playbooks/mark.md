# Mark's Playbook — Finance / CFO

I read this at the start of every run and append to it at the end. This is my
memory across sessions. Newest learnings at the top.

## Operating notes
- Read `charter.md` + `targets.json` first. My primary KPI: **monthly net take-home**.
- I own the **baseline**. Data sources (see my agent file's "Data acquisition SOP"):
  - **Revenue:** `mediavine-reporting` MCP (site 14318) — automated daily, no browser
    (`mv_metrics_summary`, `mv_earnings`, `mv_top_pages`, `mv_devices`, `mv_payments`).
    A daily digest is also at `reports/mediavine/YYYY-MM-DD.md`.
  - **Traffic & monetization health:** GA4 MCP (`run_report`).
  - **Infra costs:** repo data or operator confirmation — never invent.
- If a Mediavine tool returns `AUTH_EXPIRED`, the JWT lapsed (~yearly) — ask the
  operator to refresh it; don't guess revenue. Chrome read is a last-resort fallback.
- **Never invent precise costs.** Label estimates as assumptions and ask the operator.
- Express everything in net-take-home terms, not gross revenue.
- After establishing/refreshing the baseline, write it into `targets.json` and set
  weekly/monthly/yearly targets as % growth over baseline.

## Cost data sources (fill in as confirmed)
- Vercel: _unknown — needs operator/billing confirmation_
- Prisma Accelerate: _unknown — needs confirmation_
- OpenAI (embeddings): _unknown — needs confirmation_

## Learnings log
<!-- format: YYYY-MM-DD — what I measured → figure → verdict / action -->

### 2026-07-30 — Weekly review (Jul 23-29 vs Jul 16-22; MTD through Jul 30)

**Figures (clean window, anchored at last fully-finalized day 07-29, per the 07-12 SOP
refinement):** Revenue $1,527.47 vs $1,606.45 prior week (-4.9% WoW). GA4 sessions 96,317
vs 94,189 (+2.3% WoW) — traffic growing while revenue falls = pure RPM/CPM compression.
Mediavine's own session_rpm $18.70 vs $16.96 (+10.3%, looks like improvement) — but this is
the same reporting-lag artifact flagged 07-12: Mediavine's own sessions this window (81,686)
vs prior window (94,708) fell -13.7%, which doesn't match GA4's +2.3%, so Mediavine's own
RPM denominator is unreliable this close to "today." **True RPM (revenue ÷ GA4 sessions)
$15.86 vs $17.05 prior week = -7.0% WoW — the honest number.** Both readings show session
RPM well below the $24.00 target and below the $21.95 baseline.

**Monthly pace check (bigger finding):** July MTD (through day 30 of 31) = **$6,586.60**.
Annualized/full-month pace is tracking **~24% below June's confirmed $8,676.74** and ~26%
below the $8,859 monthly target. This is no longer consistent with the 07-02 mitigation
report's framing of "a two-day tail event" — it's a month-long shortfall.

**Exit-criteria finding (important — needs Max follow-up):** The 07-02 RPM-dip report set an
explicit exit criterion: "if CPM has not recovered to $0.95+ by ~Jul 21, that indicates a
second, non-seasonal factor — trigger a full code-level audit." This week's blended CPM was
still $0.80-0.87 (daily range, 07-23 to 07-28) — 9 days past that checkpoint with no recovery
and, as far as I can find, no documented follow-up audit. Flagging this explicitly rather than
re-asserting the "seasonal, will recover" thesis unchallenged — it needs re-validation with
fresh advertiser-level data (Trade Desk/Kargo/GumGum), which is Max's lane, not mine, but it's
a P&L-relevant miss so I'm surfacing it here too.

**Costs still 100% PENDING** — now 5+ weeks since baseline (06-22), asked explicitly 5 times
(06-22, 07-01, 07-02, 07-12, 07-30). Net take-home remains fundamentally uncomputable. This is
the single biggest open item blocking my primary KPI.

**Tooling gap found:** `npm run agent:forecast` failed with
`PrismaClientInitializationError: Can't reach database server at db.prisma.io:5432` — could
not produce the automated forecast this week. Used manual MTD run-rate instead. Worth a
one-line flag to whoever owns script/DB connectivity, since I rely on this tool every week.

**Self-grade: 🔴.** Ad-revenue proxy missed the weekly target by 25.3% ($1,527 vs $2,045) and
the primary KPI (net take-home) remains unmeasured for the sixth consecutive report. Both
signals point the same direction even though I can't fully verify the bottom-line number —
reporting it as missed rather than "pending" is the honest call per the accountability rules.

### 2026-07-12 — Weekly review (Jul 5-11 vs Jun 28-Jul 4)

**Figures:** Mediavine revenue $1,628.95 vs $1,628.38 prior week (+0.03%, flat). GA4
total sessions 95,981 vs 93,987 (+2.1%). True RPM (revenue ÷ GA4 sessions, the
apples-to-apples denominator) $16.97 vs $17.33 (-2.1%). Affiliate revenue: still $0
confirmed (no commission events; Impact.com sync 0/0 as of 2026-07-08 report). Costs:
still 100% unconfirmed — 20 days since baseline (06-22) and 10 days since explicitly
re-asked in the rpm-dip-mitigation report (07-02), operator action #5 remains open.

**Data-quality finding (important, recurring risk):** Mediavine's own rolling "last 7
days" session_rpm comparison (the one baked into the daily digest, e.g. "+14.2% WoW")
is an artifact of session-count reporting lagging revenue reporting by ~1 extra day.
On 2026-07-11, Mediavine had posted $261.57 of revenue but 0 sessions for that date
(not yet processed) — this drags the week's session denominator down and inflates the
RPM delta. Cross-checked against GA4 (which had full session data for the same day):
GA4-sessions RPM shows -2.1% WoW, not +14.2%. **Action for future weekly reviews:**
always cross-check the digest's WoW RPM claim against GA4 session totals for the same
window before repeating it — do not take the digest's rolling WoW delta at face value
when the most recent 1-2 days are involved.

**Verdict:** Flat week, not a fresh decline — sits inside the "documented seasonal dip,
proactively flagged" exception in the accountability ladder (§4 operating-model.md;
the dip was flagged 07-02). Below the PROPOSED weekly target ($2,045) by ~20%, but the
underlying CPM/Trade-Desk recovery signal turned positive for the first time since the
dip began (TTD WoW +0.2% on 07-11, +16.7% on 07-12, vs -40 to -60% throughout late
June/early July) — on track for the Jul 21 exit-criteria checkpoint, no escalation
warranted yet. **Cost confirmation is now the single biggest blocker to this role** —
net take-home cannot be computed at all without it; flagged to operator again this week.

### 2026-07-01 — New-monetization CFO input for Sterling (existential ask)

**Trigger:** Owner asked Sterling to recommend a NEW monetization channel beyond
Mediavine ads/affiliate. Mark provided the P&L snapshot + ROI ranking lens.

**Baseline spot-check (1 week after 2026-06-22 establishment):**
- Trailing 30d (2026-06-03 to 2026-07-02): revenue $8,220, session RPM $22.95 — both
  up modestly vs the $8,437.21/$21.95 baseline snapshot (baseline window was
  2026-05-23 to 2026-06-22, slightly different days, so not apples-to-apples decline —
  actually a positive drift once June's fuller month is counted).
- June calendar month (confirmed invoice from mv_payments, payout 2026-09-05):
  **$8,676.74**, RPM $22.69. This is the cleanest "most recent full month" figure.
- Verdict: baseline direction confirmed correct, revenue continuing to climb
  (Mar $4,811 → Apr $5,159 → May $7,451 → Jun $8,677, four straight months of growth).
  Did not force a full re-baseline (too soon since 2026-06-22 establishment) —
  instead flagged the drift inline in targets.json via `_refreshNote`.

**Affiliate revenue reality check:** `AffiliateOffer`/`AffiliateClick` models exist
(Impact.com links, admin dashboard at `/admin/monetization/affiliates`) but there is
**no revenue/commission field anywhere in the schema** — only `impressions`/`clicks`
counters. This confirms affiliate revenue is genuinely $0 confirmed in our system;
any commissions earned live entirely inside Impact.com's dashboard, off our books.
This is itself a finding: we're flying blind on affiliate ROI because we never
close the loop from click → commission. If affiliate is pursued as a growth lever,
step 1 is instrumenting actual commission data (Impact.com API/postback), not
just click-through counts.

**Premium membership de-risking:** `MONETIZATION_PLAN.md` (Nov 2025) is a full,
unbuilt Stripe subscription design (3 tiers, $4.99/$9.99). `isCreator`/`isPremium`
booleans exist on `User` but are 100% unused in app logic today (checked: no
gating code references them for feature-limiting). Recommended MVP test before
building any of it: a single `$4.99/mo` "ad-free + early access" tier gated by
a simple boolean flip (no click-limiting complexity from the original plan),
soft-launched via an on-site banner/email list only (no paid acquisition), run for
4-6 weeks. Kill/keep threshold: industry freemium conversion benchmarks for
content sites are ~1-3% (not 5-10% as MONETIZATION_PLAN.md assumed — that figure
is optimistic/no-source). At our ~217K monthly GA4 users, even 0.5% conversion
= ~1,000 subs × $4.99 = ~$5K/mo gross before Stripe fees — worth testing cheaply
before investing in the full click-metering system.

**ROI ranking delivered to Sterling (see chat output 2026-07-01 for full detail):**
1. Affiliate program expansion/instrumentation — highest ROI/effort because
   infrastructure already exists; the gap is closing the revenue-attribution loop,
   not building new surfaces.
2. Sponsored/direct placements — high $ per unit of effort at our traffic level but
   requires manual sales motion (not code) — flagged as Sterling/operator-owned,
   not a dev task.
3. Premium membership — highest long-term ceiling but highest effort/risk; needs
   the cheap MVP test above before committing engineering time.
4. New ad formats/video — likely belongs to Max's RPM lane, not a "new channel";
   ROI depends on Mediavine Universal Player adoption already in flight.
5. Email list monetization — blocked on the fact that no email capture funnel
   exists yet (checked: no newsletter signup found in this pass) — sequencing
   problem, not a ranking problem.

### 2026-06-22 — Baseline established (first ever)

**Data sources used:**
- Mediavine MCP (`client.metricsSummary`, `.devices`, `.payments`, `.healthChecks`) — live pull, all succeeded
- GA4 MCP (`run_report`, property 437117335) — live pull corroborated session count
- Repo docs scanned for costs: `MONETIZATION_PLAN.md`, `VERCEL_PRODUCTION_SETUP.md`, `docs/VERCEL_DEPLOYMENT.md` — zero confirmed cost figures found

**Key figures locked (2026-05-23 to 2026-06-22, 31 days):**
- Ad revenue: **$8,437.21** (Mediavine MCP, site 14318)
- Sessions (Mediavine): **384,413** | GA4 corroboration: **404,502** (~5% diff = expected bot/filter gap)
- Session RPM: **$21.95** | Monetizable session RPM: **$34.12**
- Monetizable sessions: **247,269** (64.3% of total)
- Overall viewability: **57.57%** | Desktop viewability: **45.9%** (NOTE: Mediavine OAE-managed — see correction below)
- Desktop revenue share: **96.3%** — site is almost entirely a desktop ad play
- Prior 30-day revenue (2026-04-23 to 2026-05-22): $6,543.10 → MoM growth +28.9%

**Confirmed payment history (from mv_payments):**
- Mar 2026 paid: $4,811.06 (paid 2026-06-05)
- Apr 2026 paid: $5,158.93 (paid 2026-07-05)
- May 2026 paid: $7,450.74 (paid 2026-08-05)
- Revenue accelerating: $4.8K → $5.2K → $7.5K in three consecutive months

**CORRECTED FINDING — sidebar sticky health was a MISREAD (2026-06-22, verified on live dashboard):**
- `sticky_sidebar_ads` = **14.2 is average sticky-sidebar ad impressions per session, goal 2.0** — NOT a 0-100 health score. The dashboard literally says: "achieved teal star status. Stay teal by maintaining a score of 2.0 or higher." We are at ~7x goal = EXCELLENT.
- There is **no sidebar regression** and **no fix was deployed tonight**. My earlier "14 vs 50, ~72% below target, fix deployed" claims were wrong — I (and the operator's initial read) confused an ad-density metric for a health score. Do not repeat this.
- Desktop viewability ~46% aggregate is **Mediavine OAE-managed** (Optimized Ad Experience enabled): the dashboard says "we optimize Desktop and Mobile Viewability and In-Content Ads for you… no action needed." Per-page values are mostly 57-82%. It is NOT a code-side lever.
- RPM is RISING (~+51% over trailing 67 days), not regressed. The path to $24+ session RPM is the existing trend + operator-side Mediavine levers (sidebar floor CPM review, Video/Universal Player), not a code fix.

**Costs status: ALL PENDING**
- Vercel: no billing figure in any repo doc — operator must confirm
- Prisma Accelerate: same
- OpenAI (embeddings): same
- Affiliate revenue: none sourced — operator must confirm if any exists
- Net take-home: CANNOT COMPUTE until costs confirmed. Revenue side locked.

**Targets proposed (pending operator approval):**
- Weekly ad revenue target: $2,045 (+5% over $1,948/wk baseline)
- Monthly ad revenue target: $8,859 (+5% over $8,437 baseline)
- Yearly ad revenue target: $121,493 (+20% over $101,244 annualized baseline)
- Max session RPM target: $24.00 (driven by the rising RPM trend + operator-side Mediavine levers; NOT a code "sidebar fix")

**SOP refinement learned:**
- `client.metricsSummary(start, end)` takes two positional args — NOT `(siteId, start, end)`. The config's siteId is already baked in at construction.
- `healthChecks(start, end)` (v2) `summary.sticky_sidebar_ads` is **ads-per-session (goal 2.0 = teal star), NOT a 0-100 health score**. Likewise `desktop_ads`/`mobile_ads` are ad counts and `goals` are count targets (sticky_sidebar 1.5-2.0, desktop_in_content 3, mobile_in_content 6). Do not read these as scores. The `healthCheckStatus()` (current_status) endpoint returns only ads_txt/privacy_policy status.
- Digest file at `reports/mediavine/YYYY-MM-DD.md` is useful for fast reading but uses a slightly different period than a custom date range pull. Always use direct MCP calls for precise baseline ranges.
- GA4 session counts are ~5% higher than Mediavine's — normal, not a discrepancy. Mediavine excludes bot/filtered traffic; GA4 counts all sessions.
- `MONETIZATION_PLAN.md` is a planning doc (Nov 2025, pre-launch) — the Stripe subscription system described is NOT yet live. No affiliate/subscription revenue is live as of this baseline.
