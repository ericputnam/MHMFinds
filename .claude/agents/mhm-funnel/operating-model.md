# Funnel Team — Operating Model

_Established 2026-09-01. Replaces `mhm-team/operating-model.md`._

> The old model was "green = silence." The new model is "every day, every agent
> moves something." Reporting is the by-product, not the job.

---

## 1. The daily run (automated, ~06:30 local, 7 days a week)

Triggered by the `mhm-funnel-daily` scheduled task. Five steps in order:

| Step | Who | What | Output |
|---|---|---|---|
| 1. Scoreboard | script | `npx tsx scripts/agents/funnel-scoreboard.ts` pulls GA4 sessions by channel, Mediavine revenue/RPM/health, GSC clicks, DB counts (users, subscribers, favorites, download clicks, affiliate clicks), Patreon public counts, blog cadence, Pinterest liveness. Writes `reports/funnel/YYYY-MM-DD.md` + `.json`. | The numbers everyone uses |
| 2. Circuit breaker | script | `npx tsx scripts/agents/revenue-guardrail.ts` — last finalized Mediavine day + 3-day window vs the same weekdays of the last 4 weeks; lists every production deploy / `functions.php` push in the window. 🔴 red-rpm with a deploy in the window → the runner rolls production back (`deploy-verify.sh --rollback`) **before Quinn starts**. 🟡 → no Tier 1 merges today. Also `check-blog-sidebar.sh`, pinner freshness, newsletter flag. | `reports/funnel/guardrail-YYYY-MM-DD.md`; incident file if red |
| 3. Moves | Pip, Sage, Nova, Cass, Rio in parallel | Each reads charter → autonomy → own playbook → today's scoreboard → `experiments.md`, then **executes one move** at the highest tier it is allowed, or advances an in-flight experiment. Returns the 4-line move report. | Shipped / queued moves |
| 4. Digest | Quinn | Scoreboard line, guardrails, **Changed today** (one line per ledger row: PR, commit, deploy, verify result), what shipped, what ships tomorrow (T1), what needs a decision (T2), one insight. ≤30 lines. Written to `reports/funnel/digest-YYYY-MM-DD.md` and returned to the operator. | The two-minute read |
| 5. Veto-window merges | Quinn | Tier 1 PRs whose 24h window expired with no "stop" are merged — each through the ship protocol (`deploy-verify.sh --after-merge`). | Deploys + ledger rows |
| 6. Evening check | script (`mhm-guardrail-evening`, ~18:30) | `deploy-verify.sh --check`: re-renders production, re-checks the blog markers and 5xx. Catches slow failures (a WordPress plugin update, a Vercel env change, an ad-script change) and rolls back / restores on its own. | Ledger row; incident file if it acted |

**Every merge, every tier:** branch → checks → PR → squash merge →
`deploy-verify.sh --after-merge --sha <sha>` → ledger row in
`reports/funnel/changelog.md`. Details in `autonomy.md` → "Ship protocol".

### The move report (every agent, every day, exactly this shape)

```
[Pip] 🟢 pinterest sessions 7d 61,240 (+4% WoW) · pinner last post 3h ago
MOVE: SHIPPED (T0) — 12 collection-page pins scheduled to 6 boards · PR #123
MEASURE: Pinterest sessions to /games/* pages, baseline 1,830/7d, read 2026-09-15, keep if ≥ +10%
NEXT: video pin test (T1) — needs 3 lookbook clips from the writer (queued)
```

Line 1: status, the one number you own, freshness of your channel.
Line 2: the move and its tier. Line 3: how it is measured. Line 4: next / blocker.

### What "one move" means

Something that changes the world: a PR merged, a page live, pins scheduled, an
email queued, a creator emailed, a draft ready for the operator to send, an
experiment started or graded. Analysis alone counts only if it ends in a
decision written to `experiments.md`. Reading the dashboard is not a move.

---

## 2. Weekly (the Monday run does extra)

- **Grade experiments.** Every row in `experiments.md` past its read date gets
  KEEP / KILL / EXTEND with the actual number. Killed ideas go to the kill log
  and are never re-proposed without stating what changed.
- **Playbook learning.** Each agent appends one dated entry with a metric.
- **Scorecard.** Quinn appends the weekly block to `scorecard.md`: headline
  metrics vs target, per-agent grade, biggest risk, top-3 bets.
- **Queue hygiene.** Tier 2 items >7 days old get re-pitched smaller or dropped.

## 3. Monthly (first run of the month)

Quinn rewrites `targets.json` `bets` (max 3), retires anything that has not
moved a headline metric in 6 weeks, and writes `reports/funnel/monthly-YYYY-MM.md`:
where the funnel leaks, what we learned, what we are betting on.

