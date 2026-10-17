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

## 2026-10-17 — E227: whole-segment read replaces excess-over-250; the guardrail prints it; E220 KEEP
- Tried: guardrail verdict 10-17 (Tier 0) + code (PR #326 56f328f): revenue-guardrail.ts pulls GA4 site + segment sessions after status is decided, prints raw → ex-segment → share; rule imported from direct-bot-lib. MV MCP down again → client.ts direct; GA4 via the Data API MCP.
- Before → after: 10-15 sessions +14.0% → ex-segment +0.7%; RPM −2.8% → ex-segment $17.82 (+10.0%); MV mon-session share 50.70% vs 56.71%, mon-RPM +8.8%. Segment 2,074 = 15.93% of the day (whole) vs 1,824 (excess method) — 250 apart on a spike day, 4.10% vs 1.93% over 28d. 28d 98.76% (run 15). E220 both legs MET.
- Verdict: GREEN, mix not rate; E220 KEEP; E227 MORE DATA (read 10-18).
- Next time: subtract the classifier's whole segment, never a hand threshold — and when a line's basis differs from the headline's (GA4 vs Mediavine), print both raw lines so the reader can see they agree before trusting the subtraction (10-15: +14.0% on both).

## 2026-10-16 — E220: 10-14 RPM −6.8% was Singapore mix; Members API could-not-run
- Tried: guardrail verdict 10-16 (Tier 0, PR #314 405f32c) — decomposed 10-14 ex the Singapore Direct/Chrome stream (1,845 sessions = 1,846 users = 1,846 pageviews, 41 engaged; excess 1,606) and cross-checked on Mediavine's own monetizable split; E134 interim read (`--start 2026-09-29 --end 2026-10-15`: GTRacing 12 on-site, Impact 8 clicks, 0 actions, $0, kill_read 11-11 fourth run).
- Before → after: headline RPM $15.22 (−6.8%) → ex-excess $17.40 (+6.6%); MV monetizable sessions 50.95% of sessions vs 58.72% control, monetizable-session RPM $29.87 vs $27.80 (+7.5%). 28d 98.49% (run 14); Singapore excess 1.77% → 1.93% → 2.37% of 28d sessions in three days.
- Verdict: GREEN, mix not rate, no ad-side action. MORE DATA on the line legs (10-17, 10-18).
- Next time: `monetizable_sessions ÷ sessions` is a GA4-free mix detector — read every day ex-excess first. A Members API "aborted due to timeout" is COULD-NOT-RUN, not zero joins; the walk has no retry (inbox [rio→ops]). (Entry landed by Quinn from Rio's report: Edit was denied in Rio's run.)

## 2026-10-15 — E213: B2 killIf MET → affiliates-only; 10-13 RPM −5.2% was mix; Item D re-pitched as Q29
- Tried: guardrail verdict `reports/funnel/rio-verdict-2026-10-15.md` (T0) + Q29 package (T2, paper-only PR). Mediavine MCP down again → `client.ts` direct; GA4 country × channel × browser; `affiliate-pipe-read.ts` printed kill_read 11-11 for the 3rd run. Kadence-safe dry run on prod post 5848 read-only: 7× `08-20`, 0× `04-20`, 48,894 B both sides, invariants PASS; a reverse-direction dry run (`--from 04-20`) was the cheap way to prove the post has *no* correct tag at all.
- Before → after: 10-13 $187.29 vs $187.30 (−0.0%), sessions +5.3%, RPM −5.2% → ex 585 Singapore Direct one-pageview sessions: sessions +0.15%, RPM $16.50 (−0.3%); CPM +5.5% with imp/mon-pv −8.8% = empty-pageview denominator, not demand. 28d 98.20% / 99.93% (run 13); Singapore excess 6,863 = 1.93% (was 1.77%). B2 leg 2: joins 7d 4 (10-08) / 3 (10-15), Q17 dropped → killIf MET, affiliates-only 10-15→10-31. Non-ad $162–164.50/mo.
- Verdict: GREEN, merges clear; E199 + E206 10-15 legs MET; Q29 reads 10-22 (silence = drop, Amazon leg "unmeasurable" on 11-11).
- Next time: decompose an RPM move as sessions × RPM *ex the known junk stream* before reading rate — a CPM rise alongside an imp/mon-pv fall is the fingerprint of a denominator, and would have been misread as demand softening.

## 2026-10-14 — E206: E174 CLOSED seasonal, E199 10-14 leg MET, the Direct spike is Singapore
- Tried: guardrail verdict `reports/funnel/rio-verdict-2026-10-14.md` (T0, docs). Mediavine MCP down → `client.ts` direct; GA4 Data API by country/browser/host; `affiliate-pipe-read.ts` printed kill_read 11-11 on its second consecutive run (12 on-site / 8 Impact / 0 actions, 66.7%).
- Before → after: 10-12 $207.05 vs $181.01 (+14.4%), sessions +20.2%, RPM −4.7% — but 1,600 of 1,610 Singapore sessions were Direct/Chrome/apex at 1 user = 1 session = 1 pageview; ex that 1,360-session excess the Monday reads sessions +8.8% (holiday; Organic Social +10.8%) at RPM $16.08 (+5.3%) if the spike earned $0. Same source made 09-27 (2,203) the "anomalous control Sunday" and 10-08 (1,074). 28d excess over 250/day = 6,278 = 1.77% of headline sessions; sessions line 99.52% → 97.76% ex-excess. 28d vs prior: rev −1.5% = sess −1.4% × RPM −0.1%; 7d +22.7% is RPM +21.1% (reset ending), sessions +1.3%. E174: 0.69/0.66/0.66, fill +2.15/+1.01/+0.40, sticky 10.40/10.16 → CLOSE. 28d 98.02%; 10-15 needs 10-13 ≥ $116.10 (partial $187.29) → ≈98.20%. B2 leg 2: joins 7d 3 → MET tomorrow.
- Verdict: GREEN, merges clear; no action inside the Tier 2 fence (affiliates-only starts 10-15; item D re-pitch is tomorrow's artifact). Non-ad October $160–170 vs $450 unchanged.
- Next time: when Direct reads > 1.5× its 4-week mean on any day, print the top country for that channel beside the sessions and RPM deltas *before* grading the day — the same spike was misread as a "control outlier" on 10-13 and as "+20% sessions" today; one GA4 country row would have named it both times.

## 2026-10-13 — E199: 28d roll-out named, E192 leg MET, E134 kill clock was drifting
- Tried: guardrail verdict `reports/funnel/rio-verdict-2026-10-13.md` (T0) + code: `affiliate-pipe-lib.ts` anchors the KILL clock on `PIPE_RULE.confirmedOn` (10-12) instead of the run date; 20/20 tests, 2 red pre-fix. Mediavine MCP down again → `client.ts` direct; GA4 Data API for the Sunday channel split.
- Before → after: 10-11 $262.16 vs $269.26 (−2.6%), RPM +0.4%, sessions −3.0% — GA4 vs 4 Sundays: Organic Social −0.4%, Organic Search −3.2%, Direct 1,050 vs 1,282 where the 09-27 control carried 2,657; ex that outlier the Sunday reads +0.9%. 28d 97.28% / sessions 98.46%; 09-14 (−9.3% vs line) leaves on 10-14 and 09-15 (−5.8%) on 10-15, so 10-12 needs only ≥$146.53 (partial already $207.05) and 10-12+10-13 ≥$323.15. E174: 10-11 ratio 0.66 / fill +1.01; 10-10 sticky 10.40 → CLOSE seasonal 10-14 unless 10-12 ratio <0.54 or sticky <9.0 both unpublished days. B2 leg 2: joins 7d 3, needs ≥2 in 2 days → expect MET. Tool drift: kill_read printed 11-12 today vs 11-11 yesterday.
- Verdict: GREEN, merges clear; E192 10-13 leg MET (KEEP); non-ad October $160–170 vs $450 unchanged.
- Next time: (1) a 4-week same-weekday mean has one spike control in it one week in four — print the control days beside the mean before calling a −3% a miss; (2) any clock a daily job re-computes must anchor on a frozen first-confirmation date, or the read date walks forward one day per run and never arrives — check by running the tool twice on consecutive days and diffing the printed read date.

## 2026-10-12 — E192: Monday grades (E134/E153/E74/E174/E131) + B2 leg-2 plan
- Tried: guardrail verdict `reports/funnel/rio-verdict-2026-10-12.md` (T0, docs PR). Mediavine MCP down again → `scripts/mcp-mediavine/client.ts` direct; Patreon Members API walk (6,110 members, `links.next` exhausted); `affiliate-pipe-read.ts --start 2026-09-29 --end 2026-10-11`; GA4 Data API for the E74 events and the 10-10 channel split.
- Before → after: 10-10 $257.66 vs $268.36 (−4.0%) with RPM +0.1% and sessions −4.1% — GA4 Sat vs 4 prior Sats: Organic Search −10.7%, Organic Social −4.5%, Direct +4.0% → traffic, not yield. 28d line ratio 98.60% → 97.94% is the 09-12 Sat ($281.07) → 10-10 Sat ($257.66) swap; the window's five weakest days are all the closed E163 reset (10-01…10-05, −20…−27%, RPM-driven, sessions ~flat), leaving 10-28→11-02. E153 CONFIRMED: on-site gtracing 10, Impact 6/0/$0 = 60.0% (pre-fix 8.2%) → E134 EXTEND, clock reads 11-11. E74: share 10/79 = 12.7% (<1/3), paid-and-connected 0 → 3 (OR leg met), RPM leg 93.2% literal miss = E163 (103.0% ex reset days) → KEEP feature, retire as lever. E174 10-10: ratio 0.69, fill +2.15 pts, sticky unpublished → on track to CLOSE 10-14. B2 leg 2: joins 7d 2 (needs ≥5 by 10-15) → expect MET → affiliates-only 10-15→10-31 (E134 clock in step 0e, item D re-pitch once, Q20 drops 10-18; ceiling ≈$0–10/mo; October non-ad lands $160–170 vs $450).
- Verdict: GREEN, merges clear, no Tier 2 package. E131 MORE DATA (0 refresh log lines; patreonApi.ok 3/3).
- Next time: (1) when a line ratio moves, name the day that rolled *out* as well as the one that rolled in — a same-weekday swap is a level difference, never a mix; (2) a $0 clock starts on the day the pipe is *confirmed*, not the day it was fixed — grading E134 on 09-29 would have repeated E13; (3) an OR-leg KEEP must still print the lost leg with its attribution, or the next reader re-opens it.
