# Incident 2026-09-26 06:46 — still failing after rollback

**Mode:** check · **Label:** morning-check · **Commit:** n/a · **Deployment:** https://mhm-finds-dw5l-dd01j9vw3-ericputnams-projects.vercel.app

## Failures
- smoke-render: / -> .mv-ads in-content anchors missing | /mods -> .mv-ads in-content anchors missing | /sims-4-cc-finds-2/ -> HTTP no response, 1 uncaught page error(s): navigation: page.goto: Timeout 45000ms exceeded.
- Call log:
- - navigating to "https://musthavemods.com/sims-4-cc-finds-2, aside#secondary (Mediavine sidebar anchor) missing, page text only 0 chars (blank render?)

## Action taken
Rolled back to https://mhm-finds-dw5l-fkrwcuqk0-ericputnams-projects.vercel.app; re-check STILL fails: smoke-render: / -> .mv-ads in-content anchors missing | /mods/cmkyol30z019zoxhc60c7lq8a -> HTTP no response, 2 uncaught page error(s): navigation: page.goto: Timeout 45000ms exceeded.
Call log:
  - navigating to "https://musthavemods.com/mods/cmkyol30z019, Mediavine loader (scripts.mediavine.com) missing, aside#secondary (Mediavine sidebar anchor) missing, .mv-ads in-content anchors missing, page text only 0 chars (blank render?) | /go/cmkyol30z019zoxhc60c7lq8a -> HTTP no response, 2 uncaught page error(s): navigation: page.goto: Timeout 45000ms exceeded.
Call log:
  - navigating to "https://musthavemods.com/go/cmkyol30z019zo, Mediavine loader (scripts.mediavine.com) missing, aside#secondary (Mediavine sidebar anchor) missing, .mv-ads in-content anchors missing, page text only 0 chars (blank render?) | /sims-4-cc-finds-2/ -> HTTP no response, 1 uncaught page error(s): navigation: page.goto: Timeout 45000ms exceeded.
Call log:
  - navigating to "https://musthavemods.com/sims-4-cc-finds-2, aside#secondary (Mediavine sidebar anchor) missing, page text only 0 chars (blank render?) | /play/ -> HTTP no response, 2 uncaught page error(s): navigation: page.goto: Timeout 45000ms exceeded.
Call log:
  - navigating to "https://musthavemods.com/play/", waiting u, Mediavine loader (scripts.mediavine.com) missing, aside#secondary (Mediavine sidebar anchor) missing, .mv-ads in-content anchors missing, page text only 0 chars (blank render?). Escalate to the operator: Vercel dashboard, BigScoots backup restore.

## For Quinn
- Lead today's digest with this incident. No Tier 1 merges until it is closed.
- Root-cause the rolled-back change. A fix PR must pass `npx tsx scripts/agents/smoke-render.ts --base <its preview URL>` before it is merged again.
- Smoke output: /Users/eputnam/.mhm-worktrees/funnel-2026-09-26-32072/logs/smoke-2026-09-26-064626.json

## Closure — 2026-09-26 09:30 (Ops)

**Verdict: false alarm. No site change was ever wrong; production was rolled back by mistake and has been moved forward.**

- **Cause:** the host's own network was degraded 06:30–08:00 (Vercel CLI `ETIMEDOUT`, Prisma from the host failed, Patreon scrape terminated, Pinterest API unavailable — all in `operator-did-2026-09-26.md`). Every smoke "failure" was a `page.goto` 45 s timeout (`/mods/<id>`, `/go/<id>`, `/sims-4-cc-finds-2/`, `/play/` — `mv-script=n`, 0 chars: the page never arrived) or the homepage grid still unsettled at 1,788 of ≈9,600 chars after 27.8 s with `.mv-ads`=0 (the grid is client-fetched from `/api/mods`). Guardrail was GREEN (Mediavine 09-24 $204.28, +12.7%). Quinn's curls at 07:42 returned HTTP 200 with the Mediavine loader and `id="secondary"` on every page. The 06:58 log line itself said `smoke INCONCLUSIVE` and the script still rolled back.
- **Site change:** none. `dd01j9vw3` (6cb461c) was a CLAUDE.md-only diff; the rollback to `fkrwcuqk0` (1886f22) changed nothing a visitor could see and was reverted by forward promotion.
- **Fix:** PR #186 (E111, merge `396e6e2`): smoke-render now carries an independent network control before and after the run, retries a navigation timeout / unsettled render on a fresh page for primary targets too, and grades on positive evidence only; `deploy-verify.sh` refuses the rollback branch on `INCONCLUSIVE (network)` and `--check` writes a WARN row (exit 2) instead of an incident. Guards: 21/29 red on pre-fix `main`, incl. the real `smoke()`/`fail_and_fix()` run under bash with the CLI stubbed.
- **Now serving:** `https://mhm-finds-dw5l-eoh8q9a3g-ericputnams-projects.vercel.app` (396e6e2), promoted forward by `ensure_promoted()` at 09:24 (after-merge PASS, ledger `30da191`). `--check --label morning-recheck` at 09:26 with the new code: PASS 14/14, control 3/3 both sides (125–306 ms), homepage 10,345 chars / `.mv-ads`=1 in 9.0 s (ledger `db7c2e2`). 5xx/15m = 0.
- **Second false-alarm rollback in five days** (09-22 E91 was the first). Same class: a reading taken through a broken network graded as a verdict about the site.
