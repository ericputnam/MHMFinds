/**
 * Environment Setup for Scripts
 *
 * IMPORTANT: This file MUST be imported at the very top of any script that uses Prisma,
 * BEFORE any other imports.
 *
 * This fixes the Prisma Accelerate issue where scripts cannot use prisma+postgres:// URLs.
 * It overrides DATABASE_URL with DIRECT_DATABASE_URL for direct database access.
 *
 * Usage:
 *   // At the very top of your script, before any other imports:
 *   import '../lib/setup-env';
 *   // or
 *   import './lib/setup-env';
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env files
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
const hadDatabaseUrl = Boolean(process.env.DATABASE_URL || process.env.DIRECT_DATABASE_URL);
dotenv.config({ path: path.resolve(process.cwd(), '.env.production') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// dotenv never overrides, so .env.production only supplies what .env.local (and the
// shell) left unset. When that includes the database URL, this script is about to run
// against PRODUCTION — say so, once, before anything connects. It used to be silent.
if (!hadDatabaseUrl && (process.env.DATABASE_URL || process.env.DIRECT_DATABASE_URL)) {
  console.warn(
    '[setup-env] WARNING: no database URL in .env.local or the environment — using the one from ' +
      '.env.production / .env. This script will run against that database (likely PRODUCTION).'
  );
}

// CRITICAL: Scripts cannot use Prisma Accelerate (prisma+postgres:// URLs)
// Override DATABASE_URL with DIRECT_DATABASE_URL for direct database access
if (process.env.DIRECT_DATABASE_URL) {
  const originalUrl = process.env.DATABASE_URL || '';
  if (originalUrl.startsWith('prisma://') || originalUrl.startsWith('prisma+postgres://')) {
    process.env.DATABASE_URL = process.env.DIRECT_DATABASE_URL;
    console.log('[Prisma] Using DIRECT_DATABASE_URL for script execution');
  }
} else if (
  process.env.DATABASE_URL?.startsWith('prisma://') ||
  process.env.DATABASE_URL?.startsWith('prisma+postgres://')
) {
  console.warn(
    '[Prisma] WARNING: DATABASE_URL is an Accelerate URL but DIRECT_DATABASE_URL is not set.'
  );
  console.warn('[Prisma] Scripts cannot use Accelerate URLs. Set DIRECT_DATABASE_URL in .env.local');
}
