<!-- context budget: 10000 bytes, enforced by __tests__/unit/funnel-context-budget.test.ts; archive to mhm-funnel/archive/, don't append -->
# Rio — Product & Revenue — Playbook

Your memory across runs. Append one dated entry per run, newest at the top,
**with a number**. "I think it worked" is not a learning. Covers revenue: Patreon tier changes and paid counts, membership conversion, sponsorship replies, affiliate EPC, ad-guardrail incidents.

Entry format:

```
## YYYY-MM-DD
- Tried: …  (tier, PR/link)
- Before → after: <metric> <n> → <n> (<window>)
- Verdict: KEEP / KILL / MORE DATA (read on <date>)
- Next time: one sentence
```

## Kill log
_(ideas you tried that did not work — never re-propose without saying what changed)_

---

## 2026-10-12 — E192: Monday grades (E134/E153/E74/E174/E131) + B2 leg-2 plan
- Tried: guardrail verdict `reports/funnel/rio-verdict-2026-10-12.md` (T0, docs PR). Mediavine MCP down again → `scripts/mcp-mediavine/client.ts` direct; Patreon Members API walk (6,110 members, `links.next` exhausted); `affiliate-pipe-read.ts --start 2026-09-29 --end 2026-10-11`; GA4 Data API for the E74 events and the 10-10 channel split.
- Before → after: 10-10 $257.66 vs $268.36 (−4.0%) with RPM +0.1% and sessions −4.1% — GA4 Sat vs 4 prior Sats: Organic Search −10.7%, Organic Social −4.5%, Direct +4.0% → traffic, not yield. 28d line ratio 98.60% → 97.94% is the 09-12 Sat ($281.07) → 10-10 Sat ($257.66) swap; the window's five weakest days are all the closed E163 reset (10-01…10-05, −20…−27%, RPM-driven, sessions ~flat), leaving 10-28→11-02. E153 CONFIRMED: on-site gtracing 10, Impact 6/0/$0 = 60.0% (pre-fix 8.2%) → E134 EXTEND, clock reads 11-11. E74: share 10/79 = 12.7% (<1/3), paid-and-connected 0 → 3 (OR leg met), RPM leg 93.2% literal miss = E163 (103.0% ex reset days) → KEEP feature, retire as lever. E174 10-10: ratio 0.69, fill +2.15 pts, sticky unpublished → on track to CLOSE 10-14. B2 leg 2: joins 7d 2 (needs ≥5 by 10-15) → expect MET → affiliates-only 10-15→10-31 (E134 clock in step 0e, item D re-pitch once, Q20 drops 10-18; ceiling ≈$0–10/mo; October non-ad lands $160–170 vs $450).
- Verdict: GREEN, merges clear, no Tier 2 package. E131 MORE DATA (0 refresh log lines; patreonApi.ok 3/3).
- Next time: (1) when a line ratio moves, name the day that rolled *out* as well as the one that rolled in — a same-weekday swap is a level difference, never a mix; (2) a $0 clock starts on the day the pipe is *confirmed*, not the day it was fixed — grading E134 on 09-29 would have repeated E13; (3) an OR-leg KEEP must still print the lost leg with its attribution, or the next reader re-opens it.

## 2026-10-07 — third 🔴 RED (10-05) = same incident; E174 sidebar residual dated
- Tried: four-point same-incident re-grade on finalized 10-03/04/05 (+10-06 ad-server rows) via `scripts/mcp-mediavine/client.ts` (MCP down), verdict filed 07:13 MDT (deadline 07:50): SAME-INCIDENT / MERGES CLEAR / rollback none. PR #269 `f1beac1` (docs only), verify PASS 07:41. Two literal misses declared: (a) 10-03 requests/pv −6.8% is the month-long slide, not a step; (b) Universal Player *recovered* +6…+15%, so Sidebar Sticky reads 1.53×/1.56× against a diluted denominator (1.27× ex-Player). Delivery intact: `sticky_sidebar_ads` 10.04/10.16 (April wipe read 0.1).
- Before → after: 10-05 $157.98 vs $207.31 (−23.8%, −16.3% ex-Labor-Day), RPM 13.77 vs 16.50; sidebar/content 0.74 (09-24) → 0.61 → 0.65 on 10-06; 10-06 revenue $197.91 = +6.0% vs Tuesday mean (the 2025-trace lift expected 10-07 arrived a day early). Reads: E163-b CLOSED confirmed (matured 10-02 blog fill 63.0% vs 58.3% = +4.7); E19 KEEP-feature/KILL-lever (linked 149, paid 59 vs 60, connected 2/149); E89 NOT-RUN (Q17 dropped); E99 KEEP (2.71/day); E153 NOT-YET → 10-12; E60 MORE DATA; B2 killIf not triggered (joins 7d 9 ≥5).
- Verdict: E174 OPEN, read 10-09 (close if sidebar/content ≥0.68 either day or within 10 pts of Content; reopen ON-SITE as a T2 package only if <0.65 both days AND ≥10 pts worse AND sticky_sidebar_ads <9.0). Non-ad: $159/mo vs the $450 bet; `_rioOctoberRead` $200–225 stands — $450 needed the Q17 send, now dropped.
- Next time: ratio each ad unit against the site ex its best unit, not the blended drop — a recovering unit mechanically fails every other unit on point (b); and strip the holiday from a same-weekday mean before quoting the gap (−23.8% read −16.3% ex-Labor-Day).

