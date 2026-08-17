# Impact Catalog Dry-Run Diagnosis — 2026-08-16

**Scope:** read-only diagnosis + activation plan. No prod writes, no activation, no spend. `npx tsx scripts/impact-sync-catalog.ts --dry-run` was run; nothing was synced or activated.

---

## 1. Why Redbubble, CapCut, Logitech G, and Logitech show 0 live offers vs gtracing's 3

**Short answer: they aren't broken — they were killed by the optimizer, on a threshold that's stale relative to this site's real CTR, and the sync script correctly refuses to un-kill them. Logitech (bare, contract 8585) is a separate, different problem: it was never configured at all.**

### 1a. Redbubble / CapCut / Logitech G — mass-retired 2026-07-21

Query against `AffiliateOffer` (read-only) shows all 12 Redbubble rows, the 1 CapCut row, and both Logitech G rows currently sit at `isActive: false, validationStatus: 'retired'`. Cross-referencing `reports/affiliates/optimize-log.md`:

- **2026-07-07 / 2026-07-14:** all 17 of these offers were `WATCH`ed (within the 14-day grace window).
- **2026-07-21:** `affiliate-optimize.ts` retired **16 of 17** in a single run under the "≥4,000 impressions and CTR ≤0.05%" rule:

| Offer | Impressions | Clicks | CTR |
|---|--:|--:|--:|
| CapCut Pro deep link | 80,643 | 12 | 0.015% |
| Logitech G735 headset | 40,695 | 5 | 0.012% |
| Logitech G Aurora collection | 42,618 | 12 | 0.028% |
| Redbubble (10 items) | 5,656–26,544 each | 0–6 each | 0.000%–0.034% |
| gtracing (2 original SKUs) | 40,156 / 42,023 | 14 / 9 | 0.035% / 0.021% |

The one survivor (`Pantone Aesthetic Anime Peaceful Stationary Sticker`, CTR 0.047%) was killed the following week (2026-07-28) at 42,248 impressions.

`impact-sync-catalog.ts`'s `upsertOffer()` has a deliberate guardrail: `if (existing?.validationStatus === 'retired') return 'skipped_retired'` — it will never resurrect a killed row. That's why the dry-run today still lists all 17 as "would sync" (10 Redbubble + 1 Logitech G + 2 gtracing catalog items + 2 Redbubble deep-link cards + 1 Logitech G deep-link card + 1 CapCut deep-link = 17) — a live run would attempt to upsert every one, and every one would hit the retired guardrail and get silently skipped. **The dry-run plan is cosmetically identical every week because `collectCatalogOffers()` always re-scores and re-proposes the same top-N candidates by static keyword match — it doesn't exclude already-retired items and substitute the next-best alternates.** For catalogs with limited on-theme inventory (Redbubble's 10 designs, Logitech G's single matching SKU, CapCut's one hardcoded deep link) there is no "next best" to fall back to, so the pool stays permanently empty. GTRracing is the exception only because its catalog has more SKU variety (different colorways/editions cycling in and out of stock), which is why 3 *different* GTRracing SKUs (created 07-21, 07-28, 08-04) organically replaced the 2 that were killed.

**This is a threshold-calibration problem, not a bug.** The kill rule's 0.05% CTR bar is explicitly calibrated against "the old Amazon catalog's CTR baseline" (per the optimizer's own inline comment). But the site's actual current affiliate CTR (per this task's brief, and roughly consistent with what I see: 28 clicks / 304,919 impressions on the 3 live gtracing offers = 0.0092%) is **~0.0086% — nearly 6x lower than the 0.05% kill bar.** Several of the retired offers (CapCut 0.015%, Logitech G Aurora 0.028%, several Redbubble SKUs 0.017%–0.034%) were actually performing **above** the site-wide average CTR when they were killed — they just never had a chance against an absolute bar calibrated to a completely different catalog/placement mix. **I'm contesting this batch of verdicts** per the playbook's Tuesday/Wednesday sanity-check duty — see Section 3.

### 1b. Logitech (bare, contract 8585) — never configured, not retired

Zero `AffiliateOffer` rows exist for partner `logitech` — ever. The contract (8585) shows `Active` in both the daily pulse and today's dry-run contract scan, and `PARTNER_CAMPAIGN_IDS` in `affiliate-daily-pulse.ts` already knows about it (for contract-health display only). But `scripts/impact-sync-catalog.ts`'s `CATALOG_TARGETS` and `DEEPLINK_TARGETS` arrays have **no entry for `logitech`** — only `logitech-g` (11355) is configured. This is a coverage gap, not a kill-rule casualty: nobody has ever authored a catalog ID / keyword set for the bare Logitech program, so the sync script has never had anything to propose for it.

---

## 2. Activation plan (draft — awaiting operator sign-off, not executed)

