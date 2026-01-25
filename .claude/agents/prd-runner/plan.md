# PRD-Runner Agent - Implementation Plan

**Status:** Draft - Awaiting Approval
**Task:** #3
**Created:** 2026-01-23

---

## Purpose

The PRD-Runner agent autonomously works through PRD (Product Requirements Document) stories, implementing each one according to its acceptance criteria. It replaces the `ralph.sh` bash loop with native Claude Code task management.

## Scope

### In Scope
- Reading JSON PRD files with `userStories` array
- Implementing stories sequentially (by priority)
- Running validation (type-check) after each story
- Updating PRD `passes` field and progress files
- Running `/commitit` after each completed story
- Handling failures gracefully (best effort)

### Out of Scope
- Markdown or other PRD formats (JSON only)
- Parallel story execution (sequential only)
- Database migrations (defer to DB-Script agent)
- Deployment (that's `/shipit`)

---

## PRD JSON Format

The agent expects this structure:

```json
{
  "projectName": "Feature Name",
  "branchName": "feat/feature-name",
  "description": "What this PRD accomplishes",
  "context": { ... },
  "userStories": [
    {
      "id": "XXX-001",
      "title": "Story title",
      "description": "What this story does",
      "acceptanceCriteria": [
        "Criterion 1",
        "Criterion 2",
        "npm run type-check passes"
      ],
      "priority": 1,
      "passes": false,
      "notes": ""
    }
  ]
}
```

---

## Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                        PRD-Runner Loop                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Read PRD JSON  │
                    └────────┬────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ Find next story │
                    │ (passes: false) │
                    └────────┬────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
         All done?     Needs human?     Ready to run
              │               │               │
              ▼               ▼               ▼
           EXIT          Skip & flag     Implement
                              │               │
                              │               ▼
                              │      ┌─────────────────┐
                              │      │ Run type-check  │
                              │      └────────┬────────┘
                              │               │
                              │       ┌───────┴───────┐
                              │       │               │
                              │       ▼               ▼
                              │    PASSED          FAILED
                              │       │               │
                              │       ▼               ▼
                              │   Update PRD     Try to fix
                              │   passes: true    (best effort)
                              │       │               │
                              │       ▼               │
                              │   Update progress    │
                              │       │               │
                              │       ▼               │
                              │   /commitit          │
                              │       │               │
                              └───────┴───────────────┘
                                      │
                                      ▼
                               (loop to next story)
```

---

## Story Classification

Before implementing, the agent classifies each story:

### Ready to Run
- Clear acceptance criteria
- No external dependencies mentioned
- Technical implementation (code, scripts, configs)

### Needs Human Input
Stories are flagged if they contain phrases like:
- "discuss with team"
- "get approval"
- "design decision"
- "choose between"
- "user preference"
- "manual review required"

When flagged:
1. Set `passes: false` (unchanged)
2. Add to `notes`: "NEEDS-HUMAN: <reason>"
3. Log to progress file
4. Continue to next story

---

## Implementation Steps (Per Story)

### 1. Read Story
```typescript
const story = prd.userStories.find(s => !s.passes);
```

### 2. Classify Story
Check for human-input keywords in title, description, and acceptanceCriteria.

### 3. Implement (if ready)
For each acceptance criterion:
- Create files as needed
- Write code/scripts
- Run commands
- Verify criterion is met

### 4. Validate
```bash
npm run type-check
```

If fails:
- Attempt to fix TypeScript errors (up to 3 attempts)
- If still failing, add failure notes and continue

### 5. Update PRD
```typescript
story.passes = true;
// Write updated PRD back to file
```

### 6. Update Progress File
Append to progress file:
```markdown
## 2026-01-23: XXX-001 Complete

- Created `lib/services/detector.ts`
- Added 15 test cases
- Type-check passed
```

### 7. Commit
Invoke `/commitit` skill to commit changes with message:
```
feat(XXX-001): <story title>
```

---

## Error Handling

### Type-Check Failures
1. Read error output
2. Identify failing files
3. Attempt fix (max 3 tries)
4. If still failing:
   - Add to story notes: "TYPE-CHECK-FAILED: <errors>"
   - Continue to next story

### Script Execution Failures
1. Capture error output
2. Attempt fix based on error
3. If still failing:
   - Add to story notes: "SCRIPT-FAILED: <error>"
   - Continue to next story

### Build Failures
1. Run `npm run build` only if acceptance criteria requires it
2. Fix errors similar to type-check
3. If failing, note and continue

---

## Progress File Format

Located at: `scripts/ralph/progress-<prd-name>.txt`

```markdown
## Codebase Patterns

### Pattern Name
```typescript
// Code pattern discovered during implementation
```

---

# Progress Log

## 2026-01-23: XXX-001 Complete
- What was done
- Files created/modified
- Any issues encountered

## 2026-01-23: XXX-002 Skipped (NEEDS-HUMAN)
- Reason: Requires design decision on X vs Y
```

---

## Tools Required

| Tool | Purpose |
|------|---------|
| Read | Read PRD JSON, source files |
| Write | Update PRD, create new files |
| Edit | Modify existing files |
| Bash | Run npm commands, git operations |
| Glob | Find files by pattern |
| Grep | Search for code patterns |
| Skill | Invoke /commitit |

---

## Invocation

### Via Environment Variable
```bash
export CLAUDE_CODE_TASK_LIST_ID=b1cef832-80e0-49e3-8d1a-d6deb4dbf22a

claude -p "$(cat .claude/agents/prd-runner/prompt.md)" \
  --arg prd_path="scripts/ralph/prd-content-type-backfill.json" \
  --arg progress_path="scripts/ralph/progress-content-type-backfill.txt"
```

### Interactive
```bash
claude
> Run the PRD-Runner agent on scripts/ralph/prd-content-type-backfill.json
```

---

## Success Criteria

1. All stories with `passes: false` are attempted
2. Each completed story has `passes: true` in PRD
3. Progress file is updated with implementation details
4. Each story has a commit via /commitit
5. Stories needing human input are flagged, not blocked on

---

## Limitations

1. **Sequential only** - Stories run one at a time
2. **No rollback** - If a story breaks something, manual intervention needed
3. **JSON format only** - Won't parse markdown PRDs
4. **No cross-PRD dependencies** - Each PRD is independent
5. **Best effort fixing** - Complex errors may not be auto-resolved

---

## Example Session

```
PRD-Runner starting...
Reading: scripts/ralph/prd-content-type-backfill.json

Found 10 stories, 0 complete, 10 remaining

─────────────────────────────────────
Story CTB-001: Audit current content type distribution
Priority: 1
─────────────────────────────────────

Implementing...
- Created scripts/ralph/ctb-001-audit.ts
- Running script...
- Output saved to scripts/ralph/ctb-audit-report.txt

Validating...
- npm run type-check: PASSED

Updating PRD...
- CTB-001.passes = true

Updating progress...
- Added entry to progress-content-type-backfill.txt

Committing...
- Running /commitit
- Committed: feat(CTB-001): Audit current content type distribution

─────────────────────────────────────
Story CTB-002: Create missing FacetDefinitions
Priority: 2
─────────────────────────────────────

... (continues)
```

---

## Approval Checklist

Before creating the prompt.md, please confirm:

- [ ] Workflow looks correct
- [ ] Error handling approach is acceptable
- [ ] Progress file format works for you
- [ ] Commit strategy (per story) is what you want
- [ ] Any additional requirements?

**Reply with "proceed" to create the prompt.md, or provide feedback.**
