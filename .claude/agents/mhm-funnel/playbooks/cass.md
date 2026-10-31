<!-- context budget: 10000 bytes, enforced by __tests__/unit/funnel-context-budget.test.ts; archive to mhm-funnel/archive/, don't append -->
# Cass — Capture — Playbook

Your memory across runs. Append one dated entry per run, newest at the top,
**with a number**. "I think it worked" is not a learning. Covers capture: per-surface capture rates, email send stats, Patreon free-member funnel, what copy converted.

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

## 2026-10-31 — E305 connect opt-in copy A/B (T1, #414)
- Tried: split new accounts by sign-in provider before choosing a surface. Patreon sign-in made 52 of 102 accounts 10-24→10-30 and 1 of the 52 is subscribed; password sign-ups 21 of 50. The checkbox converts 46%; the /go box converts 3/77. Both arms drop "once a week".
- Before → after: 3/77 → read 11-15.
- Verdict: PENDING.
- Next time: split new accounts by provider before picking a surface — half of them never saw the offer that converts.

## 2026-10-30 — E294 Patreon members post draft (#405, paper)
- Tried: a monthly "what's new" post to all 6,352 free + 57 paid members, four traffic pages + sign-up, `utm_campaign=patreon-post-2026-11`; posting is Tier 2 (Q36). Rejected a "your favorites got updates" email after a counts-only query: 64 sendable subscribers with favorites, 54 with ≥3 new mods — ≈4 sessions at issue-07's 5–6 per 100 sent.
- Before → after: Patreon brings ≈199 untagged sessions/week with no post (GA4 W32–W43, range 138–256); the member list is ≈23× the sendable email list (6,352 vs 279, 159 sendable). Newsletter-07 tail is finished (run 2: 60 of 62 sent 10-25); issue 08 ≈11-06 is Tier 1.
- Verdict: MORE DATA (read D+7 after the post; NOT-RUN if Q36 drops 11-06).
- Next time: a favorites re-engagement email cannot move sessions until re-permission grows the list; #392's INCONCLUSIVE verify is covered by #400's PASS on 21540f1 (contains 7c40501) — no re-verify needed.

## 2026-10-29
- Tried: E287 /mods/[id] member opt-in capped at 3 unanswered views (T0). No run 3: tail dry = issue #8 to 71 (62 already got 07 in run 2, which deferred 0).
- Before → after: E198 4,168 views / 173 users (24 each) → 1 row in 14d = KILL. Issue 07: run 1 5 sess / 2 engaged per 100 (5 users, NL, 1/link, one hour = scanner shape), 0 DSN; run 2 6 / 2, 6 DSN of 62.
- Verdict: E247 KILL, E184 KILL → biweekly, E240 KEEP (cause = post-10-12 cohort), E254 KEEP, E219 KEEP, E287 PENDING (11-12).
- Next time: a "once" surface needs an impression cap; a click-only memory nags everyone who scrolls past.

## 2026-10-28
- Tried: E279 grid hearts (home, game hubs, collections, creators) → save-intent sign-up + resume, replacing `alert('Please sign in')` (T0). No newsletter run 3: run 2 deferred 0.
- Before → after: E191 offer sign-up completion 16/67 = 23.9% (was ~6%), so the copy was worth reusing. Issue-07 run 2 (post-10-12 cohort): 6 hard DSNs + 2 rejects = 8/62 = 12.9% vs run 1 0/100. E233 invite: 0/22 accounts.
- Verdict: E191 KEEP, E233 KILL, E279 PENDING (read 11-11).
- Next time: before building a new surface, grep for dead ends on the action that already makes accounts. Four grids answered a heart with an alert.

## 2026-10-23
- Tried: E247 issue 07 run 1 (T1, veto expired; the 10-22 run MISSED at preflight). Re-dry first.
- Before → after: 10-21 dry 202 → 10-23 dry 237 (+35, trips my >30 stop-and-ask). The 35 classified: 33 signup-optin, 33 distinct IPs, ≤2/10 min = two days of normal opt-ins. Run 1 sent 100/100, 0 failed, cursor = prediction. Tail 137 → run 2 defers 37.
- Verdict: E247 PENDING (10-29); E254 INCONCLUSIVE (tail-count leg MET, reach leg waits on runs 2–3).
- Next time: write a gate in per-day units ("> 2× trailing daily opt-ins × days since the dry"). A fixed +30 assumes the send keeps its date.

## 2026-10-21
- Tried: E254, the issue-07 pre-send check (T0, paper + DSN counter). Dry run + resume dry run on today's list, a DSN read since 10-19, and the invite subject added to `CAMPAIGN_SUBJECTS` (guard test was 1/3 red on main).
- Before → after: 10-20 plan was "100 + resume 90". 10-21: 202 recipients (+12 in a day), tail 102, so run 2 itself defers 2 and Thursday needs 3 runs. The 1 hard DSN since 10-19 (5.7.1) was invite-01, filed 'other'; its hash was already excluded. 0 new hashes.
- Verdict: PENDING (read 2026-10-23: 100% reached, 0 dupes, last run deferred 0).
- Next time: at ~12 opt-ins/day the list passes 200 weekly. Re-dry the tail the day before every send; the run count is a function of the list, not of last week's plan.

## 2026-10-19
- Tried: E240, the inbox-placement check on the cohorts that showed 0 sessions (T0). DSN counter now decodes encoded subjects (the weekly subject has an em dash, so all 13 weekly DSNs had read as "other"). Added `newsletter-cohort-diff.ts`, `--weekly --seed` (ships inert, Q31), and 10 bounce hashes added to the exclusion list.
- Before → after: run 2's "30 sessions" had 6 engaged. 20 came in the send hour and 7 came from IE at one hit per link: a link-scanner pattern. Cohorts: Gmail 82/96 in the old cohort vs 25/53 in run 2, 'other' domains 5 vs 17, hard DSNs 3.1% vs 13.2%. The only receiver verdict read spf=pass, dkim=none.
- Verdict: PENDING (read 2026-10-29 after issue 07).
- Next time: before comparing cohorts on sessions, split engaged from non-engaged and by hour. A cohort with more corporate domains "clicks" through link scanners.

## 2026-10-18
- Tried: E233 invite-01 sender (T1, PR #328, queued). It links to the sign-up, not `createPasswordToken('invite')`: reset-password POST needs a `users` row, and these readers have none. Graded E184 / E118 / E205.
- Before → after: the dispatch said "181 subscribers without accounts". The DB has 22 (159 of 181 have accounts). E184: issue 05 had 0 tagged sessions (<8), 1 unsubscribe. E118: 5/14 off-home = 35.7%. E205: 153/153 reached, 0 dupes.
- Verdict: E205 KEEP; E118 KILL; E184 EXTEND → issue 07 (≥8 engaged sessions, read 10-29); E233 PENDING (read 10-26).
- Next time: count the population a send reaches before quoting it. Also check that the redemption path accepts that population: an invite token is only as good as the route that consumes it.