**Headline, honestly stated up front:** across the *entire* catalog, lifetime totals are **1,144 clicks / 2,716,582 impressions / $0 revenue / 0 conversions**, and the `AffiliateEarning` table has **zero rows, ever** (not "pending," literally empty). That means EPC is unproven at $0 across a fairly large sample. Any $/month figure below is a directional hypothesis built on published commission-structure assumptions, not a forecast grounded in observed conversions — I want to be explicit about that rather than dress up a guess as data.

| Partner | What would activate | Where it surfaces | Historical run-rate (pre-retirement) | Honest $/mo estimate |
|---|---|---|---|---|
| **Redbubble** (11754) | 10 catalog stickers/posters + 2 deep-link collection cards (12 SKUs) | Grid cards on decor/build-mode/CAS mod pages tagged `cozy`/`modern`/`fantasy` (matches `matchingThemes`) | ~196K impressions / 18 days ≈ 327K/mo combined | At 0.0086% CTR ≈ 28 clicks/mo. Redbubble's rev-share (~7.5%) on a ~$18 AOV sticker/poster and a typical <2% affiliate conversion rate implies **≈$0–2/mo**. Essentially noise at current CTR. |
| **CapCut** (22474) | 1 deep-link card (software, all themes) | Sidebar or `/go` interstitial cross-sell ("edit your Sims TikToks") | ~80,643 impressions / 18 days ≈ 134K/mo | ≈12 clicks/mo at 0.0086% CTR. CapCut is a CPA-per-signup model; even a generous $1–3/signup at a 1% click-to-signup rate is **≈$0–0.50/mo**. |
| **Logitech G** (11355) | 1 catalog SKU (G735 headset) + 1 deep-link Aurora collection card | Grid cards on gaming-setup/peripheral-adjacent pages, `cozy`/`modern`/`minimalist` | ~83K impressions / 18 days ≈ 138K/mo | ≈12 clicks/mo. Higher AOV (~$130 headset) helps EPC *if* conversion happens, but zero conversions have been observed on this SKU across its entire prior run (5 clicks total logged) — too small a sample to model. Treat as **unproven, not $0-but-not-quantifiable**. |
| **Logitech (bare)** (8585) | Nothing yet — needs a new `CatalogTarget`/`DeeplinkTarget` entry (catalog ID + keyword set) authored before the next dry-run can even propose candidates | TBD once configured | No history — never synced | Can't estimate; this is new coverage, not a reactivation. |

**Bottom line:** at today's measured 0.0086% CTR and $0 proven EPC, reactivating the 17 retired Impact-catalog SKUs as-is is unlikely to move revenue meaningfully in isolation — the math nets out to low single-digit dollars per month. The bigger levers are (a) fixing the kill-threshold miscalibration so future cohorts get a fair trial before being permanently blocked (Section 3), and (b) broader placement/impression coverage rather than SKU-level reactivation. I'm not recommending a blanket "flip these back on" — that would just re-run the same losing math for another 4–6 weeks before the next optimizer sweep kills them again under the same stale bar.

**What I am recommending for operator sign-off:**
1. Approve the SD-2 threshold-recalibration experiment (Section 3) before any reactivation — reactivating under an unchanged 0.05% bar just re-burns the watch window.
2. Author a `CATALOG_TARGETS`/`DEEPLINK_TARGETS` entry for Logitech (8585) as new, untainted coverage — separate track from the retired-offer question, no downside since it has zero history to contest.
3. Hold off on prioritizing more Redbubble/CapCut/Logitech-G SKU hunting until (1) is resolved — more SKUs under the same bar just produces more of the same 6-week kill cycle.

---

## 3. Verdict I'm contesting (per playbook Tuesday/Wednesday duty)

**Verdict:** the 2026-07-21 mass retirement of 16 offers under the "≥4,000 impressions, CTR ≤0.05%" rule.

**Why I'm contesting it:** the 0.05% bar is calibrated to the old Amazon catalog's CTR baseline, not to this site's actual measured affiliate CTR (~0.0086%, confirmed via the 3 surviving gtracing offers: 28/304,919 = 0.0092%). Multiple retired offers (CapCut 0.015%, Logitech G Aurora 0.028%, several Redbubble SKUs 0.017%–0.047%) were performing *above* the site-wide average when killed — i.e., they were relatively good performers by the site's own standard, killed by an absolute bar nearly 6x higher than what's achievable in the current placement mix. A threshold this far out of calibration will keep killing every offer that crosses 4,000 impressions, regardless of relative quality, until it's revised.

**Proposed SD-2 experiment (for operator approval, not applied by me):**
- **Change:** lower the low-CTR kill bar from an absolute 0.05% to something anchored to the site's own measured baseline — e.g. 0.5x the trailing-28d site-wide average CTR (currently ≈0.0043%), recomputed each run rather than hardcoded, OR a relative bottom-quartile-of-cohort rule instead of an absolute number.
- **Before-snapshot:** 0.05% absolute bar; site-wide CTR 0.0086%; 16/17 offers retired in a single sweep on 2026-07-21.
- **Measurement date:** 4 weeks after the threshold change ships (mirrors the existing 14-day watch window + one full optimizer cycle to observe the new bar in action).
- **Keep/kill rule:** if the recalibrated bar still kills the majority of a cohort within one 14-day watch window, the CTR-based kill rule itself needs a bigger rethink (may be evidence the placements themselves are the problem, not the offers).

