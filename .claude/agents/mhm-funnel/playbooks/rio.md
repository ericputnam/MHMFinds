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

## 2026-10-19 — E241: E227 KEEP final (leg 2: 2.0 pt / 0.0 pt); the 10-24 wiring gate is a script
- Tried: guardrail verdict 10-19 (Tier 0) + `guardrail-agreement-tracker.ts` (+lib, 15 tests): one reading per guardrail JSON, MV-Δ vs GA4-raw-Δ gap, agree/disagree/absent, WIRE/HOLD/INSUFFICIENT with the rule printed first. MV MCP down → guardrail JSON + scoreboard only; `direct-bot-read.ts --start 2026-09-19 --end 2026-10-17 --out /tmp/…` as the hand read.
- Before → after: 10-17 $286.91 vs $262.51 (+9.3%), RPM −3.8% on sessions +13.6%; segment 1,888 = 11.20% vs 2.28% controls → mix alone predicts (1−.1120)/(1−.0228) = −9.1% RPM, so ex-segment RPM ≈ $19.46 vs $18.38 (+5.9%). Ex-segment sessions +5.0% (guardrail) = hand read +5.0% (controls 14,584.5 / 332 identical, 0.0 pt); GA4 raw +15.6% vs MV +13.6% (2.0 pt). 28d 99.03% / 102.1% (run 17). Tracker: 2 of 7 mornings (0.9 pt, 2.0 pt) → INSUFFICIENT, 5 more; 10-24 is the 7th only if every run 10-20→10-24 prints both lines. 10-18 not finalized; needs ≥ $141.22 for 97% on 10-20.
- Verdict: GREEN; E227 KEEP final; E234 MORE DATA (10-20, 10-29); E241 reads 10-24.
- Next time: write the counter the day a "N mornings of agreement" gate is set, not the day it is read — two of the seven mornings were already behind me before the tracker existed, and any missed run before 10-24 moves WIRE to 10-25 by construction.

## 2026-10-18 — E234: a clean Friday; E227 leg 1 MET to the tenth; the pipe carries, the demand does not
- Tried: guardrail verdict 10-18 (Tier 0, docs PR). MV MCP unavailable again → `client.ts` direct; `direct-bot-read.ts --start 2026-09-18 --end 2026-10-16` as the E227 hand read; `affiliate-pipe-read.ts --start 2026-09-29 --end 2026-10-17`; read-only HEAD on the 5 live offers (4 gtracing.sjv.io, 1 envato.market — all 200, all `validated`).
- Before → after: 10-16 $207.61 vs $196.55 (+5.6%), RPM +2.8%, sessions +2.8% (MV) / +1.9% (GA4 raw) / +0.1% ex-segment; hand read ex-segment 11,812 vs 11,805.75 (+0.05%) = the guardrail's own numbers; MV mon-sess 57.7% vs 58.04%, mon-RPM +3.4%. 28d 98.87% / 101.57% (run 16). Pipe: gtracing 12 on-site / Impact 8 / 0 actions (66.7%), Envato 7 / 5; all clicks are the `grid` placement (/ 13, /games/sims-4/ 6 in 19 d ≈ 7/7d); affiliate_click 7d 5 on a ≥5 bar.
- Verdict: GREEN; E220 KEEP final (leg 2 MET); E227 leg 1 MET ×4 (leg 2 10-19); E234 MORE DATA (10-19 / 10-20 / 10-29). Amazon leg = unmeasurable (Q20 dropped).
- Next time: a hand read whose window is `end − 27` drops the 4th same-weekday control (09-18 for a 10-16 read) — pass `--start` = end − 28 when reproducing a 4-control mean, or you reconcile three controls against four and call a 0.0-pt match a drift.

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

_Older entries live verbatim in `archive/playbooks/rio-2026-09.md` (≤ 09-30) and `archive/playbooks/rio-2026-10.md` (10-01 → 10-04, 10-12 → 10-14); nothing deleted._
