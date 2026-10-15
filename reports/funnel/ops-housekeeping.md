# Ops housekeeping log

Irreversible on-disk cleanups (locks, worktrees, stray dirs) that a revert cannot undo. One row per target,
with the evidence checked *immediately before* removal. Append-only; newest at the bottom.

| when | target | evidence | action |
|---|---|---|---|
| 2026-10-15 | `/Users/eputnam/java_projects/MHMFinds/logs/funnel-run-2026-10-08.lock/` (gitignored `logs`) | contents: `pid` only = 26608; `ps -p 26608` → no process; `lsof +D` → no open handle; mtime 2026-10-08 18:15:24 | `rm pid && rmdir` — REMOVED (E215) |
| 2026-10-15 | `/Users/eputnam/java_projects/MHMFinds/logs/funnel-run-2026-10-10.lock/` (gitignored `logs`) | contents: `pid` only = 33714; `ps -p 33714` → no process; `lsof +D` → no open handle; mtime 2026-10-10 08:04:04 | `rm pid && rmdir` — REMOVED (E215) |
| 2026-10-15 | worktrees `~/.mhm-worktrees/funnel-2026-10-08-26608*`, `funnel-2026-10-10-33714*` | not on disk and not in `git worktree list` / `.git/worktrees/`; runner log: `[2026-10-11 10:56:27] cleanup: reaped 8 worktree(s)` right after the 10-08/10-10 degraded digests | nothing to remove — already reaped 10-11 |
| 2026-10-15 | `~/.mhm-worktrees/funnel-2026-09-22-21276/` (`reports/` only), `funnel-2026-09-22-21276-pip/` (`logs/` only) | no `.git`, not registered worktrees; every runner logs `git worktree remove failed` for them | KEPT — out of E215 scope; may hold 09-22 evidence; operator/next Ops move decides |
