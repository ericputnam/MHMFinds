<!-- context budget: 10000 bytes, enforced by __tests__/unit/funnel-context-budget.test.ts; archive to mhm-funnel/archive/, don't append -->

# Funnel Team Scorecard

Quinn appends one block every Monday. Newest at the top. Grading: 🟢 at/above
target · 🟡 within 10% · 🔴 more than 10% below. Silence is not green.

## Template

```markdown
## Week of <YYYY-MM-DD>

**Headline:** total revenue 28d $N vs expectation $N (🟢/🟡/🔴) · sessions 28d N vs expectation N (🟢/🟡/🔴) · owned-audience net adds N/wk vs target N (🟢/🟡/🔴) · non-ad revenue $N/mo vs $N (🟢/🟡/🔴)

| Agent | KPI | Target | Actual | Grade | Moves shipped (T0/T1) | Note |
|---|---|---|---|---|---|---|
| Pip | sessions by channel 7d | | | | | |
| Sage | organic + AI-referral sessions 28d | | | | | |
| Nova | pages shipped / creators onboarded | | | | | |
| Cass | owned-audience net adds 7d | | | | | |
| Rio | non-ad revenue / mo | | | | | |
| Rowan | returning-visitor share / engaged sessions | | | | | |
| Ops | run success rate / ledger completeness | | | | | |

**Experiments graded:** KEEP … · KILL … · EXTEND …
**Biggest risk:** …
**Top 3 bets next week:** 1) … 2) … 3) …
**Operator queue:** N open, oldest N days
```

---

## Week of 2026-10-19 (covers 2026-10-12 → 2026-10-18, judged on data to 10-17)

**Headline:** total revenue 28d $5,876 Mediavine (09-20→10-17) + ≈$144 non-ad ≈ $6,020 vs expectation $5,934 (🟡 Mediavine alone 99.0% of line; −0.7% vs prior 28d) · sessions 28d 362,747 vs expectation 355,205 (🟢 102.1% raw — ON LINE run 17 — but ≈96.8% ex the Singapore Direct crawler, E236: 🟡 on the human read) · owned-audience net adds 247/wk vs 200 (🟢 124%) · non-ad revenue $156/mo (58 paid) vs $450 (🔴 35%, B2 MISSED for October; affiliates-only through 10-31)

