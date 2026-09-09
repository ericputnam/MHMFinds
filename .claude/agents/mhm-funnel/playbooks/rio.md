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

## 2026-09-09
- Tried: E30 — Patreon churn read + day-0 welcome-note draft (T0, `scripts/agents/patreon-churn-read.ts`, `reports/funnel/drafts/patreon-welcome-note-2026-09-09.md`). Read-only Members API pull, aggregates only (no emails/tokens printed).
- Before → after: 47 paid ($1×8, $3×39) $125/mo · 225 former · 17 declined · 5,116 free. Cancel cohort by charges paid (n=223): 1 → 88 (39%), 2 → 44 (20%), 3 → 33 (15%), 4–6 → 34, 7–12 → 17, 13+ → 7; ≤2 charges = 132 (59%), median 2. First-30-day churn 84/250 = 34%. Joins vs cancels Jun–Aug 56/29 (18.7 vs 9.7 per month); Sep to date 5/16. Site linkage: 11 `Account.provider='patreon'` rows (5 on 09-08), **0** belong to a currently paying patron, `isPremium`=2. E24 interim: `patreon_click` 27 events (~20 users, all on `/go/`), `member_skip_countdown` 1.
- Q4 step 1 via API: $3 tier description edited 2026-09-09T01:35Z (perk line applied, 6 min after PR #65 merged); $1 tier still `published=true` with 8 patrons; newest post is 09-08 "Y2K Belts Lookbook" — thank-you post not posted. 1 of 3 steps done.
- Guardrail: GREEN is demand-side. Source: repo Mediavine client (`earnings`), MCP unavailable. Daily eCPM $0.70–0.85 (08-31→09-04) → $0.91/$0.92/$0.95 (09-05/06/07) while paid imp/pageview stayed 11.1–13.1 and viewability 51.5–53.9% — price per impression moved, fill and layout did not. Same-path page RPM up on 100/109 paths 09-05→09-07 vs prior week (homepage $7.29→$15.12, not finalized). The +34.5% RPM read is against a 4-Monday base that includes the 08-31 $11.96 trough; every 09-08 deploy postdates the judged day. E5 counter 0/5 (09-01 $13.75 was the only sub-$14 weekday; 09-02→09-07 all ≥ $14.21).
- Verdict: MORE DATA (read on 2026-10-07 — keep the welcome note if post-note first-30-day churn ≤ 24%, or ≥ 1/3 of new paid patrons connect on-site within 7 days; kill by 2026-10-22 if neither).
- Next time: (1) attribute a green to demand only after checking eCPM vs imp/pv vs viewability separately — a layout change moves imp/pv, a demand change moves eCPM; (2) Mediavine `pages()` keys are `page_revenue`/`rpm`/`pageviews`/`cpm`/`impressions_per_page_view`, and the JWT lives in `scripts/mcp-mediavine/.env.local`; (3) a decision threshold set at 40% when the numbers land at 39%/34% is a threshold chosen after the fact — pick the rule from the question ("where is the leak") before the read, not from the first printout; (4) the Patreon posts endpoint paginates oldest-first, sort client-side.

## 2026-09-08
- Tried: Q5 end-to-end verification found the approved membership feature dark for visitors and fixed it forward (T1, PR #62, `032543e`, merged same day as a fix-forward on an approved Tier 2 package — Quinn flagged the skipped 24h veto in the digest). `isMembershipEnabled()` read the flag as `env[MEMBERSHIP_FLAG]`, which Next.js never inlines into client bundles, so the browser evaluated `undefined` for ~22h while `/api/auth/providers` listed `patreon` the whole time.
- Before → after: `/go` CTA / Connect button / patron link rendered on production: false → true (headless render 07:09, served chunk `page-c26189679e4c0033.js`); `patreon_click` / `member_skip_countdown` / Patreon-linked accounts 0 / 0 / 0 (09-06→09-08) → read 2026-09-15. Non-ad $126/mo gross (46 paid: $1×6, $3×40; Q4 ladder still not applied in Patreon). Homepage MV page RPM $9.88 (08-31→09-06) vs $8.73 prior 7d — the E18 read baseline. `/go` per-page RPM: source unavailable (Mediavine `/reports/pages` caps at the top 150 paths); ceiling by GA4 236 pv × $15.67/1000 ≈ $3.70/7d.
- Verdict: MORE DATA (read on 2026-09-15 — keep if ≥1 `patreon_click` on /go and session RPM within ±5% of $15.67)
- Next time: (1) any `NEXT_PUBLIC_*` flag must be read as a literal `process.env.NEXT_PUBLIC_X` on the client path — guard it with a source-level test; (2) day-1 verification of a client-facing feature means a logged-out headless render of production plus grepping the served chunk for the inlined value, not a curl of a server route; (3) when the ad-revenue read for a page is impossible, say "source unavailable" and use GA4 pageviews × site RPM as an explicit upper bound; (4) ESM scripts resolve `node_modules` from the script's directory, not `NODE_PATH` — run Playwright helpers from inside the worktree. E5 escalation counter 0/5 (09-03 $14.64, 09-04 ≈$16.30, 09-05 $18.05). Affiliate cut-or-kill read still 2026-09-15 (12 clicks/7d, $0 EPC, 56/30d).

## 2026-09-07
- Tried: membership via Patreon OAuth as a ready-to-approve T2 package (PR #52, branch funnel/rio/membership-patreon-oauth, not merged): Patreon provider in NextAuth + /go countdown skip + member badge, all behind NEXT_PUBLIC_MEMBERSHIP_ENABLED; pricing knob PATREON_MEMBER_MIN_CENTS. Package: reports/funnel/drafts/membership-patreon-oauth-2026-09-07.md → operator-queue Q5.
- Before → after: non-ad $127/mo gross (47 paid: $1×7, $3×40, $5×0; 5,268 free) → target $200/mo by 09-30 (Q4+Q5: relaunch A targets 90 patrons ≈ $475/mo). Ad-loss bound: /go/ 725 GA4 pageviews/28d × $15.60 = ≤ $11.31/mo for the whole page.
- Guardrail, first green since 09-02: 09-05 $269.49 (+12.0% same-weekday), RPM $18.05 (+1.8%), sessions +10.1%, 3-day +1.6%. 28d $5,628.24 (−7.6%) is the E9/E13 mechanical roll-through and is improving: −10.4% (09-04) → −9.7% (09-05) → −7.6% (09-07). E5 counter 0/5 (weekday RPM 09-03 $14.64, 09-04 ≈ $16.30 derived from the guardrail 3-day window, 09-05 $18.05). Mediavine MCP unavailable; figures from guardrail/scoreboard JSON + GA4.
- Finding: 0 Google/Discord-linked accounts ever (all 1,533 are credentials) — signIn pre-create + no allowDangerousEmailAccountLinking → OAuthAccountNotLinked. Separate T2.
- Verdict: MORE DATA (read on 2026-10-07, 30 days after the flag flips).
- Next time: pitch Q4 and Q5 as one decision.

## 2026-09-01
- Tried: nothing yet — team chartered today. Read `../charter.md`, `../autonomy.md`, `../operating-model.md`, `../targets.json`, and `reports/growth/fact-base-2026-09-01.md` before your first move.
- Before → after: baseline in `../targets.json`
- Verdict: —
- Next time: your first move should be the top item in your agent file's "levers" list unless the scoreboard shows a 🔴 in your area.
