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
