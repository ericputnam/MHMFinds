#!/usr/bin/env tsx

/**
 * Push Environment Variables to Vercel
 *
 * This script reads .env.production and uploads variables to Vercel.
 * It automatically skips placeholder values to avoid uploading dummy data.
 *
 * Usage:
 *   npm run env:push
 *
 * Prerequisites:
 *   1. Install Vercel CLI: npm i -g vercel
 *   2. Login: vercel login
 *   3. Link project: vercel link (if not already linked)
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

// Placeholder patterns to skip
const PLACEHOLDER_PATTERNS = [
  /^YOUR_/i,
  /^CHANGE_THIS/i,
  /^REPLACE_WITH/i,
  /^GENERATE_/i,
  /^sk_test_/,  // Stripe test keys
  /^pk_test_/,  // Stripe test keys
  /xxxxx/,
  /your-.*-key/i,
  /your-.*-secret/i,
  /your-.*-id/i,
  /localhost/,
  /127\.0\.0\.1/,
];

// Variables that should NOT be uploaded to production
const SKIP_VARIABLES = [
  'NODE_ENV',           // Vercel sets this automatically
  'DEBUG',              // Development only
  'USE_OLLAMA',         // Local AI, won't work on Vercel
  'OLLAMA_BASE_URL',    // Local AI
  'OLLAMA_MODEL',       // Local AI
  'ELASTICSEARCH_URL',  // If pointing to localhost
];

interface EnvVariable {
  key: string;
  value: string;
  isPlaceholder: boolean;
  skipReason?: string;
}

/**
 * Parse .env file into key-value pairs
 */
function parseEnvFile(filePath: string): EnvVariable[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const variables: EnvVariable[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Parse KEY=VALUE
    const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!match) continue;

    const [, key, rawValue] = match;

    // Remove quotes from value
    let value = rawValue.trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    // Check if it's a placeholder
    const isPlaceholder = PLACEHOLDER_PATTERNS.some(pattern => pattern.test(value));

    // Check if it should be skipped
    let skipReason: string | undefined;
    if (SKIP_VARIABLES.includes(key)) {
      skipReason = 'automatically set by Vercel or not needed in production';
    } else if (isPlaceholder) {
      skipReason = 'placeholder value detected';
    } else if (!value || value === '') {
      skipReason = 'empty value';
    }

    variables.push({ key, value, isPlaceholder, skipReason });
  }

  return variables;
}

/**
 * Check if Vercel CLI is installed and authenticated
 */
