# DB-Backup Agent - Implementation Plan

**Status:** Ready
**Created:** 2026-01-24

---

## Purpose

The DB-Backup agent creates table-level backups before destructive database operations. It exports specific tables to JSON files, enabling safe rollback if scripts cause unintended data loss or corruption.

## Scope

### In Scope
- Backing up specific Prisma models to JSON files
- Creating timestamped backup files
- Verifying backup integrity (record counts)
- Providing rollback scripts for restoring data
- Cleaning up old backup files

### Out of Scope
- Full database dumps (use `pg_dump` directly)
- Point-in-time recovery (use database provider tools)
- Production database backups (handled by Prisma/provider)
- Schema backups (migrations are the source of truth)

---

## Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                      DB-Backup Agent Flow                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ Receive backup  │
                    │ request (table) │
                    └────────┬────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ Validate table  │
                    │ exists in schema│
                    └────────┬────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Count records  │
                    │  to be backed up│
                    └────────┬────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ Estimate backup │
                    │ size and time   │
                    └────────┬────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
          < 10K rows     10K-100K rows    > 100K rows
              │               │               │
              ▼               ▼               ▼
         Full backup    Chunk backup     Warn user
              │               │               │
              │               ▼               ▼
              │         Process in       Consider
              │         batches          filtering
              │               │               │
              └───────────────┴───────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Write JSON to  │
                    │  backups/ dir   │
                    └────────┬────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ Verify backup   │
                    │ (count match)   │
                    └────────┬────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ Generate restore│
                    │ script          │
                    └────────┬────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ Return backup   │
                    │ confirmation    │
                    └─────────────────┘
```

---

## Backup File Structure

### Directory Layout
```
scripts/backups/
├── backup_20260124_103000_mods.json
├── backup_20260124_103000_mods_restore.ts
├── backup_20260124_110000_facet_definitions.json
├── backup_20260124_110000_facet_definitions_restore.ts
└── backup_manifest.json
```

### Backup File Format
```json
{
  "metadata": {
    "table": "mods",
    "createdAt": "2026-01-24T10:30:00Z",
    "recordCount": 5432,
    "schemaVersion": "20260120_migration",
    "filterApplied": "contentType = 'furniture'",
    "checksum": "sha256:abc123..."
  },
  "data": [
    { "id": "clx...", "title": "Modern Lamp", ... },
    { "id": "clx...", "title": "Vintage Chair", ... }
  ]
}
```

### Restore Script Template
```typescript
// backup_20260124_103000_mods_restore.ts
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';
import backupData from './backup_20260124_103000_mods.json';

const prisma = new PrismaClient();

async function restore() {
  const isDryRun = !process.argv.includes('--restore');

  console.log(`Restoring ${backupData.metadata.recordCount} records to ${backupData.metadata.table}`);

  if (isDryRun) {
    console.log('[DRY RUN] Would restore records. Use --restore to apply.');
    return;
  }

  for (const record of backupData.data) {
    await prisma.mod.upsert({
      where: { id: record.id },
      update: record,
      create: record,
    });
  }

  console.log('Restore complete.');
}

restore().finally(() => prisma.$disconnect());
```

---

## Supported Tables

Based on Prisma schema, the following tables can be backed up:

| Model | Table Name | Typical Size | Notes |
|-------|------------|--------------|-------|
| Mod | mods | ~10,000 | Main content table |
| FacetDefinition | facet_definitions | ~100 | Taxonomy definitions |
| Category | categories | ~50 | Category tree |
| ContentSource | content_sources | ~10 | Scraping sources |
| ScrapingJob | scraping_jobs | ~500 | Job history |
| User | users | ~1,000 | User accounts |
| CreatorProfile | creator_profiles | ~100 | Creator info |
| Collection | collections | ~500 | User collections |
| Review | reviews | ~2,000 | Mod reviews |
| Favorite | favorites | ~5,000 | User favorites |

---

## Backup Strategies

### Full Table Backup
For small tables (< 10,000 records):
```typescript
const data = await prisma.facetDefinition.findMany();
```

### Filtered Backup
For specific data subsets:
```typescript
const data = await prisma.mod.findMany({
  where: { contentType: 'furniture' }
});
```

### Chunked Backup
For large tables (> 10,000 records):
```typescript
let cursor = undefined;
const allData = [];

