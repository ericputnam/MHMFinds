# Pip playbook — archived entries (verbatim)

Moved from `playbooks/pip.md` on 2026-11-04 to keep it under its 10,000-byte budget.

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
