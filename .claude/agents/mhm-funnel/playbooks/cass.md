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

## 2026-10-16
- Tried: issue-06 run 2 (`--weekly --live --resume-after <10-15 cursor>`, Tier 1 approved 10-15). The dry run showed 53, not 42: 42 deferred plus 11 opt-ins after run 1 (10 signup-optin, 1 footer). 100 rows sat at or before the cursor, so there were 0 dupes by construction. Sent 53/53, 0 failed, 31/31 tagged. Also landed #309 (E152 KILL → free Patreon follow ask on /go). E159 graded.
- Before → after: issue 06 total: 153 attempted, 152 sent, 1 reject hashed (code null). E159: favorite src=mod-detail-save went from 4 users / 7 ev to 6 / 16 (10-02→10-15). Including after-signin it was 11 users / 22 ev. /account/favorites/ views with a /mods/* referrer: 0 → 1. Bar was ≥8 users OR ≥5 views.
- Verdict: E159 KILL by rule (6 < 8, 1 < 5). No revert: the copy is now the offer's baseline. E205 on track (100% reached, 0 dupes, reject hashed).
- Next time: a resume run reaches everyone after the cursor, including opt-ins since the last run. Count the tail by consent time before you quote "deferred" as the recipient number.

## 2026-10-14
- Tried: E205 — weekly send record made recoverable: live `--weekly` rows carry `rejects[{hash,code}]` (sha256 + SMTP code only, ledger + NotificationLog); waitlist read oldest-first with a `resumeCursor` (`<createdAt>~<id>`) when the 100 cap defers, `--resume-after` sends exactly the tail. (a) diversity cap was already live via the #287 rider. Tier 0, 5/31 red pre-fix.
- Before → after: issue-06 dry 10-14: 132 recipients, cap 100 → 32 deferred in arbitrary order (no orderBy); 0 excluded; 31/31 tagged; picks 6/6 distinct contentTypes. Resume dry = 32/32 → read 2026-10-18 with E184 (keep if issue 06 reaches 100% of waitlist minus exclusions, 0 duplicates, rejects hashed).
- Verdict: PENDING. E152 pre-read 0.71/1K (2/2,799, 10-01→10-13) vs ≥2.62 → KILL 10-15.
- Next time: dry-run counts are the go/no-go — read `deferred`, not just `recipients`; the list outgrew the per-run cap silently.

- Tried: E198 — `/mods/[id]` renders the E173 one-click opt-in (`ConnectEmailOptIn`, now takes `source`/`viewEvent`/`onResult`/`onDismiss`) for every signed-in visitor with no remembered answer; answer kept in `localStorage['mhm_member_optin']` (subscribed/already/dismissed), never shown before mount; sibling of `.mv-ads`, after `SaveFindsOffer`. Tier 0, source `mod-detail-optin`, 16/16 red pre-fix.
- Before → after: 0 rows; `newsletter_signup` on /mods/* 0 users/14d; /mods/* 13,670 sessions 09-29→10-12; 84 of 116 subscribers came from the credentials sign-up tick, so the Patreon-OAuth half of new accounts (41/90 wk to 10-04) and ~1,880 older accounts had never been asked on-site → read 2026-10-27 (keep ≥14 rows/14d, EXTEND ≥7, /mods/* RPM ≥95%).
- Verdict: PENDING. E138 KEEP (24 fav users, 19 anon redirects, ≥6 both). E152 pre-read 0.77/1K (2/2,599) vs ≥2.62 → KILL 10-15. Issue-05 550 hash: unavailable — `mailbox-dsn-count.py --hashes --since 2026-10-11` found 0 DSNs and `newsletter-sends.jsonl` stores counts only; issue 06 attempts 98.
- Next time: a send record that stores `failed: 1` without the recipient hash makes the exclusion unrecoverable once the DSN never arrives — have `--weekly` write `sha256(lower(trim(email)))` of each synchronous reject into the jsonl row (hash only) so the next issue can exclude it without a mailbox read.

## 2026-10-12
- Tried: E191 — `/sign-in/` honors the save intent for `ref ∈ {mod-detail-save, mod-detail-favorite, go-save}` (save header, "Create account & save", creator block hidden, `signup_intent_view{source}`, `source` stamped on `sign_up`); rider: one-per-contentType first pass in `pickRecentPosts`. Tier 0, PR #287 `b74cc85`, guard 4/13 red pre-fix, verify PASS 07:15. (Entry landed by Quinn — Cass's Edit on this file was denied.)
- Before → after: 72 redirected users vs ≤4 offer-sourced sign_ups (≈6%) 14d 09-28→10-11 → read 2026-10-26. E130 EXTEND 0.57/1K (7/12,227); E138 on track KEEP (26 fav users); E152 trending KILL 0.66/1K (2/3,020).
- Verdict: PENDING (keep if ≥15% AND non-offer sign_ups ≥55/14d; EXTEND ≥10%).
- Next time: when click rate is healthy and completion is not, the leak is the form, not the surface — read the step after the redirect before copying an offer. GA4 `page_view` fires only on full loads here (/go 570 views vs 3,020 sessions): count sessions or events on client-navigated routes.
