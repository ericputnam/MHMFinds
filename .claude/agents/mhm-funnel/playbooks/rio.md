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

## 2026-09-26
- Tried: no code move (E119 unused). E65 graded; Q4 `--anchor rename` pre-read attempted twice (fetch failed; terminated at 240 s).
- Before → after: patreon_click 3.43 users/day (09-12→09-18) → 7.00 (09-20→09-25: 7,9,5,5,7,9); /go pv users 24→39/day; click rate per pv user 22.1%; RPM 100.6% of $17.24. After-wait 2, 3 users on 09-24/25.
- Verdict: E65 KEEP. E99 reads 10-01, E108 10-02/10-09, Q16 silence 09-29.
- Next time: (1) `customEvent:source` is not a GA4 custom dimension — connect vs join was never splittable; ask the operator to register it; (2) the pre-read's `Promise.all` throws away the reachable half on a degraded morning — make it `allSettled` with exit 2 before the 10-02 read.

## 2026-09-25 — E108: the operator renamed the tiers on a HOLD
- Tried: `RENAME_WATCH` constant (anchor 2026-09-25T04:54:06Z, thresholds imported from `Q4_GATE`) + `--anchor rename|<ISO>` on `patreon-q4-gate-preread.ts`; before-snapshot report; three operator drafts moved to Espresso Shot / Cappuccino / Large Latte. Grep found zero on-site tier-name copy, so no app change.
- Before → after: 55 paid ≈ $153.50/mo, joins 7d 4, cancels 7d 0, connected 0/55 → same (snapshot only; reads 10-02 / 10-09). Q4 gate still HOLD on the connected leg (joins 22.7/mo PASS, connected 0/55 FAIL); renames are a fact, $10 tier stays Tier 2. E65 pre-read 6.6 patreon_click users/day (keep ≥ 4.375). E99 after-wait 2 users on 09-24.
- Guardrail: GREEN from files (MCP unavailable) — 09-22 $192.44 +6.2%, RPM +9.8%, 28d +5.1%.
- Verdict: shipped, PR #177 1bb79f6, deploy-verify PASS. Cancels are a floor until the 10-01 charge run — do not read the rename on 10-02 as "no churn".
- Next time: when the operator acts ahead of a gate, record the anchor and the pre-committed revert rule as a tool the same day; a threshold that lives only in a decision paragraph cannot be re-run. Operator-queue Q4/Q16 text and the "Operator-only actions" line still say "Support Tier"/"Tip Jar" — Quinn's daily PR should update to "unpublish the $1 'Espresso Shot' tier" and "paste the welcome note into the $3 'Cappuccino' tier". `gh pr merge --delete-branch` exits 1 when `main` is checked out in another worktree even though the merge succeeded; check `gh pr view N --json state` before retrying.

