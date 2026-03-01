# Development Workflow

## Core Commands

```bash
npm run dev                 # Start Next.js dev server (localhost:3000)
npm run build              # Build for production
npm run start              # Start production server
npm run lint               # Run Next.js linter
npm run type-check         # TypeScript type checking
npm run clean              # Clear .next and node_modules/.cache
npm run dev:clean          # Clean + start dev server
```

## Database Commands

```bash
npm run db:generate        # Generate Prisma client
npm run db:push            # Push schema changes (no migration)
npm run db:migrate         # Create and apply migration
npm run db:studio          # Open Prisma Studio GUI
npm run db:seed            # Seed database
npm run db:reset           # Reset database (WARNING: deletes all data)
npm run db:deploy          # Apply migrations in production
```

## Content Aggregation

```bash
npm run content:aggregate      # Standard aggregation
npm run content:privacy        # Privacy-enhanced (default)
npm run content:stealth        # Stealth mode (max privacy)
npm run content:conservative   # Conservative (slowest, safest)
npm run content:test           # Test without database writes
```

## Data Cleanup

```bash
npx tsx scripts/cleanup-author-data.ts              # Dry run
npx tsx scripts/cleanup-author-data.ts --fix        # Apply fixes
npx tsx scripts/cleanup-author-data.ts --fix --limit=100
```

## Webpack Cache Corruption

Next.js webpack cache can become corrupted, causing errors like:

- `Cannot find module './657.js'`
- `ENOENT: no such file or directory, lstat '.next/server/vendor-chunks/...'`
- `Can't resolve './vendor-chunks/lucide-react'`

**Fix:** Run `npm run clean` or `npm run dev:clean`.

**Prevention:** Run `npm run clean` after significant dependency or import changes.

## Vercel Build

Build command is `npx prisma generate && next build`.

DO NOT add `prisma migrate deploy` to the build command. If the database is temporarily unreachable during build, the entire deployment fails. Instead, apply migrations manually before deploying:

```bash
npm run db:deploy
```

## Environment Variables

See `.env.example` for the full list.

### Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Prisma Accelerate URL (`prisma+postgres://accelerate.prisma-data.net/...`) |
| `DIRECT_DATABASE_URL` | Direct PostgreSQL connection for migrations |
| `NEXTAUTH_SECRET` | JWT signing secret |
| `NEXTAUTH_URL` | App URL (`http://localhost:3000` in dev) |
| `OPENAI_API_KEY` | AI search |
| `CURSEFORGE_API_KEY` | Content aggregation |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` | Discord OAuth |

> **WARNING:** `DATABASE_URL` vs `DIRECT_DATABASE_URL` are often confused. `DATABASE_URL` should be the Accelerate URL (starts with `prisma+postgres://`). `DIRECT_DATABASE_URL` should be the direct postgres connection used for migrations.

### Optional

- Redis, Elasticsearch, AWS S3, SendGrid (not currently implemented)
- `PRIVACY_LEVEL` - Set to `stealth` or `conservative` for content aggregation
- `AMAZON_CREATORS_CREDENTIAL_ID` - Amazon Creators API credential ID
- `AMAZON_CREATORS_CREDENTIAL_SECRET` - Amazon Creators API credential secret
- `AMAZON_CREATORS_APPLICATION_ID` - Amazon Creators API application ID
- `AMAZON_PARTNER_TAG` - Amazon Associates partner tag

## Testing

- Run `npm run security:check-admin-auth` before committing changes to admin routes.
- Test pages exist in `/app` for UI prototyping.
- When adding mods via aggregation, call `aiSearchService.updateSearchIndex(modId)` to generate embeddings.

## Agent Workflow

```
/commitit --> /reviewit --> /shipit
    |             |            |
    v             v            v
 Feature      PR Summary   Production
 Branch       + Checks     Deployment
```

Agents work on feature branches, never directly on main. Use `/reviewit` before `/shipit`.

## Automated Compound System

Nightly automation scripts live in `scripts/compound/`.

| Time | Script | Purpose |
|------|--------|---------|
| 10:00 PM | `daily-compound-review.sh` | Reviews git log from past 24 hours, updates CLAUDE.md with learnings, commits and pushes to main |
| 11:00 PM | `auto-compound.sh` | Reads priority report, creates feature branch, generates PRD in `tasks/prd-compound/`, executes tasks via `loop.sh`, creates draft PR |

The compound system always works on feature branches, never main. Draft PRs require human review before merge.