## 2026-10-04 — E163-b read: second 🔴 RED (10-02) = same incident; residual CLOSED
- Tried: restated the rule, then pulled 10-02 vs 4 prior Thursdays + matured 10-01 page classes (`client.ts` direct; `/tmp/rio-e163b-*.ts`). Fast verdict to Quinn 11:05Z (`rio-verdict-2026-10-04.md`): SAME-INCIDENT · MERGES CLEAR (T0, no ad surface) · ROLLBACK none. PR #262 docs-only.
- Before → after: $152.46 vs $208.17 (−26.8%) = paid imp −15.5% × CPM 0.94→0.81; fill 56.0→60.4% (4-Thu 66.0%); requests/pv 17.07 vs 17.46 (−2.2%); 4/4 units −25…−34%; 15/15 partners down. **Matured 10-01 blog fill 58.7% vs remainder 54.3% = +4.4 pts** (every day since 09-18: +3.5…+4.5; the −9 on 10-03 was the unjoined artifact); blog req/monPv 23.80 vs 24.00; 3-day RPM ratio 1.18× (was 1.87× unjoined). 2025-10-02 same-weekday: −35.9%.
- Verdict: E163 CLOSED holds; E163-b CLOSED (confirm 10-05 when 10-02 rows join: keep if matured gap > −8 pts). Expect RED through ~10-07 — 4-point same-incident test is in the incident file.
- Next time: (1) per-path rows join ~2 days after the day — print `rowsWithPv` beside every bucket table and never grade a 0/100 day; (2) unjoined days under-attribute impressions to seen paths (coverage 46.5% vs 54–58%), so the derived remainder's fill reads *high* — the artifact always points at the blog; (3) a RED run on a quarter boundary needs a standing re-grade test or the breaker holds the whole team for a week.

## 2026-10-03 — E163: 🔴 RED-RPM root cause (incident file, no rollback)
- Tried: pre-committed the rule in `reports/funnel/incidents/2026-10-03-red-rpm.md` before pulling; read fill (ad-unit totals), CPM, requests/pv, 16 partners, devices, page-class buckets, GA4 `hostName`; then two seasonal controls — this site's Q2→Q3 boundary (06-27→07-01) and last year's 09-27→10-04 — as the discriminator between host split (#208, 09-28 20:48) and quarter end.
- Before → after: 10-01 $137.06 vs $184.40 (−25.7%); fill 64.8% (4-Wed) → 56.0%; CPM 0.89 → 0.84; requests/pv 17.23 → 17.37 across the split, 16.90 → 16.73 across E152 (no step); 14/14 partners down, Criteo+SeedTag+Conversant $11.79 → $0; all 4 ad units −31…−36%; blog requests/monetizable pv 24.00 → 23.93 on the first apex day. Controls: 07-01 −41%, 2025-10-01 −42%, both starting 09-29/06-29; 2026 −27% is the smallest of the three. 10-02 NOT finalized (partial $152.46, fill 60.4%).
- Verdict: CLOSED — Mediavine-side. Residual E163-b (read 10-04): blog-bucket fill still ≥ 8 pts under the remainder's with site fill ≥ 60% → reopen as host split.
- Next time: (1) a drop that starts on the last 2 days of a quarter needs the same calendar window from the prior year *before* a commit is blamed — one earnings pull settles what six page-class tables cannot; (2) a `/reports/pages` day whose rows carry `pageviews: 0` is unjoined — never read its page-class split as a verdict; (3) derive the remainder's fill (site requests − bucket requests) — the buckets alone made the blog look singled out.

_Older entries live verbatim in `archive/playbooks/rio-2026-09.md` (≤ 09-30) and `archive/playbooks/rio-2026-10.md` (10-01, 10-02); nothing deleted._
