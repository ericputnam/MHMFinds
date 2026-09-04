# Agent Governance

## The business team (2026-09-01): the funnel team

The agents that run the MustHaveMods *business* (as opposed to codebase chores) are the
six funnel-team personas. Start with `mhm-funnel/charter.md`; it explains why the previous
exec team was retired and what this one is judged on.

| Agent file | Persona | Owns |
|---|---|---|
| `mhm-gm.md` | Quinn | The loop: scoreboard, digest, guardrails, experiments, operator queue |
| `mhm-distribution.md` | Pip | Pinterest scale + read-back, Tumblr/X/FB, launch amplification, next channel |
| `mhm-search-ai.md` | Sage | SEO recovery, AI/LLM discoverability, indexing |
| `mhm-content-creators.md` | Nova | Collection pages, writer briefs, creator program, first-party mods, /play |
| `mhm-capture.md` | Cass | Email / Patreon-free / account capture, sends, re-engagement |
| `mhm-product-revenue.md` | Rio | Patreon paid tiers, membership, premium mods, sponsorships, ad guardrail |

Shared state lives in `mhm-funnel/`: `charter.md`, `autonomy.md` (Tier 0/1/2 rules),
`operating-model.md`, `targets.json`, `scorecard.md`, `experiments.md`,
`operator-queue.md`, `ideas-inbox.md`, `playbooks/`. Daily numbers come from
`scripts/agents/funnel-scoreboard.ts`; the headless loop is
`scripts/agents/run-funnel-daily.sh` (scheduled task `mhm-funnel-daily`).

The team may commit and merge to `main` under the operator's three rules (2026-09-01;
`mhm-funnel/autonomy.md` → "The operator's three rules"). Enforcement:
`scripts/agents/revenue-guardrail.ts` (circuit breaker, runs first every morning),
`scripts/agents/deploy-verify.sh` (renders production after every merge and every evening
via `mhm-guardrail-evening`; rolls Vercel back / restores `functions.php` on failure), and
the ledger `reports/funnel/changelog.md` + `reports/funnel/incidents/`, which the digest's
"Changed today" section summarises.

`retired/` holds the 2026-06 exec team (Sterling / Max / Tim / Mark / Ivy) and its
`mhm-team/` state for history. Files in subdirectories are not loaded as agents.

---

## Task agents (codebase chores)

This directory contains implementation plans and prompts for autonomous agents that work on MHMFinds.

## Directory Structure

```
.claude/agents/
├── README.md                    # This file - governance rules
├── <agent-name>/
│   ├── plan.md                  # Implementation plan (MUST be reviewed before agent runs)
│   └── prompt.md                # Agent system prompt
```

## Agent Workflow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Read plan  │ ──▶ │  Approve    │ ──▶ │   Agent     │ ──▶ │  /reviewit  │
│  plan.md    │     │  "proceed"  │     │   runs      │     │  PR review  │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                              │                    │
                                              ▼                    ▼
                                        /commitit            /shipit
                                        per story            to deploy
```

## Rules

### Before Running Any Agent

1. **Read the plan.md** - Understand what the agent will do
2. **Verify task list** - Check that tasks exist and are correct
3. **Approve explicitly** - Say "proceed" or similar to start the agent

### During Agent Execution

1. **Feature branches only** - Agents never work directly on main
2. **Run /commitit after each story** - Creates checkpoint commits
3. **Best effort on failures** - Try to fix, add failure notes, continue
4. **Log progress** - Update task status and progress files

### After Agent Completes

1. **Run /reviewit** - Review the PR and changes
2. **Fix issues if needed** - Agent or human can address feedback
3. **Run /shipit** - Deploy to production when ready

## Creating a New Agent

1. Create directory: `.claude/agents/<agent-name>/`
2. Write `plan.md` with:
   - Purpose and scope
   - What tasks/stories it will complete
   - Tools it needs access to
   - Success criteria
   - Known limitations
3. Write `prompt.md` with the agent's system prompt
4. Add to task list with `TaskCreate`

## Running an Agent

```bash
# Set shared task list
export CLAUDE_CODE_TASK_LIST_ID=<task-list-id>

# Run agent with its prompt
claude -p "$(cat .claude/agents/<agent-name>/prompt.md)"

# Or interactively
claude
> Work on task #N following the plan in .claude/agents/<agent-name>/plan.md
```

## Available Agents

| Agent | Purpose | Status |
|-------|---------|--------|
| prd-runner | Works through PRD stories autonomously | **Ready** |
| db-script | Runs database scripts safely with dry-run support | **Ready** |
| db-backup | Creates table backups before destructive operations | **Ready** |
| facet-curator | Manages taxonomy/facet quality, merges duplicates | **Ready** |
| scraper-monitor | Runs and monitors content aggregation jobs | **Ready** |
| seo-analyst | SEO health checks using GSC/GA data | **Ready** |

## Commit Message Format

Agents use this format for /commitit:

```
<type>(<story-id>): <description>

<optional body>
```

Examples:
- `feat(CTB-001): Add content type audit script`
- `fix(CTB-005): Recategorize eyebrow mods from skin to eyebrows`
- `chore(SCR-003): Integrate contentTypeDetector into scraper`

## Task List Integration

Agents work with the Claude Code Tasks system:

- Tasks persist in `~/.claude/tasks/<task-list-id>/`
- Multiple agents can collaborate on the same task list
- Use `CLAUDE_CODE_TASK_LIST_ID` environment variable to share context
- Tasks have dependencies (blockedBy) that agents respect
