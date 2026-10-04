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

## 2026-10-02 — yellow diagnosis (WATCH); E108/E125 read; E160 closed
- Tried: split the 09-30 yellow (−15.8% rev, −15.2% RPM, Wed) into requests vs fill vs CPM using `/reports/pages` `impressions` + `unfilled_impressions` (top-25) and site-level `paid_impressions_per_pageview` + `cpm` (Mediavine MCP unavailable; `scripts/mcp-mediavine/client.ts` direct). E160: 27 `amzn.to` occurrences on post 5848 = 10 distinct short links, 10/10 resolve (first hop only) to `tag=musthavemod04-20` — no edit.
- Before → after: fill 68.2% (09-23) → 52.3% (09-30); unfilled/pv 5.3 → 6.6 with requests/pv flat; imp/pv 11.05 → 9.60; CPM 0.96 → 0.89; GA4 pages/session 1.565 → 1.576; every partner down on impressions at flat CPM. E108: paid joins 9/7.2 d = 38.1/mo pace (floor 17), cancels 0 → KEEP joins, cancels 10-09. E125: KEEP 1/2.
- Verdict: demand-side (end-of-quarter fill), WATCH, no rollback. Trigger: finalized 10-01 AND 10-02 both <90% revenue with imp/pv <10.0 → ESCALATE 10-03.
- Next time: read fill rate before RPM — a page-RPM drop with flat requests/pv and flat CPM per partner is never on-site; the pages report has no host field, so the host leg of a 301 must be read from GA4 pv/session, not Mediavine. Run the Patreon pre-read with `-r dotenv/config` or it reports "token not set".

## 2026-10-01 — E153: E134 "pipe confirmed fixed" read; E99 / E146 graded
- Tried: `affiliate-pipe-lib.ts` + `affiliate-pipe-read.ts` + 17 tests (T0, PR #241, c039df3). Rule frozen in `PIPE_RULE`: from 09-29 (first full day after #214), on-site `gtracing` clicks ≥10 AND Impact 18111 ÷ on-site ≥50 % (exact fraction) → confirmed, E134's 30-day $0 KILL clock starts; <10 → not-yet; share under floor → leaky; Impact leg down → unknown, never a verdict. Impact GET bounded 30 s, every print through `redactError`.
- Before → after: pre-fix 07-01→09-28 Impact 9 / on-site 110 = 8.2 % → post-fix 09-29→09-30 2 / 2 = 100 % but NOT-YET (8 clicks short ≈ 8 d at 1/day). E99 KEEP: after-wait 23u / 6 reported d = 3.83/day (keep ≥1.0; 3,4,4,8,2,2). E146 KEEP (6/6 reported, render denominator). E108 pre-read: joins since 09-25 5 in 6.2 d = 24.5/mo PASS, cancels 0 (floor until the 10-01 charge run), connected 1/56 FAIL. Guardrail GREEN from files; MCP unavailable.
- Verdict: shipped, deploy-verify PASS 07:05. Reads: E108 10-02, E134/E153 10-12.
- Next time: (1) `partner_performance_by_day` silently ignores `CAMPAIGN_ID` (its filters are Brand/dates only) — by-program per window is the only per-campaign read; (2) `affiliate-daily-pulse` writes to the operator tree uncommitted — a report nobody commits is not a record; (3) 2 of 2 is not a rate — print the click floor before the share; (4) the merge gate's check-then-act race runs both ways: an open gate closed under me 2 s later when #236 landed — loop the gate, never assume one green poll holds.

## 2026-09-30 — E146: /go read on the render denominator; B2 September graded
- Tried: go-funnel-read + lib, 17 tests, PR #232; first live run counted today's partial day (E99 3.5/day) — fixed to 4.2 before shipping. Q17 kit + emails re-checked (PR #233).
- Before → after: page_view÷render 41.4% (227/548); E99 21u/5d = 4.2/day ON PACE (keep ≥1.0). B2 Sept: 49→55 paid, $129→$149 (+15%) vs $200 MISSED; connected 0/107. Guardrail GREEN from files.
- Verdict: shipped, reads 10-01 (E99) / 10-06 (E74) / 10-12 (E134).
- Next time: (1) a partial today needs its own state or it drags every mean; (2) `redact()` treats `E99=…` as KEY=value — keep printed report keys lowercase.

## 2026-09-29
- Tried: E139 — bounded every `patreonGet(` caller (6 calls / 4 scripts) with `signal: AbortSignal.timeout(nextPageTimeoutMs(...))`, one exported helper + two constants in `_patreon-auth.ts`, commented `PATREON_ENV_FILE` in env.example, filesystem scanner (vacuity ≥7 calls / ≥5 files) (T0, PR #220, d8c04ba). 3/3 red on 4ba11cc; live churn walk 29 s.
- Before → after: unbounded calls 6 → 0; /go reach re-read: page_view 342 → 175 → 324 by week, `render` users 531 → 408 → 613 — the "−49 %" was a stale w1→w2 read against the E40 spike week.
- E55 KEEP (CTR leg 59/30d grid-only vs 51; site page RPM $11.10 → $11.17); E60 KEEP (14/14 ×2, home coverage 81.7 %; remainder $8.74 below its $10.12 floor = long-tail geometry, T2).
- Guardrail: GREEN from files — 09-27 $299.13 (+10.9 %), 28d $6,061.48 (+7.0 %); MCP unavailable.
- Verdict: shipped, PASS 06:56. Reads: E99 10-01, E139 10-06, E134 10-12.
- Next time: (1) a WoW "−49 %" quoted from a note is a window, not a trend — re-pull three weeks before diagnosing code; (2) `/go` GA4 page_view captures ~40 % of `render` users every week (205/531, 248/613) — use `render` users as the /go denominator until the page_view gap is explained; (3) Cass #219 was still open at 06:51 when the gate opened — merged sixth by the gate, not by the roster; no file overlap.

_Older entries (up to 2026-09-28) live verbatim in `archive/playbooks/rio-2026-09.md`; nothing deleted._
