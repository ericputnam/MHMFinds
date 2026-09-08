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
