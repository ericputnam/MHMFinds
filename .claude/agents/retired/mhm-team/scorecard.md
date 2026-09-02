# MHM Team Scorecard

Time series of **actuals vs. targets**. Sterling appends one block per weekly review.
This is how the team measures itself over time — newest entries at the top.

Grading: 🟢 at/above target · 🟡 within 10% below · 🔴 more than 10% below.

---

## Template (copy for each weekly review)

```markdown
## Week of <YYYY-MM-DD>

**Team grade:** 🟢/🟡/🔴 — net take-home $X vs target $Y

| Owner | KPI | Target | Actual | Grade | Note |
|---|---|---|---|---|---|
| Max | session-RPM | $… | $… | 🟢/🟡/🔴 | |
| Tim | organic sessions | … | … | 🟢/🟡/🔴 | |
| Mark | net take-home | $… | $… | 🟢/🟡/🔴 | |
| Sterling | high-ROI actions shipped | ≥3/mo | … | 🟢/🟡/🔴 | |

**What moved the number this week:** …
**Biggest risk / red flag:** …
**Top 3 actions next week (ranked by $):** 1) … 2) … 3) …
```

---

<!-- Weekly entries below. Baseline must be set in targets.json first. -->

## Week of 2026-07-30

**Team grade:** 🔴 — ad revenue (net take-home proxy) $1,527.47 vs target $2,045 (-25.3%); net take-home itself still unmeasurable (costs PENDING 5+ weeks)

| Owner | KPI | Target | Actual | Grade | Note |
|---|---|---|---|---|---|
| Max | session-RPM | $24.00 | $18.70 (Mediavine) / $15.86 (true, revenue÷GA4 sessions) | 🔴 | -22% to -34% below target. Re-ran the advertiser decomposition (`mv_advertisers`, 3 windows): blended CPM is *still sliding*, not stalled — $0.878 (Jun27-Jul3) → $0.838 (Jul16-22) → $0.834 (Jul23-29). Site health clean (sticky-sidebar teal-star 13.0-14.3 vs 1.5 goal all of July, 23/23 regression tests pass, ads.txt/privacy ok, device mix flat ~96% desktop) — **not a code regression**. But the mix has deepened: Trade Desk -13% WoW ($101→$88) on top of an already-large late-June decline; Kargo/GumGum partially rebounded WoW but remain ~40-55% below late-June; and Yieldmo ($2.67-2.74 CPM, 3.8-4.8% of weekly revenue) has **dropped out of the named top-20 partner list entirely** this week, its impression share backfilled by low-CPM remnant exchanges (Google AdX ~18% of impr at $0.61 CPM; SeedTag impressions nearly tripled since late June at $0.69-1.02 CPM). Verdict: demand-side compression is real and still an account-management lever, not an engineering one — but it's broadening (2nd premium partner effectively gone), not resolving on the 2025 seasonal timeline. Recommend escalating to the Mediavine rep this week and confirming whether the 07-02 floor-CPM/fill-rate email was ever sent. Full detail in `.claude/agents/mhm-team/playbooks/max.md` (2026-07-30 entry). |
| Tim | organic sessions | 420,000/mo | Total sessions (30d): 408,542 (+1.0% vs 404,502 baseline, -2.7% vs target). True "Organic Search" channel (30d): 105,072 — week of 07-23→07-29: 25,064, **+5.1% WoW** vs 23,846 prior week | 🟡 | Target metric is mislabeled — baseline/target are GA4 TOTAL sessions, not the Organic Search channel Tim actually owns (Organic Social/Pinterest is 67%+ of total and not Tim's lever). By the literal target, within 10% → 🟡. True organic-search channel is growing faster than total (+5.1% vs +2.3% WoW) — a genuine SEO win — but GSC (web-search only, the leading indicator) shows the opposite: clicks -7.6% WoW while impressions are +105% WoW, and CTR nearly halved (1.12% vs 2.1% a month ago) as avg. position degraded. Headline is 🟡, underlying trend is worse than it looks. Quick wins shipped this month: 3 (target ≥4) → 🔴. Recommend targets.json get a dedicated organic-search-channel baseline so this KPI stops conflating Pinterest growth with SEO work. |
| Mark | net take-home | n/a (PENDING) | Cannot compute — Vercel/Prisma/OpenAI costs still unconfirmed | 🔴 | 5+ weeks since baseline (06-22) with 5 separate written asks (06-22, 07-01, 07-02, 07-12, 07-30) unresolved. Ad-revenue proxy also missed target by 25.3% this week |
| Sterling | high-ROI actions shipped | ≥3/mo | TBD — Sterling to confirm | — | |

**What moved the number this week:** Revenue fell -4.9% WoW ($1,527.47 vs $1,606.45, using the last-fully-finalized 7-day window 07-23→07-29 to avoid Mediavine's session-reporting lag at the edges) **despite GA4 sessions rising +2.3% WoW** — this is pure RPM/CPM compression, not a traffic problem. True RPM (revenue ÷ GA4 sessions) fell -7.0% WoW ($15.86 vs $17.05). July month-to-date (through 07-30): **$6,586.60**, tracking ~24% below June's confirmed $8,676.74 and ~26% below the $8,859 monthly target — this is no longer a "two-day tail event," it's a month-long shortfall.

**Biggest risk / red flag:**
1. **The Jul 21 exit criteria from the 07-02 RPM-dip mitigation report was breached and not escalated.** That report explicitly said: "If CPM has not recovered to $0.95+ by ~Jul 21, that indicates a second, non-seasonal factor — trigger a full code-level audit." Blended CPM this week was $0.80-0.87, still below $0.95, 9 days past that checkpoint. The original "seasonal Q2→Q3 ad-budget cliff" diagnosis needs to be revisited — either the recovery is simply slower than 2025's precedent, or something else changed. Recommend Max re-run the advertiser-level decomposition (Trade Desk/Kargo/GumGum WoW) this week specifically to answer that question.
2. **Cost confirmation is now the single largest blocker to CFO visibility, unresolved for 5+ weeks** despite five separate written requests. Net take-home — the team's actual bottom-line KPI — cannot be computed at all. Every "target" being graded against right now is a revenue-only proxy.
3. **`npm run agent:forecast` is broken** (`PrismaClientInitializationError: Can't reach database server at db.prisma.io:5432`) — could not produce an automated forecast this week; trajectory read is qualitative only (MTD run-rate, not a model).
4. **Mediavine's own session_rpm metric is misleading week-over-week** when the trailing 1-2 days haven't finished session processing (session counts land ~1-2 days after revenue) — always use a window anchored at the last fully-finalized day and cross-check against GA4, per the 07-12 learning.

**Top 3 actions next week (ranked by $):**
1. **Operator: confirm Vercel/Prisma/OpenAI monthly costs.** Blocks the CFO's entire primary KPI (net take-home) — open 5+ weeks, asked 5 times.
2. **Max: re-run the CPM/advertiser decomposition** — the seasonal-dip thesis from 07-02 needs re-validation now that its own Jul-21 exit criteria has been missed by 9 days without a documented follow-up audit.
3. **Fix `agent:forecast`** (DB connectivity: `db.prisma.io:5432` unreachable from the script runner) so weekly reviews have an automated trajectory model instead of manual MTD extrapolation.
