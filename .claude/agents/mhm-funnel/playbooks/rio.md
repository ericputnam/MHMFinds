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

## 2026-09-29
- Tried: E139 — bounded every `patreonGet(` caller (6 calls / 4 scripts) with `signal: AbortSignal.timeout(nextPageTimeoutMs(...))`, one exported helper + two constants in `_patreon-auth.ts`, commented `PATREON_ENV_FILE` in env.example, filesystem scanner (vacuity ≥7 calls / ≥5 files) (T0, PR #220, d8c04ba). 3/3 red on 4ba11cc; live churn walk 29 s.
- Before → after: unbounded calls 6 → 0; /go reach re-read: page_view 342 → 175 → 324 by week, `render` users 531 → 408 → 613 — the "−49 %" was a stale w1→w2 read against the E40 spike week.
- E55 KEEP (CTR leg 59/30d grid-only vs 51; site page RPM $11.10 → $11.17); E60 KEEP (14/14 ×2, home coverage 81.7 %; remainder $8.74 below its $10.12 floor = long-tail geometry, T2).
- Guardrail: GREEN from files — 09-27 $299.13 (+10.9 %), 28d $6,061.48 (+7.0 %); MCP unavailable.
- Verdict: shipped, PASS 06:56. Reads: E99 10-01, E139 10-06, E134 10-12.
- Next time: (1) a WoW "−49 %" quoted from a note is a window, not a trend — re-pull three weeks before diagnosing code; (2) `/go` GA4 page_view captures ~40 % of `render` users every week (205/531, 248/613) — use `render` users as the /go denominator until the page_view gap is explained; (3) Cass #219 was still open at 06:51 when the gate opened — merged sixth by the gate, not by the roster; no file overlap.

## 2026-09-28 — E134 items B+C: shared validator + GTRacing DB repair
- Tried: shared affiliate-link validator (T1, ok/broken/unknown, unknown never writes) wired into the 3 call sites that set `validationStatus:'validated'` unconditionally; query-derived GTRacing DB repair (T0/1, operator pre-approved, ran ahead of the source-fix merging) with an expected-shape abort-gate, not a hardcoded id list (PR #214, `f47abfe`).
- Before → after: 5 GTRacing rows deep-linking to the Impact-rejected `gtplayer.com` host, zero link checks anywhere → 4 "GT890MF Edition" rows host-fixed to `gtracing.com` (active), 1 bare-slug row retired (still 404 post-fix). 1 deliberate verification click: `irclickid=`/`irgwc=1` present, landed on `deal.gtracing.com` HTTP 200. 30 new tests incl. a filesystem-walking scanner (>20 scripts).
- Guardrail: not re-read (no ad/pricing touch). deploy-verify PASS 22:41 (f47abfe), 5xx=0.
- Verdict: shipped. E134 stays PENDING, reads 2026-10-12. Optimizer launchd job stays paused until confirmed durable.
- Next time: (1) a red-before-green proof via `git show HEAD:<file>` stops proving anything once the fix and test share a commit (or a squash collapses both) — HEAD becomes the fixed content and the check passes for the wrong reason; freeze the pre-fix snippet as an inline fixture instead. (2) confirm a full-suite failure is outside your diff (`git diff origin/main --stat`) before treating it as yours.

## 2026-09-28
- Tried: E131 — Patreon refresh persists to the operator's `.env.local` (linked worktree → main checkout via the `.git` gitdir pointer; `PATREON_ENV_FILE` override; else refuse before the token endpoint), adopt-before-refresh, `patreonGet(url, init)` with `AbortSignal.timeout`, bounded scoreboard walk (T0, PR #201, `f2c8244`). 9/10 guard cases red on `e765da5`.
- Before → after: refreshes persisted to the operator repo 0 (none ever; tokens issued 09-07, first expiry ≈10-07) → read 10-09. Live: worktree → `/Users/eputnam/java_projects/MHMFinds/.env.local`, `/tmp` → null, 1 ms signal → TimeoutError, real GET 2.5 s no 401. E55 pre-read: site page RPM $11.10 → $10.98, remainder $10.43 → $10.23 (both ≥ floor); E60 tool 14/14 × 2.
- Guardrail: GREEN from files — 09-26 $295.20 (+10.7 %), RPM $19.38 (+4.9 %), 28d $5,995.90 (+6.5 %); MCP not retried.
- Verdict: shipped; deploy-verify INCONCLUSIVE (curl leg failed on the runner's network, markers not judged) → hand smoke 14/14 OK with control 3/3, sidebar healthy. E55/E60 → KEEP on 09-29.
- Next time: (1) a helper whose persistence target is "cwd" must be asked which cwd every caller actually runs in before it is trusted with a single-use secret — the runner's copy-per-worktree made the default silently wrong for 8 of 8 daily callers; (2) INCONCLUSIVE is not PASS — run the two hand checks before quoting the row, and give the curl leg the same network control the smoke has.

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

_Older entries (up to 2026-09-23) live verbatim in `archive/playbooks/rio-2026-09.md`; nothing deleted._