## 4. The operator's role (≤10 minutes a day by design)

1. Read the digest.
2. Reply "stop N" to any Tier 1 item you don't want. Silence means go.
3. When you have time, work `operator-queue.md` top to bottom: "approve 3",
   "reject 5 because …". Packages are complete, so one word ships them.
4. Do the human-only things the queue asks for: send the Patreon post, forward
   the sponsorship deck, sign the creator agreement, confirm a cost.
5. Anything you want pursued: add a line to `ideas-inbox.md`. Quinn picks it up.

If the operator disappears for two weeks, Tier 0 and Tier 1 keep shipping,
Tier 2 queues, nothing breaks. To pause the whole thing, set
`"autonomy": "ask"` in `targets.json`.

## 5. Working with the writer

The writer is the human voice. Agents never publish as her; they serve her.
Nova delivers a weekly brief pack (`reports/funnel/writer-brief-YYYY-WW.md`):
top-demand topics from GSC + Pinterest + catalog gaps, suggested titles, the
mods to feature (with IDs so cross-links resolve), and the Patreon/lookbook
tie-in. Cass drafts the newsletter and Patreon post for her to edit and send.
Pip turns her posts and lookbooks into pins and social copy automatically
(`mhm-pin-scheduler`, `mhm-social-scheduler`, already built).

## 6. Infrastructure the model depends on

| Piece | Path | Status 2026-09-01 |
|---|---|---|
| Scheduled task | `~/.claude/scheduled-tasks/mhm-funnel-daily/SKILL.md` | recreated 2026-09-04 (model = Auto; the old `mhm-daily-pulse` was pinned to a model that stopped launching on 09-03) |
| Clean-worktree runner | `scripts/agents/run-funnel-daily.sh` | one worktree per agent (2026-09-02); own `npm ci`, `.env.local` copied not linked; never touches the operator's node_modules |
| Scoreboard | `scripts/agents/funnel-scoreboard.ts` | new |
| Circuit breaker | `scripts/agents/revenue-guardrail.ts` | new; runs before Quinn; can trigger rollback |
| Deploy verifier / rollback / ledger | `scripts/agents/deploy-verify.sh` (+ `smoke-render.ts`, Playwright) | new; after every merge and every evening (`mhm-guardrail-evening`) |
| Ledger + incidents | `reports/funnel/changelog.md`, `reports/funnel/incidents/` | new; the operator's record of every production change |
| functions.php restore | `scripts/staging/push-blog-functions-prod.sh --yes` | new flag; non-interactive re-push from git |
| Guardrail tests | `__tests__/unit/sidebar-sticky-health.test.ts`, `scripts/agents/check-blog-sidebar.sh` | existing, required |
| Mediavine / affiliate daily reports | `scripts/agents/mediavine-daily-report.ts`, `affiliate-daily-pulse.ts` (launchd) | keep; scoreboard reads them |
| Pinner | `~/java_projects/MHMUtils` → BigScoots cron + Supabase | scoreboard checks freshness |
| Operator queue / experiments / ideas inbox | this directory | new |
| Headless CLI auth | macOS keychain OAuth for `claude -p` (operator: `claude auth login`) | runner preflights before Quinn; on failure writes a DEGRADED digest naming the fix (2026-09-02) |

— Quinn, GM

## 7. Model routing (operator decision, 2026-09-05)

> *"Fable is our advisor; when it tasks jobs out, use the other models as needed and effective."*

| Who / what | Model | Why |
|---|---|---|
| Quinn (GM, the daily loop, the digest) | **Fable 5.1** — runner default `FUNNEL_MODEL`, and the Desktop routine's own model | The advisor. Reads everything, decides the moves, judges the reports. |
| Rio (Product & Revenue, guardrail owner) | **`fable`** always | Owns the number the team is judged on; diagnoses yellows/reds. |
| Any move that changes production code without a written spec, or diagnoses a 🟡/🔴 | **`fable`** | Judgment-heavy; a wrong call costs revenue. |
| Tier 0 code moves with the spec already written (copy tweaks, data backfills, scripts, a queued ideas-inbox item) | **`opus`** | Strong builder, cheaper; the ship protocol catches mistakes. |
| Report-only moves: writer briefs, pin/scheduler copy, analytics read-backs, ledger paperwork, re-pitching a Tier 2 package, `NO MOVE` days | **`sonnet`** | Cheap and fast; nothing merges to `main` from these. |
| `haiku` | never for anything that opens a PR | |

Quinn picks the model per specialist per run from the move it is handing out
(Agent tool `model:` value), and writes it into the digest's Agents line as
`[Pip · sonnet]`. Unsure → `fable`. The runner's `FUNNEL_MODEL` env var still
overrides Quinn's own model for a manual run.