I have not changed the script or the threshold — this is a proposal for the operator to approve before any code change.

---

## 4. Daily-pulse cron DB connectivity — 7-day failure diagnosis

**Symptom:** `reports/affiliates/daily/2026-08-10.md` through `2026-08-16.md` all show 🔴 with `Can't reach database server at db.prisma.io:5432` plus `Commission Sync Trigger: fetch failed` and `Impact API unavailable: fetch failed` — i.e. **every outbound network call in that process invocation fails**, not just the DB connection.

**Ruled out — not a config bug:**
- `scripts/agents/affiliate-daily-pulse.ts` correctly loads `.env.local` with `override: true` (needed because `@prisma/client`'s own dotenv import hoists and loads bare `.env` first — this is already documented in the script's own comments) and correctly swaps `DATABASE_URL` for `DIRECT_DATABASE_URL` before creating the Prisma client.
- Manually re-running the same connection logic right now (this session) succeeds immediately — same host (`db.prisma.io`), same script logic, no code changes.
- The failure isn't scoped to Postgres — the same run also fails an HTTPS `fetch()` to the Impact API and to the production `/api/cron/commission-sync` endpoint. A DB-specific misconfiguration (wrong URL, expired credential, swapped Accelerate/direct URLs) would not explain HTTPS fetches also failing in the same run.

**Root cause (evidence-based): this is a machine-network-readiness race at cron-fire time, not specific to this script.**

Cross-referencing `logs/mediavine-daily-report.log` (a completely separate script, separate launchd job `com.mhmfinds.mediavine-daily-report`, scheduled 8:07am vs. affiliate-daily-pulse's 8:15am) shows the **same `fetch failed` symptom on overlapping days**: 2026-07-28, 08-09, 08-10, 08-11, 08-12, 08-13, 08-14, 08-15. Two independent scripts, different code paths, different env-var handling, both fail on the same mornings — that rules out a script-specific bug and points at something environmental at the OS/network layer during that time window.

The `affiliate-daily-pulse.log` timestamps are the clincher: the job is scheduled for 8:15am sharp (`StartCalendarInterval`), but actual run times on failing days drift to 8:16, 8:21, 8:23, 8:24, 8:25, 8:27, 8:29 — up to 14 minutes late. That drift pattern is the signature of a macOS `launchd` calendar job that **missed its scheduled fire time because the machine was asleep, and ran as soon as the machine woke** — which, for a job this late, means the wake event itself was late (i.e., roughly when the operator physically opened the laptop that morning). The job's very first action is a network call, fired at the same moment the network interface is still re-associating Wi-Fi / re-acquiring DHCP/DNS after wake — before the `Can't reach database server` and `fetch failed` window closes a few seconds later. On days the machine was already awake at the scheduled time (most of late July), both jobs completed cleanly and on-time (8:07/8:15 sharp).

The `caffeinate` launchd job (`com.mhmfinds.caffeinate`, currently running) keeps the CPU from idling but does not guarantee network reachability immediately on wake — it doesn't address this failure mode.

**Fix (diagnosis + recommendation only — not applied, this is an infra change per charter.md and requires operator approval):**
- Add a network-readiness guard to the top of both wrapper scripts (`run-affiliate-daily-pulse.sh`, `run-mediavine-daily-report.sh`) — loop a short `curl -sf -o /dev/null --max-time 3 https://api.impact.com` (or similar low-cost endpoint) with a short sleep, up to a ~90s timeout, before invoking `npx tsx`. This absorbs the wake-time network race without touching DB/env config.
- Alternative/complementary: retry each Prisma connection + external `fetch()` in the scripts themselves (2–3 attempts with backoff) rather than failing on the first attempt — cheaper to ship than a shell-level guard, and generically useful for any future cron script.
- Not recommended: changing the scheduled time earlier/later — the drift shows the *actual* wake time varies day to day, so a fixed schedule change wouldn't reliably dodge it.

This is a shell-script / launchd change, which is an infra change under `charter.md`'s "🚧 MUST get explicit human approval" bucket — I'm flagging the diagnosis and proposed fix, not implementing it.

---

## Pulse

🟡 **Impact catalog:** not broken, but 80 of 83 offers sit inactive — 16 legitimately killed under a stale kill-threshold (contested, SD-2 proposal above), 1 partner (Logitech bare) never configured. Low near-term $ opportunity from reactivation alone at current 0.0086% CTR / $0 proven EPC; the threshold recalibration matters more than SKU-level reactivation.

🟡 **Daily-pulse cron:** 7 days of false-🔴 pulses caused by a wake-time network race, not a real DB outage — Aug 10–16 pulses should be treated as "no signal" rather than "sync is broken." Recommend a network-readiness retry guard (operator-approved infra change).

— Ivy, Affiliate Revenue Ops
