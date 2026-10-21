<!-- context budget: 10000 bytes, enforced by __tests__/unit/funnel-context-budget.test.ts; archive to mhm-funnel/archive/, don't append -->
# Pip — Distribution — Playbook

Your memory across runs. Append one dated entry per run, newest at the top,
**with a number**. "I think it worked" is not a learning. Covers channels: what pin/post types drive sessions, pinner incidents, format tests, new-channel results.

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

## 2026-10-21
- Tried: E251 (T0, #357): `scripts/agents/topup-grade.ts` + `-lib` + 12 tests — one grader for every SD-10 top-up (treated set from the tool's undo ledger, hosts + trailing slash folded, 7 d vs prior 7 d, post window same weekdays −7 d clipped at `--end`, rule printed first). Graded E202, re-ran E216. No top-up: tool gate 2.36 d (29 ÷ 12.29 pinterest-14d) ≥ 2.0.
- Before → after: E202 treated 1,736 vs 1,849 (−6.1%) vs site Pinterest +2.3% (10-13→19 vs 10-06→12) → KILL as lift; tool = hand pull on all 9 dests; cap 7/7/7; read-back 21/21, 0 blog.*. E216: `automated` (1.001 users/sess, 99.4% fingerprint), segment 21,308 = 5.82% of 366,160 (28d; was 4.10%), 7d all +9.8% → ex seg +3.0% → KEEP. Floor lift record: E181 −2.7% vs −1.1%, E188 +5.6% vs +5.0%, E202 −6.1% vs +2.3% — 1 of 3 ≥ site.
- Verdict: E202 KILL (lift); E216 KEEP; E251 MORE DATA (read 10-27 — E209/E244 graded by the tool)
- Next time: three grades say revived rows ride the site's Pinterest curve rather than bend it — the floor is inventory insurance; sessions upside needs new destinations (catalog/collection pins), not re-dates.

## 2026-10-20
- Tried: E244 top-up #16 (T0, SD-10 floor; E209's next leg; apply ledger on main 7fd30bc, artifacts #350): tool gate 1.51 d (18 ÷ 11.93/day pinterest-14d), scoreboard ≈1.5 d on the same basis. 18 sessions-ranked rows 3×10-23 + 7×10-24/25 + 1×10-26 (ranker 10 dests/63 ids, 94 writer rows dropped upstream, 0 in the tool); cross-run cap left 3 slots on 10-23 (E209 holds 4) and skipped 10-21/22. E195 graded KEEP: `--check --stranded 63` 63/63 live.
- Before → after: runway 1.51 → 3.02 d (18 → 36 rows; bound seven_per_day_cap, stopped at the ~3-day target); SEO 58 → 94 (0/18 → 18/18); read-back 18/18, created_at 2025-06-11..2026-01-27, 1/dest/date (E223 default held). Day-trace: plugin 0 real-dated rows on 10-21..27 — the 14-day horizon is again 100% top-ups (Q28).
- Verdict: MORE DATA (read 10-27; treated WoW ≥ site WoW, re-pulled)
- Next time: at ≈12 pins/day the floor fires every ~5 days and the trailing rate is now set by the top-ups themselves, so each refill buys the same 3 days for fewer sessions — only Q28 (plugin dates ahead) changes the slope.

## 2026-10-18
- Tried: E230 (T0, #334): diagnosed the scoreboard 🔴 "Pinner writer 72.1 h" before any pin work — rule printed first (`reports/funnel/pip-writer-pinner-2026-10-18.md`). Graded E181. No top-up: tool gate 2.99 d (32 ÷ 10.71 pinterest-14d) ≥ 2.0.
- Before → after: writer inserts are publish-keyed — 17/17 WP posts since 09-21 got a same-UTC-day batch (lag 10 min–6.8 h), 0/14 non-post days had one; 0 posts since 10-15 03:42Z → 72.2 h of silence is the weekend, not a death. Last 4 weekends: 1 false 🔴 (today), 1 near-miss (10-12, 1.1 h). Dating step: 518/745 writer rows since 09-21 still placeholder (219 from the 8 batches since 10-05); poster shipped 29 writer vs 181 top-up rows in 14 d → Q28 addendum. E181: treated 3,087 vs 3,172 (−2.7%) vs site −1.1% → KILL as lift.
- Verdict: FALSE ALARM (a) → [pip→ops] publish-keyed flag; read 10-25.
- Next time: a liveness clock must tick from the upstream event (a publish), not from the last output — an idle-by-design producer reads dead on every gap longer than the floor.

## 2026-10-17
- Tried: E223 (T0, PR #324 d258059): top-up allocator per-URL cap re-keyed on destination_key (host-folded) and --max-per-url default 2→1 with build_parser() + 2 guard tests (both red pre-fix). No top-up: tool gate 2.62 d (39 ÷ 14.86 pinterest-14d) ≥ 2.0. Sections --check --stranded 63: 63/63 live.
- Before → after: 10-15 ledger 18 rows → 5 dests at 2/dest/date (tattoos ×6, gshade ×6 over 3 dates) vs 10-14 21 → 9 at 1/dest/date; pool 37 blog.* / 26 apex of 63 rows, 0 host-split destinations today.
- Verdict: MORE DATA (read 10-22 on the next apply's ledger)
- Next time: a lesson that lives only as "always pass --flag" in the playbook is not a guard — make it the default and pin it with a test that was red first.

## 2026-10-16
- Tried: E216 (T0, PR #317 21cc7c9): classified the Singapore Direct stream (E206 Pip leg, due 10-21) with a reusable read — `scripts/agents/direct-bot-read.ts` + pure `direct-bot-lib.ts` (rule printed before the reading; `automated` only if users/session ≥0.98 AND pv/session ≤1.05 AND ≥90% on the two fingerprints; else `inconclusive`, never "human") + 11 tests; artifact `reports/funnel/pip-singapore-direct-2026-10-16.md`; Q30 (Vercel Firewall SG challenge) filed. No top-up: tool runway 2.89 d (46 ÷ 15.93 pinterest-14d) ≥ 2.0.
- Before → after: 28d 09-17→10-14 segment 14,740 = **4.10%** of 359,162 (Rio's excess-over-250 method read 1.93% — the quiet-day trickle is the same two fingerprints); users/session 1.001, pv/session 1.002, 99.0% on 1280x1200 (9,686) + 1366x1366 (4,668); engaged 27.8% but 85.7% on the Mac variant — dwell-driven, so engagement is not a bot discriminator. 7d all +5.7% → ex segment +0.5%; Direct +79.9% → ex segment **−7.4%**. 1280x1200 variant ramping (10-14 1,806, 10-15 1,943). Pinner 9–10 pins/24h = 100% of rows dated today (0 schedulable, drainable 0): inventory-bound, not degraded.
- Verdict: KEEP (verdict `automated`; read 10-21 by re-running the tool — keep if verdict unchanged and the headline is quoted with the ex-segment line beside it)
- Next time: segment Direct by country + source before reading its WoW, and classify the whole segment, not the excess over a baseline. (Entry written by Quinn from Pip's report: Edit was denied in Pip's run.)

## 2026-10-15
- Tried: E209 top-up #15 (T0, SD-10 floor; E202's next leg): tool gate read 1.99 d (35 ÷ 17.57/day pinterest-14d) while the scoreboard printed "≈2 d" on the same basis — the floor is strict, 1.99 < 2.0. 18 sessions-ranked rows 7×10-21/22 + 4×10-23 (ranker 9 dests/70 ids, 77 writer rows dropped upstream, 0 in the tool); cross-run cap skipped 10-15..20 (E188 + E202). Forgot `--max-per-url 1` → tool default 2/URL/day (urban-tattoos ×6, gshade ×6 over 3 dates); inside the standing approval, noted on the ledger. E206 Pip leg (Singapore Direct) not started — due 10-21.
- Before → after: runway 1.99 → 3.02 d (35 → 53 rows; bound seven_per_day_cap, stopped at the ~3-day target, not hard_cap_21); SEO 74 → 99 (0/18 → 18/18); read-back 18/18, created_at ≤ 2025-10-28. Inventory 10-21..23 is again 100% top-ups.
- Verdict: MORE DATA (read 10-22; treated WoW ≥ site WoW, re-pulled)
- Next time: always pass `--max-per-url 1`; and when the scoreboard rounds to "≈2 d" the gate still fires at 1.99 — quote the tool's two decimals, never the rounded flag.

## 2026-10-14
- Tried: E202 top-up #14 (T0, SD-10 floor; apply ledger on main `db48455`): 21 sessions-ranked rows 7×10-18/19/20 — first run gated on the tool's pinterest-14d basis (1.10 d) while the scoreboard read 1.7 d; cross-run cap skipped 10-15/16/17 (E188). Same PR: E170 #11 KEEP, E77 KILL (Q24 dropped).
- Before → after: runway 1.10 → 2.19 d (21 → 42 @ 19.14/day); SEO 71 → 96 (0/21 → 21/21); read-back 21/21. Ranker 13 dests/81 ids, 63 writer rows dropped upstream. E170 #11: 7 dests 2,095 → 2,254 (+7.6%, 6/7 up) vs site Pinterest −0.8%. Writer: 147 rows inserted in 7d (21/day) but 136 at the 2025-01-01 placeholder and 0 real-dated on 10-15..21 — all 42 rows in the 14-day horizon are top-ups.
- Verdict: MORE DATA (read 10-21)
- Next time: the plugin dates a row only on its posting day, so a horizon-based runway can never see writer inflow; measure Q11 by rows dated ahead per day, not rows inserted.

## 2026-10-19
- Tried: E237 (T0, read-only): traced the digest's "34 rows dated 10-17 posted vs ≤7/date" before any top-up — `scripts/agents/pin-queue-day-trace.py` (rows by origin per Post Date vs Pinterest API pins). Graded E188. No top-up: tool gate 2.43 d (25 ÷ 10.29 pinterest-14d) ≥ 2.0.
- Before → after: 10-17 = 7 Pip E188 rows + 27 legacy rows of WP 33529 (`/sims-4-halloween-loading-screens/`, republished 10-14, rows created 2025-10-21) — the Pinterest API shows **7 pins** that day, so the 27 flipped `Is Posted` with no pin (ghost flips; a 10-11 plugin re-date of 25 rows did post 20). Q28 number (tool, 10-05→10-19): API 150 pins = 91 Pip top-up rows (61%) + 29 plugin new-post rows on 4 post days + 76 legacy re-dates, 55 of them ghost (10-05 23, 10-17 27); the queue-posted proxy reads 14.0/day vs 10.29 real. E188: treated 1,568 vs 1,485 (+5.6%) vs site +5.0% → KEEP by rule; post-window 10-15→17 671 vs 671 (0.0%) vs site +8.2%.
- Verdict: E188 KEEP (rule), no lift shown; E237 MORE DATA (read 10-26)
- Next time: a queue "posted" flag is not a pin — reconcile a per-date burst against Pinterest's own created_at before calling it a norm breach or counting it as drain.

_Older entries live verbatim in `archive/playbooks/pip-2026-10.md` (10-07, 10-12, 10-13) and `archive/playbooks/pip-2026-09.md` (≤10-04); nothing deleted._
