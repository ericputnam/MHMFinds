# Quinn — GM — Playbook

Your memory across runs. Append one dated entry per run, newest at the top,
**with a number**. "I think it worked" is not a learning. Covers the loop: digest quality, merge discipline, what unblocked or blocked agents, operator response patterns.

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

## 2026-09-04
- Tried: second full daily loop, first under a 🟡 guardrail (Tier 0 only) — 5/5 agents shipped: 4 PRs (#32–#35) merged, all deploy-verify PASS, plus Pip's data-only pinner insert (7 Supabase rows). 0 cross-contaminated PRs vs 3/5 on 09-02 — per-agent worktrees (PR #29) fixed the race.
- Before → after: cumulative shipped moves 6 → 11; capture surfaces 1 → 2 (all 16 collection pages, ~7K sessions/7d addressable); collection pages 15 → 16; B3 Google diagnosis delivered 2026-09-04 vs 09-08 due date.
- Verdict: KEEP per-agent worktrees + yellow-day Tier-0-only discipline; MORE DATA on the dip itself (E5/E9 read 2026-09-15).
- Next time: (1) funnel-scoreboard.ts writes to MHM_PROJECT_DIR (defaults to the operator tree) — export MHM_PROJECT_DIR=$PWD in the runner or copy the dated files into the run worktree; (2) 09-03's run never launched (scheduled task pinned to a dead model — fixed in PR #31): a missed day should itself be a digest red flag, check the previous digest date every run.

## 2026-09-02
- Tried: first full daily loop — 6 T0 merges (PRs #22–#27), all deploy-verify PASS; rebuilt 3 of 5 agent branches before merging because concurrent agents in ONE shared worktree cross-contaminated each other's commits (PR #22 carried Cass's files, #24/#26 carried 2–3 foreign commits each).
- Before → after: shipped moves this week 0 → 6; owned-audience capture surfaces on /go 0 → 1; collection pages 15 → 16 (witch-cc, 48 mods rendered after #27 fixed a 0-verified-match theme filter); AI-crawler robots rules 0 → 8 bots.
- Verdict: KEEP the loop; FIX the runner: (1) agents sharing one worktree race on git state — serialize commits or give each agent its own worktree; (2) the runner's .env.local SYMLINK breaks `next build` (webpack parses the followed file as a module — copy, don't link); (3) concurrent checkouts restored the tracked node_modules symlink and wiped the runner's installed deps mid-run (npm install recovered).
- Next time: verify every agent PR's file list against its claimed scope BEFORE merging — two of five "checks passed" claims were unverifiable because deps had been wiped; local re-checks caught it.

## 2026-09-01
- Tried: nothing yet — team chartered today. Read `../charter.md`, `../autonomy.md`, `../operating-model.md`, `../targets.json`, and `reports/growth/fact-base-2026-09-01.md` before your first move.
- Before → after: baseline in `../targets.json`
- Verdict: —
- Next time: your first move should be the top item in your agent file's "levers" list unless the scoreboard shows a 🔴 in your area.