function checkVercelCLI(): boolean {
  try {
    execSync('vercel --version', { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check if project is linked to Vercel
 */
function isProjectLinked(): boolean {
  try {
    const result = execSync('vercel project ls 2>&1', { encoding: 'utf-8' });
    return !result.includes('Error') && !result.includes('not linked');
  } catch (error) {
    return false;
  }
}

/**
 * Set environment variable in Vercel
 */
function setVercelEnv(key: string, value: string, environment: string = 'production'): boolean {
  try {
    // Create a temporary file with the value (to handle special characters)
    const tempFile = path.join(process.cwd(), `.env.tmp.${key}`);
    fs.writeFileSync(tempFile, value);

    // Use vercel env add with stdin
    const command = `cat ${tempFile} | vercel env add ${key} ${environment} --force`;
    execSync(command, {
      stdio: 'pipe',
      encoding: 'utf-8',
    });

    // Clean up temp file
    fs.unlinkSync(tempFile);

    return true;
  } catch (error: any) {
    console.error(`${colors.red}Error setting ${key}:${colors.reset}`, error.message);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log(`${colors.bright}${colors.cyan}`);
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   Push Environment Variables to Vercel Production   ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  // Check prerequisites
  console.log(`${colors.cyan}Checking prerequisites...${colors.reset}`);

  if (!checkVercelCLI()) {
    console.error(`${colors.red}✗ Vercel CLI not found${colors.reset}`);
    console.log(`\nInstall it with: ${colors.yellow}npm i -g vercel${colors.reset}`);
    process.exit(1);
  }
  console.log(`${colors.green}✓ Vercel CLI installed${colors.reset}`);

  if (!isProjectLinked()) {
    console.error(`${colors.red}✗ Project not linked to Vercel${colors.reset}`);
    console.log(`\nLink it with: ${colors.yellow}vercel link${colors.reset}`);
    process.exit(1);
  }
  console.log(`${colors.green}✓ Project linked to Vercel${colors.reset}`);

  // Read .env.production
  const envFilePath = path.join(process.cwd(), '.env.production');
  if (!fs.existsSync(envFilePath)) {
    console.error(`${colors.red}✗ .env.production not found${colors.reset}`);
    process.exit(1);
  }
  console.log(`${colors.green}✓ .env.production found${colors.reset}\n`);

  // Parse variables
  console.log(`${colors.cyan}Parsing environment variables...${colors.reset}`);
  const variables = parseEnvFile(envFilePath);

  const toUpload = variables.filter(v => !v.skipReason);
  const toSkip = variables.filter(v => v.skipReason);

  console.log(`${colors.green}Found ${variables.length} variables${colors.reset}`);
  console.log(`${colors.green}  → ${toUpload.length} ready to upload${colors.reset}`);
  console.log(`${colors.yellow}  → ${toSkip.length} will be skipped${colors.reset}\n`);

  // Show what will be skipped
  if (toSkip.length > 0) {
    console.log(`${colors.yellow}Skipping these variables:${colors.reset}`);
    toSkip.forEach(v => {
      console.log(`  ${colors.gray}✗ ${v.key}${colors.reset} - ${v.skipReason}`);
    });
    console.log();
  }

  // Show what will be uploaded
  if (toUpload.length === 0) {
    console.log(`${colors.yellow}No variables to upload!${colors.reset}`);
    console.log(`All variables are either placeholders or auto-set by Vercel.`);
    console.log(`\nUpdate values in .env.production and try again.`);
    process.exit(0);
  }

  console.log(`${colors.cyan}Will upload these variables:${colors.reset}`);
  toUpload.forEach(v => {
    const preview = v.value.length > 50
      ? v.value.substring(0, 47) + '...'
      : v.value;
    console.log(`  ${colors.green}✓ ${v.key}${colors.reset} = ${colors.gray}${preview}${colors.reset}`);
  });
  console.log();

  // Confirmation prompt
  console.log(`${colors.bright}Ready to upload ${toUpload.length} variables to Vercel Production.${colors.reset}`);
  console.log(`${colors.yellow}This will overwrite existing values!${colors.reset}\n`);

  // Auto-proceed (remove this if you want interactive confirmation)
  console.log(`${colors.cyan}Uploading...${colors.reset}\n`);

  // Upload each variable
  let successCount = 0;
  let failCount = 0;

  for (const variable of toUpload) {
    process.stdout.write(`  Uploading ${variable.key}... `);

    const success = setVercelEnv(variable.key, variable.value);

    if (success) {
      console.log(`${colors.green}✓${colors.reset}`);
      successCount++;
    } else {
      console.log(`${colors.red}✗${colors.reset}`);
      failCount++;
    }
  }

  // Summary
  console.log();
  console.log(`${colors.bright}Summary:${colors.reset}`);
  console.log(`  ${colors.green}✓ ${successCount} uploaded successfully${colors.reset}`);
  if (failCount > 0) {
    console.log(`  ${colors.red}✗ ${failCount} failed${colors.reset}`);
  }
  console.log(`  ${colors.gray}${toSkip.length} skipped${colors.reset}`);

  console.log(`\n${colors.cyan}Done! Your environment variables are now in Vercel.${colors.reset}`);
  console.log(`${colors.yellow}Redeploy to apply changes: git push origin main${colors.reset}\n`);
}

// Run the script
main().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
