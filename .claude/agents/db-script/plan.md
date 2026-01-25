# DB-Script Agent - Implementation Plan

**Status:** Ready
**Created:** 2026-01-24

---

## Purpose

The DB-Script agent safely executes database scripts with built-in safety checks, dry-run support, and rollback capability. It ensures that destructive database operations are performed carefully with proper validation and logging.

## Scope

### In Scope
- Executing TypeScript database scripts (via `npx tsx`)
- Supporting dry-run mode for preview (default behavior)
- Validating scripts before execution
- Logging all operations to audit trail
- Coordinating with db-backup agent for destructive operations
- Running Prisma commands (`db:push`, `db:migrate`, etc.)

### Out of Scope
- Raw SQL execution (use Prisma migrations instead)
- Schema changes without migration files
- Production database access (Vercel/production ops require manual approval)
- Creating new scripts (that's for the PRD-Runner or human)

---

## Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                      DB-Script Agent Flow                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Receive script │
                    │  path/command   │
                    └────────┬────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ Validate script │
                    │ exists & syntax │
                    └────────┬────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ Classify script │
                    │ (read/write/del)│
                    └────────┬────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
         Read-only      Write/Update    Destructive
              │               │               │
              ▼               ▼               ▼
           Run it       Dry run first   Require backup
              │               │               │
              │               ▼               ▼
              │         Show preview    Invoke db-backup
              │               │               │
              │               ▼               ▼
              │         Confirm --fix   Backup complete?
              │               │               │
              │       ┌───────┴───────┐       │
              │       │               │       │
              │       ▼               ▼       ▼
              │    APPROVED        CANCEL   Continue
              │       │                       │
              │       ▼                       ▼
              │   Execute with            Execute with
              │   --fix flag              --fix flag
              │       │                       │
              └───────┴───────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Log execution  │
                    │  to audit file  │
                    └────────┬────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ Report results  │
                    └─────────────────┘
```

---

## Script Classification

### Read-Only Scripts
Keywords in filename or content:
- `audit`, `check`, `analyze`, `report`, `list`, `count`, `stats`
- No database write operations detected

Action: Run immediately, no backup needed.

### Write/Update Scripts
Keywords:
- `fix`, `update`, `migrate`, `cleanup`, `repair`, `sync`
- Contains `prisma.*.update()`, `prisma.*.create()`

Action: Run dry-run first, require `--fix` flag for actual execution.

### Destructive Scripts
Keywords:
- `delete`, `reset`, `remove`, `purge`, `truncate`, `drop`
- Contains `prisma.*.delete()`, `prisma.*.deleteMany()`

Action: Require explicit backup via db-backup agent before execution.

---

## Supported Operations

### 1. Run TypeScript Script
```bash
npx tsx scripts/path/to/script.ts           # Dry run (default)
npx tsx scripts/path/to/script.ts --fix     # Apply changes
npx tsx scripts/path/to/script.ts --limit=N # Process N records
```

### 2. Prisma Commands
```bash
npm run db:generate    # Generate Prisma client
npm run db:push        # Push schema (no migration)
npm run db:migrate     # Create and apply migration
npm run db:studio      # Open Prisma Studio (interactive)
```

### 3. Custom Dry-Run Pattern
Scripts should follow this pattern:
```typescript
const isDryRun = !process.argv.includes('--fix');

if (isDryRun) {
  console.log('[DRY RUN] Would update:', record);
} else {
  await prisma.mod.update({ ... });
}
```

---

## Safety Checks

### Pre-Execution Validation
1. **File exists**: Script path is valid
2. **Syntax check**: TypeScript compiles without errors
3. **Import check**: Script can import Prisma client
4. **Env check**: DATABASE_URL is set

### Runtime Safeguards
1. **Timeout**: Scripts timeout after 10 minutes
2. **Error capture**: All errors logged to audit file
3. **Progress logging**: Log every N records processed

### Post-Execution Verification
1. **Exit code**: Check for non-zero exit
2. **Error output**: Parse stderr for failures
3. **Record count**: Verify expected vs actual changes

---

## Audit Log Format

Location: `scripts/db-script-audit.log`

```
================================================================================
Script Execution: 2026-01-24T10:30:00Z
================================================================================
Script: scripts/ralph/fc-002-remove-gender-non-clothing.ts
Type: write
Dry Run: false
Backup: backup_20260124_103000_mods.json

Pre-Execution Check:
- File exists: YES
- Syntax valid: YES
- Database connected: YES

Execution:
- Started: 2026-01-24T10:30:15Z
- Completed: 2026-01-24T10:32:45Z
- Duration: 2m 30s
- Exit code: 0

Results:
- Records processed: 1,250
- Records updated: 847
- Errors: 0

================================================================================
```

---

## Tools Required

| Tool | Purpose |
|------|---------|
| Read | Read script content for classification |
| Bash | Execute scripts and npm commands |
| Glob | Find scripts in directories |
| Grep | Search script content for patterns |
| Skill | Invoke db-backup if needed |

---

## Invocation

### Interactive
```bash
claude
> Run the db-script agent on scripts/ralph/fc-002-remove-gender-non-clothing.ts
```

### With Arguments
```bash
claude
> Run db-script: scripts/fix-null-content-types.ts --fix
```

### Batch Mode
```bash
claude
> Run all scripts in scripts/ralph/tc-*.ts in order
```

---

## Success Criteria

1. Script executes without runtime errors
2. Exit code is 0
3. No TypeScript compilation errors
4. Audit log entry created
5. Changes match expected count (if specified)
6. No database connection errors

---

## Limitations

1. **No raw SQL**: Must use Prisma or TypeScript scripts
2. **Local only**: Does not run against production directly
3. **No schema creation**: Schema changes need migrations
4. **Single script**: Cannot run multiple scripts in parallel
5. **Timeout**: Scripts over 10 minutes will be killed
6. **No interactive**: Scripts must not require user input

---

## Error Recovery

### Connection Errors
1. Check `DATABASE_URL` is set
2. Verify database is reachable
3. Check Prisma client is generated (`npm run db:generate`)

### Script Errors
1. Read error output
2. Fix TypeScript issues
3. Re-run with dry-run first

### Partial Execution
1. Check audit log for last successful record
2. Coordinate with db-backup for potential restore
3. Re-run with `--limit` to continue from failure point

---

## Example Session

```
DB-Script Agent Starting
=========================
Script: scripts/ralph/fc-002-remove-gender-non-clothing.ts

Analyzing script...
- Type: write (detected update operations)
- Tables affected: mods
- Estimated records: ~2,000

Pre-execution checks...
- File exists: YES
- TypeScript syntax: VALID
- Database connection: OK
- Backup required: NO (write, not delete)

Running dry-run first...
$ npx tsx scripts/ralph/fc-002-remove-gender-non-clothing.ts

[DRY RUN] Would update 847 mods:
- Remove genderOptions from furniture: 412
- Remove genderOptions from lighting: 215
- Remove genderOptions from decor: 220

Dry run complete. Preview above shows planned changes.

To apply these changes, respond with:
> Apply the changes with --fix

Or to cancel:
> Cancel the operation
```