| Agent | KPI | Target | Actual (7d to 10-17) | Grade | Moves shipped (T0/T1) | Note |
|---|---|---|---|---|---|---|
| Pip | sessions by channel 7d | hold ≥ Aug run-rate (~92K/7d) | 95,808 (+11.8% WoW); Pinterest 59,016 (+4.4%); Bing 15,214 (+3.2%); Direct 12,514 (+115%, +6.1% ex-crawler) | 🟢 104% (🟡 ex-crawler) | 7 merges | Runway 2.4 d (from 1.4); E181 KILL as a lift claim; the "writer dead" 🔴 was a publish-keyed false alarm (E230). Q28/Q30 are the two structural levers and both sit with the operator. |
| Sage | organic + AI-referral sessions 28d | AI ≥385/7d by 10-19 (E71 → 10-24) | google_organic 2,910 (+4.6%); ai_referral 249 (−18.1%, OpenAI UTM window E224 — not comparable); GSC clicks 28d 2,979 (+23.7%) | 🟡 | 7 merges + T1 #335 eyes-cc hub (merges 10-19) | E171 indexed but 27 impr at pos 32 → EXTEND 11-01; Q-E21 closed 10-19 (hold, re-read 11-02). Next hubs blocked on catalog quality (gameplay ≈570 impr → Rowan isNSFW pass 10-19). |
| Nova | pages shipped / creators onboarded | creators >0 | creators 2 (1 with ≥1 approved); submissions 7d 0; 7 pending (15 d, Q26 dropped); /creator/* guard 103.0% PASS; new mods 70 from 3 posts (23.3/post, flat) | 🔴 | 8 merges (incl. #337 fix-forward of #330's 12 conflict-marker lines) | E232: new-mods −38% is cadence (5→3 posts), ingest 7/7 clean. E172 CLOSED. Operator's #339 (10-18) gives claimed creators a page from 1 mod. |
| Cass | owned-audience net adds 7d | 200/wk (B1) | 247 (162 accounts + 85 email); capture 2.58/1K (from 1.47); subs by source: signup-optin 148 | 🟢 124% | 6 merges + T1 #328 invite-01 (merges 10-19) | E205 KEEP (153/153), E118 KILL, E184 EXTEND 10-29 (issue 05/06-run-1: 0 sessions from 196 sends; run 2: 30 from 53 → inbox-placement read before issue 07). |
| Rio | non-ad revenue / mo | $450 (B2) | $156 public (58 paid: $1×12, $3×43, $5×3); paid joins/cancels 7d 2/0; connected 5/249; affiliate clicks 7d 7, $0 | 🔴 35% | 7 merges (verdict/paper) | B2 leg 2 MET 10-15 → affiliates-only October; E227 leg 1 MET ×4 (ex-segment guardrail agrees with hand read); E220 KEEP final; Q29 (Amazon tag) with the operator. |
| Rowan | returning-visitor share / engaged sessions | 55% by Dec (longRange) | returning 49.6% (from 53.6%); pages/session 1.51; engagement 69.0%; favorites +744 (from +546) | 🟡 90% | 7 merges + 2 Supabase applies (E235 30 rows) | E186 KEEP (80/80), E235 clutter/body-preset map (disagreement 296 → 274). Returning share fell with the +11.8% session week — new-visitor mix, not a product signal yet (read 10-25). |
| Ops | run success rate / ledger completeness | 100% / 100% | run success 14d 57.1% (trailing, carries the 10-05→10-10 misses); liveness 7/7 this week; ledger: every merge 10-12→10-18 has a row | 🟡 / 🟢 | 7 merges — 12.1% of 58 (cap 20%) | E236 direct_ex_sg_bot row + 28d headline ex-segment; E148/E187/E229 KEEP; the loop ran every morning this week (vs 2/7 last week). |

**Experiments graded (10-13 → 10-19):** KEEP E136, E138, E170 #11, E176, E177, E178, E180, E158 (closed), E62, E166 (closed), E220 (final), E186, E148, E187, E229, E205 · KILL E77, E152, E159, E118, E181 (as a lift claim) · EXTEND E143→10-27, E144→10-28, E171→11-01, E184→10-29, E71→10-24 (final) · legs MET: E192 10-13, E199 10-14, B2 leg 2 (10-15), E227 ×4 · CLOSED E172 (with Q26), E174 · NOT-RUN E167 · 10-19 grades (E188, E193, E194, E227/E234 legs) are in `digest-2026-10-19.md`.
**Biggest risk:** the sessions line is being held up by traffic that cannot earn — raw 102.1% of line vs ≈96.8% ex the Singapore Direct crawler (4.7% of sessions, 1 pageview each, $0), with revenue at 99.0% telling the same story; until Q30 is answered every ON LINE verdict carries a ≈5-point fiction. Second: B2 at 35% with affiliates-only as the October plan and 7 clicks / $0 earned.
**Top 3 bets next week:** 1) Traffic honesty — Q30 decided (challenge SG or Mediavine ticket) and the guardrail's ex-segment leg wired once the two lines agree 7 mornings (Rio, 10-24). 2) Capture — invite-01 live send (22 subscribers without accounts, read 10-26) and inbox placement fixed before issue 07 on 10-22 (Cass). 3) Catalog quality as the search lever — isNSFW pass unblocks the gameplay hub (≈570 impr/28d), eyes-cc hub live (Sage/Rowan, reads 10-20 / 11-01).
**Operator queue:** 3 open T2 (Q30 drops 10-23, Q29 10-22, Q28 10-21 — oldest Q28, 5 days). Q-E21 closed 10-19 under the 7-day rule; Q26/Q20 dropped 10-18.

---

Older blocks (Week of 2026-10-12, Week of 2026-09-28, Week of 2026-09-21, Week of 2026-09-07, Week of 2026-09-01 baseline) live verbatim in `archive/scorecard-2026-09.md`.
