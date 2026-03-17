#!/usr/bin/env npx tsx
/**
 * Security Scanner: Verify all admin API routes have authentication
 *
 * This script scans all files in /app/api/admin/ and verifies they contain
 * proper authentication checks. Run this as part of CI or pre-commit hooks.
 *
 * Usage:
 *   npx tsx scripts/security/check-admin-auth.ts
 *   npm run security:check-admin-auth
 *
 * Exit codes:
 *   0 - All routes have proper auth
 *   1 - Some routes are missing auth (security vulnerability)
 */

import * as fs from 'fs';
import * as path from 'path';

const ADMIN_API_DIR = path.join(process.cwd(), 'app/api/admin');

// Patterns that indicate proper authentication is in place
const AUTH_PATTERNS = [
  // NextAuth session-based auth
  /getServerSession\s*\(\s*authOptions\s*\)/,
  // Custom admin auth middleware
  /requireAdmin\s*\(/,
  // Token-based auth (for scripts)
  /authHeader.*authorization/i,
  // Alternative session check
  /session\?\.user\?\.isAdmin/,
];

// HTTP methods that need auth (exported functions in route files)
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

interface RouteIssue {
  file: string;
  method: string;
  issue: string;
}

function findRouteFiles(dir: string): string[] {
  const files: string[] = [];

  if (!fs.existsSync(dir)) {
    return files;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...findRouteFiles(fullPath));
    } else if (entry.name === 'route.ts' || entry.name === 'route.js') {
      files.push(fullPath);
    }
  }

  return files;
}

function extractExportedMethods(content: string): string[] {
  const methods: string[] = [];

  for (const method of HTTP_METHODS) {
    // Match: export async function GET, export function GET, export const GET
    const patterns = [
      new RegExp(`export\\s+async\\s+function\\s+${method}\\s*\\(`),
      new RegExp(`export\\s+function\\s+${method}\\s*\\(`),
      new RegExp(`export\\s+const\\s+${method}\\s*=`),
    ];

    for (const pattern of patterns) {
      if (pattern.test(content)) {
        methods.push(method);
        break;
      }
    }
  }

  return methods;
}

function hasAuthCheck(content: string): boolean {
  return AUTH_PATTERNS.some((pattern) => pattern.test(content));
}

function extractFunctionBody(content: string, method: string): string {
  // Find the function and extract its body (simplified extraction)
  const functionPatterns = [
    new RegExp(`export\\s+async\\s+function\\s+${method}[\\s\\S]*?^\\}`, 'gm'),
    new RegExp(`export\\s+function\\s+${method}[\\s\\S]*?^\\}`, 'gm'),
  ];

  for (const pattern of functionPatterns) {
    const match = content.match(pattern);
    if (match) {
      return match[0];
    }
  }

  return content; // Fall back to checking entire file
}

function checkRouteFile(filePath: string): RouteIssue[] {
  const issues: RouteIssue[] = [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const relativePath = path.relative(process.cwd(), filePath);
  const methods = extractExportedMethods(content);

  if (methods.length === 0) {
    return issues; // No HTTP handlers, skip
  }

  // Check if file has any auth pattern
  if (!hasAuthCheck(content)) {
    for (const method of methods) {
      issues.push({
        file: relativePath,
        method,
        issue: 'No authentication check found in file',
      });
    }
    return issues;
  }

  // More granular check: verify each method has auth
  // This is a simplified check - for complex cases, manual review is needed
  for (const method of methods) {
    const functionBody = extractFunctionBody(content, method);
    const hasAuth = AUTH_PATTERNS.some((pattern) => pattern.test(functionBody));

    if (!hasAuth) {
      // Double-check if auth is at file level (some patterns apply to all handlers)
      const hasFileWideAuth = /requireAdmin\s*\(/.test(content);
      if (!hasFileWideAuth) {
        issues.push({
          file: relativePath,
          method,
          issue: `${method} handler may be missing auth check`,
        });
      }
    }
  }

  return issues;
}

function main() {
  console.log('🔒 Admin API Route Security Scanner');
  console.log('====================================\n');

  const routeFiles = findRouteFiles(ADMIN_API_DIR);

  if (routeFiles.length === 0) {
    console.log('⚠️  No admin API routes found in', ADMIN_API_DIR);
    process.exit(0);
  }

  console.log(`📁 Found ${routeFiles.length} admin API route files\n`);

  const allIssues: RouteIssue[] = [];

  for (const file of routeFiles) {
    const issues = checkRouteFile(file);
    allIssues.push(...issues);

    const relativePath = path.relative(process.cwd(), file);
    if (issues.length === 0) {
      console.log(`✅ ${relativePath}`);
    } else {
      console.log(`❌ ${relativePath}`);
      for (const issue of issues) {
        console.log(`   └─ ${issue.method}: ${issue.issue}`);
      }
    }
  }

  console.log('\n====================================');

  if (allIssues.length === 0) {
    console.log('✅ All admin routes have authentication checks!');
    console.log('\n📝 Note: Middleware also protects /api/admin/* as defense-in-depth.');
    process.exit(0);
  } else {
    console.log(`❌ Found ${allIssues.length} potential security issue(s)!\n`);
    console.log('🔧 To fix:');
    console.log('   1. Add authentication check at the start of each handler:');
    console.log('      const session = await getServerSession(authOptions);');
    console.log("      if (!session?.user?.isAdmin) {");
    console.log("        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });");
    console.log('      }');
    console.log('\n   2. Import required modules:');
    console.log("      import { getServerSession } from 'next-auth';");
    console.log("      import { authOptions } from '@/lib/authOptions';");
    console.log('\n📝 Note: Middleware provides first line of defense, but route-level');
    console.log('   auth is required for defense-in-depth.');
    process.exit(1);
  }
}

main();
