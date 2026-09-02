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