## 2026-09-24
- Tried: E99 — `/go` member CTA kept visible after the countdown (T0, PR #169, e1b5e94). The Connect / Become-a-patron line lived only in the countdown branch, so it unmounted when "Continue to Download" appeared: headless render of a logged-out `/go` showed connect=true at t+4s and connect=false continue=true at t+13s. New line under the button, own event `patreon_click_after_wait`, gated `canProceed && mod && membershipOn && !isMember && !showPostConnect`; scoreboard capture list carries it; 5 guard tests red on pre-fix main. Production render after deploy: afterWait=true at t+13s, .mv-ads 1, aside 1. Merged onto the unbuildable main (10:03→10:12, #167×#168); ledger row is Quinn's 10:20 `--check` PASS on the #171 build.
- Before → after: patreon_click users/day 8.75 (09-08→09-11, two outlier days of 13 when /go pv spiked to 112/65) → 5.57 (09-16→09-22); click rate per render user 11.8% → 9.5%, per page_view user 28.7% → 28.1% (flat); /go render users 74 → 58.7/day (−21%) while mod-page page_view 877 → 888/day. The drop is /go reach, not CTA copy — E65 keep rule (≥4.375) is met. After-wait clicks 0 → read 10-01.
- Guardrail: GREEN, demand-side — 09-22 $192.44 (+6.2% same-weekday), RPM $16.79 (+9.8%), sessions −3.2%; monetizable RPM $28.75 vs $27.43 30d; 7d $1,490.45 (−0.7%), 28d $5,904.06 (+5.1%). Mediavine MCP unavailable in-session.
- Verdict: MORE DATA (E99 read 10-01; E65 09-26; E55/E60 09-29; E74 10-06).
- Next time: (1) a CTA that only renders inside a timed branch has a lifetime equal to the timer — render at t+timer+3s before calling placement fine; (2) Patreon clicks are now two events — add `patreon_click_after_wait` to any denominator that sums them, never fold it into E65's read; (3) `gh pr merge --delete-branch` fails when another worktree holds `main`, and the retry loop then reports "already merged" forever — merge in the foreground, delete the remote branch via the API.

## 2026-09-23
- Tried: E89 — sponsorship media kit + outreach package (T0 draft, `reports/funnel/drafts/sponsorship-media-kit-2026-09-23.md`; sending and price are T2, the operator's). Also #148 rebased on main and merged `c1c0827` (E88 package + Q4 HOLD read + both E60 windows); silence default added to the E88 draft.
- Before → after: sponsorship **$0/mo, 0 outreach emails ever** (2026-09-23) → read 2026-10-07; keep if ≥10 sent AND (≥1 interested reply OR ≥1 call); 0 sent by 09-30 → re-pitch once, drop 10-07. Kit numbers (GA4 08-24→09-20): 354,348 sessions · 206,979 users · 563,617 pv · desktop 93.6% · US 39.3% / UK 6.6% / BR 5.0% / FR 4.5%; two prices for the operator: $300 (hub) / $750 (site).
- E60 early read (both windows in #148, pulled 09-22 at equal maturity): blog $12.26→$14.08 (+14.8%), home $9.65→$9.16 (−5.1%), unseen remainder $10.46→$8.95 (−14.4%) while its pv share rose 47%→57%. Decision: the under-earner is the long tail (`/mods/[id]` + small posts) and the homepage serves 24% fewer imp/pv than an article (11.14 vs 14.72) at the best viewability (69.5%) — both fixes are ad geometry (T2, SD-5); no T0 copy fix exists, hence E89 by $/mo.
- Guardrail: GREEN, traffic-side — 09-21 $188.32 (−6.0% same-weekday) on sessions −8.1% with RPM $16.03 (+2.9%); 3-day revenue +0.1%, 3-day RPM +2.0%; MV health ok; 28d $5,908 (+4.7%). Monday 09-21 is judged against a 4-wk mean that contains Labor Day 09-07 — sessions, not yield.
- Verdict: MORE DATA (E89 10-07; E88 D+7 from the post; E65 09-26; E55/E60 09-29; E74 10-06).
- Next time: (1) the live playbook hit 14,012 bytes on main after #148 (file cap 10,000; the budget test did not fire) — `wc -c` it before every commit; (2) GA4 age/gender is thresholded to 0 rows for this property — never claim demographics in a kit.

## 2026-09-22
- Tried: E88 — the Q4 gate's formal read + the smaller re-pitch (T0 paper trail; the ask itself is T2, operator's voice). `patreon-q4-gate-preread.ts` run for the gate date → `reports/funnel/patreon-q4-gate-preread-2026-09-22.md`, exit 0, decision line = hand rule; re-pitch package `reports/funnel/drafts/patreon-connect-post-2026-09-22.md` (one Patreon post…
- Q4 gate 2026-09-22 (rule pre-committed 09-08, `Q4_GATE`): paid joins since 09-08 **10 in 14.5 d = 21/mo (PASS)** · paid-and-connected **0 of 54 (FAIL)** · cancels since anchor 1 = 2.1/mo (revert copy: no; floor until 10-01) → **HOLD**, third in a row. Linked accounts 52 → 59 in 24 h (7/day, vs 3.9/day 09-08→09-21), in-campaign 4 → 6, still 0 paying. The 5…
- E74 day 1 (live 09-21 08:33Z; GA4 unfinalized, today partial): `patreon_post_connect_view` 7 events / 5 users on 09-21 + 1/1 on 09-22 = **6 users saw the post-connect state**; `patreon_follow_click` **0**, `patreon_reconnect_click` **0** (real zeros — both `gtag` calls are in `GoClient.tsx` lines 94/398); `patreon_click` 12 events / 9 users on 09-21 (09-1…
- Before → after (E88): paid-and-connected **0 of 54** (2026-09-22 pre-read 10:51Z); `member_skip_countdown` 0 events in the 14 d to 09-22 → read 7 days after the post goes out (D+7; 09-29 if posted today). Keep/proceed if ≥ 18 of 54 (exact 1/3) → Q4 renames + $10 tier proceed on the pre-committed rule; ≥ 1 → channel works, welcome note next; 0 → drop count…
- Guardrail: GREEN, mix-side — 09-20 $265.23 (−0.8% same-weekday), RPM $17.14 (−2.7%), sessions +2.0%; 3-day revenue +2.4%, 3-day RPM +3.1%; MV health ok; 7d $1,464.96 (−8.7%), 28d $5,925.63 (+5.1%). **Session RPM −4.7% WoW ($17.83 → $16.99) decomposes as page RPM −2.3% ($11.23 → $10.97) × pageviews/session −2.4% (1.587 → 1.549).** Inside page RPM the head…
- Verdict: MORE DATA (E88 reads D+7 from the post; E74 10-06; E65 09-26; E55/E60 09-29).
- Next time: (1) verify a client-rendered CTA with a headless render, never curl — production `/go` HTML carries the homepage `<title>` and no "Connect Patreon" string, the rendered page has both (status 200, Connect ×1, `.mv-ads` 1, `aside#secondary` 1, 6 s settle); (2) one-off `tsx` reads must live inside the worktree (`scripts/agents/_rio_tmp_*.ts`, dele…
