# AGENTS.md - AI Agent Guidelines for MHMFinds

This document contains essential rules and patterns for AI agents working on this codebase.

## Build and Deployment Workflow

### Standard Build Process

```bash
# 1. Lint first (catches issues early)
npm run lint

# 2. Run tests (ensure nothing is broken)
npm run test:run

# 3. Build the application
npm run build

# 4. Restart dev server (never leave it stopped)
npm run dev
```

### Critical Build Rules

1. **Never skip the lint step** - Linting catches issues that cause build failures
2. **Never skip tests** - All tests must pass before deployment
3. **Never leave dev server stopped** - Always restart after build operations
4. **Fix issues immediately** - Don't proceed with failing steps

### Dev Server Management

The development server (`npm run dev`) should always be running during development.

**After any build operation:**
- Check if dev server is running
- If stopped, restart it immediately
- Verify it starts successfully on `localhost:3000`

**Commands:**
```bash
# Start dev server
npm run dev

# Start with clean cache (if having issues)
npm run dev:clean

# Clean caches only
npm run clean
```

### Cache Corruption Recovery

Next.js webpack cache can become corrupted. Symptoms:
- `Cannot find module './657.js'`
- `ENOENT: no such file or directory` errors
- Unexpected build failures

**Recovery:**
```bash
npm run clean
npm run dev
```

## Test Guidelines

### Test Commands

```bash
npm run test:run      # One-time test run (for CI/deployment)
npm run test:watch    # Watch mode (for development)
npm run test:coverage # With coverage report
```

### Test Rules

1. **Zero tolerance for failing tests** - Fix failures before committing
2. **Don't delete tests to make them pass** - Fix the underlying issue
3. **Add tests for new features** - Maintain coverage
4. **Run tests before every commit** - Part of the /shipit workflow

## Deployment Rules

### Pre-Deployment Checklist

Before pushing to remote (which triggers Vercel deployment):

- [ ] `npm run lint` passes with zero errors
- [ ] `npm run test:run` passes with zero failures
- [ ] `npm run build` succeeds
- [ ] All changes are committed
- [ ] Documentation is updated (if needed)

### Vercel Deployment

- Pushing to any branch triggers a preview deployment
- Pushing to `main` triggers production deployment
- Build command: `prisma generate && prisma migrate deploy && next build`

### Handling Deployment Failures

1. Check Vercel build logs: `vercel logs <deployment-url>`
2. Common issues:
   - Missing environment variables
   - Prisma migration failures
   - TypeScript errors not caught locally
   - Memory limit exceeded
3. Fix locally, test with `npm run build`, then redeploy

## Database Rules

### Prisma Guidelines

1. **Never modify `lib/prisma.ts` without understanding connection pooling**
2. **Always generate client after schema changes:** `npm run db:generate`
3. **Test migrations locally before deploying**
4. **Never commit database credentials**

### Migration Workflow

```bash
# Development: Create and apply migration
npm run db:migrate

# Production: Apply existing migrations
npm run db:deploy

# Reset (DANGEROUS - deletes all data)
npm run db:reset
```

## Code Quality Rules

### Before Committing

1. Run the full `/shipit` workflow, OR at minimum:
   - `npm run lint`
   - `npm run test:run`
   - `npm run build`

2. Review your changes with `git diff`

3. Write clear commit messages following conventional commits

### Commit Message Format

```
<type>: <short description>

[optional body]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style (formatting, semicolons, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements

## Security Rules

### Never Commit

- API keys or secrets
- Database credentials
- `.env` files (except `.env.example`)
- Private keys or certificates
- Session secrets

### Safe Patterns

- Use `.env.local` for local development
- Use Vercel environment variables for production
- Use placeholder values in documentation: `[YOUR_KEY_HERE]`

## Documentation Rules

### When to Update Docs

- Adding new API endpoints → Update API docs
- Changing database schema → Update database docs
- Adding new features → Update relevant feature docs
- Changing configuration → Update ENV/config docs

### Doc Locations

- `docs/` - Technical documentation
- `README.md` - Project overview
- `CLAUDE.md` - AI agent instructions
- `AGENTS.md` - This file (agent guidelines)
- `QUICKSTART.md` - Getting started guide

## Emergency Procedures

### Site Down - Quick Recovery

1. **Rollback in Vercel:**
   ```bash
   vercel ls  # Find last working deployment
   vercel rollback <deployment-url>
   ```

2. **Fix locally, then redeploy**

### Database Connection Issues

1. Check Prisma dashboard for connection status
2. Verify `DATABASE_URL` in environment
3. Check if connection pool is exhausted
4. Wait 2-3 minutes for connections to timeout
5. Redeploy

### Cache Issues

```bash
npm run clean
rm -rf .next
npm run dev
```

## Agent-Specific Rules

### For AI Agents Using This Codebase

1. **Read CLAUDE.md first** - Contains critical project-specific rules
2. **Use /shipit for deployments** - Don't manually push without checks
3. **Ask when uncertain** - Better to ask than break production
4. **Never skip steps** - All workflow steps exist for a reason
5. **Document your changes** - Keep docs in sync with code