while (true) {
  const batch = await prisma.mod.findMany({
    take: 1000,
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { id: 'asc' },
  });

  if (batch.length === 0) break;
  allData.push(...batch);
  cursor = batch[batch.length - 1].id;
}
```

---

## Manifest File

Tracks all backups for easy management:

```json
{
  "version": 1,
  "backups": [
    {
      "id": "backup_20260124_103000_mods",
      "table": "mods",
      "createdAt": "2026-01-24T10:30:00Z",
      "recordCount": 5432,
      "filePath": "backup_20260124_103000_mods.json",
      "restorePath": "backup_20260124_103000_mods_restore.ts",
      "sizeBytes": 2456789,
      "reason": "Before fc-002 gender cleanup script",
      "status": "valid"
    }
  ],
  "retention": {
    "maxBackupsPerTable": 5,
    "maxAgeDays": 30
  }
}
```

---

## Tools Required

| Tool | Purpose |
|------|---------|
| Read | Read schema and existing backups |
| Write | Create backup JSON and restore scripts |
| Bash | Run backup scripts, check file sizes |
| Glob | Find existing backup files |

---

## Invocation

### Backup Single Table
```bash
claude
> Backup the mods table before running the cleanup script
```

### Backup with Filter
```bash
claude
> Backup all mods where contentType = 'furniture'
```

### Backup Multiple Tables
```bash
claude
> Backup mods and facet_definitions tables
```

### List Backups
```bash
claude
> List all available backups
```

### Restore from Backup
```bash
claude
> Restore mods from backup_20260124_103000_mods.json
```

---

## Success Criteria

1. Backup file created in `scripts/backups/`
2. Record count in backup matches source
3. Restore script generated and valid TypeScript
4. Manifest updated with new backup entry
5. No database errors during export

---

## Limitations

1. **Not for production**: Local dev database only
2. **Memory limits**: Tables > 100K rows need chunking
3. **No binary data**: Images stored as URLs, not blobs
4. **Schema-dependent**: Backup must match current schema
5. **No incremental**: Full table backup only (no deltas)
6. **JSON limits**: Decimal precision may vary

---

## Cleanup Policy

To prevent disk bloat:

1. **Per-table limit**: Keep max 5 backups per table
2. **Age limit**: Delete backups older than 30 days
3. **Manual cleanup**: `claude > Clean up old backups`

Cleanup script:
```typescript
const manifest = readManifest();
const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

for (const backup of manifest.backups) {
  if (new Date(backup.createdAt) < cutoffDate) {
    deleteBackup(backup);
  }
}
```

---

## Example Session

```
DB-Backup Agent Starting
=========================
Request: Backup mods table before cleanup script

Analyzing table: mods
- Total records: 5,432
- Estimated size: ~2.4 MB
- Backup strategy: Full (< 10K rows)

Creating backup...
- Fetching records: 5,432 / 5,432
- Writing to: scripts/backups/backup_20260124_103000_mods.json
- Generating restore script: backup_20260124_103000_mods_restore.ts

Verification:
- Source count: 5,432
- Backup count: 5,432
- Checksum: sha256:7f8a9b...

Backup complete!

Files created:
- scripts/backups/backup_20260124_103000_mods.json (2.4 MB)
- scripts/backups/backup_20260124_103000_mods_restore.ts

To restore this backup later:
$ npx tsx scripts/backups/backup_20260124_103000_mods_restore.ts --restore

You can now safely run your destructive script.
```

---

## Integration with DB-Script Agent

When db-script detects a destructive operation:

1. db-script classifies script as "destructive"
2. db-script invokes db-backup agent
3. db-backup creates backup and returns confirmation
4. db-script proceeds with execution
5. If script fails, user can invoke restore

Example flow:
```
User: Run scripts/delete-orphan-favorites.ts --fix

DB-Script: This is a destructive operation (contains deleteMany).
           Invoking db-backup first...

DB-Backup: Backing up favorites table...
           Created backup_20260124_favorites.json (1,234 records)

DB-Script: Backup complete. Proceeding with deletion...
           Deleted 156 orphan records.

           If you need to restore:
           $ npx tsx scripts/backups/backup_20260124_favorites_restore.ts --restore
```
