# Agent Governance

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
| prd-runner | Works through PRD stories autonomously | Planned |
| db-script | Runs database scripts safely | Planned |
| facet-curator | Manages taxonomy/facet quality | Planned |
| scraper-monitor | Runs and monitors content aggregation | Planned |
| build-validator | Pre-deploy verification | Planned |
| seo-analyst | SEO health checks using GSC/GA data | Planned |

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
