#!/usr/bin/env node

/**
 * Sync Environment Variables to Vercel
 *
 * This script uploads all variables from .env.production to Vercel
 * Usage: npm run env:push
 */

const fs = require('fs');
const path = require('path');
const { execSync, execFileSync } = require('child_process');
const readline = require('readline');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

const log = {
  error: (msg) => console.error(`${colors.red}${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}${msg}${colors.reset}`),
};

/**
 * Run the Vercel CLI WITHOUT a shell, passing the value on stdin.
 *
 * This used to be `echo "${value}" | vercel env add …` through a shell, so a value
 * containing `$`, a backtick, `"` or `\` was expanded or mangled before Vercel saw it —
 * a database password with a `$` in it was silently stored wrong.
 * Returns true on success, false on any failure. Never prints the value.
 */
function vercel(args, input, run = execFileSync) {
  try {
    run('vercel', args, { input, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Upload one variable. Returns:
 *   'uploaded'             added (it did not exist)
 *   'updated'              existed: removed, then re-added
 *   'failed'               could not add, and nothing was removed
 *   'removed-not-restored' removed, then BOTH re-add attempts failed — the variable is
 *                          now absent from Vercel. The caller must say so loudly; this
 *                          case used to be counted as an ordinary "failed".
 */
function uploadVar(key, value, environment, run = execFileSync) {
  const add = () => vercel(['env', 'add', key, environment], value, run);
  if (add()) return 'uploaded';

  // `env add` fails when the variable already exists. Replace it.
  if (!vercel(['env', 'rm', key, environment, '-y'], undefined, run)) return 'failed';
  if (add() || add()) return 'updated';
  return 'removed-not-restored';
}

// Parse .env file
function parseEnvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const env = {};

  for (const line of lines) {
    // Skip empty lines and comments
    if (!line.trim() || line.trim().startsWith('#')) {
      continue;
    }

    // Parse key=value
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();

      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      env[key] = value;
    }
  }

  return env;
}

// Check if value is a placeholder
function isPlaceholder(value) {
  const placeholders = [
    'your-',
    'xxxxx',
    'REPLACE_WITH_',
    '1x00000000000000000000AA', // Turnstile test key
  ];

  return placeholders.some(p => value.includes(p));
}

// Execute command and return output
function exec(command) {
  try {
    return execSync(command, { encoding: 'utf-8', stdio: 'pipe' });
  } catch (error) {
    return null;
  }
}

// Main function
async function main() {
  console.log('\n' + colors.blue + '╔════════════════════════════════════════╗' + colors.reset);
  console.log(colors.blue + '║  MHMFinds Environment Variable Sync   ║' + colors.reset);
  console.log(colors.blue + '╚════════════════════════════════════════╝' + colors.reset + '\n');

  // Check if .env.production exists
  const envPath = path.join(process.cwd(), '.env.production');
  if (!fs.existsSync(envPath)) {
    log.error('Error: .env.production file not found!');
    console.log('Please create .env.production with your production values');
    process.exit(1);
  }

  // Check if Vercel CLI is installed
  const hasVercelCLI = exec('vercel --version');
  if (!hasVercelCLI) {
    log.warning('Vercel CLI not found. Installing...');
    exec('npm install -g vercel');
  }

  // Check Vercel auth
  log.info('Step 1: Vercel Authentication');
  const whoami = exec('vercel whoami');
  if (!whoami) {
    console.log('Please login to Vercel:');
    execSync('vercel login', { stdio: 'inherit' });
  } else {
    log.success(`Logged in as: ${whoami.trim()}`);
  }

  // Check if project is linked
  const vercelDir = path.join(process.cwd(), '.vercel');
  if (!fs.existsSync(vercelDir)) {
    log.info('Step 2: Linking to Vercel Project');
    execSync('vercel link', { stdio: 'inherit' });
  }

  // Parse .env.production
  log.info('\nStep 3: Loading Environment Variables');
  const envVars = parseEnvFile(envPath);
  const totalVars = Object.keys(envVars).length;
  console.log(`Found ${totalVars} variables in .env.production\n`);

  // Ask which environment to upload to
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const environment = await new Promise((resolve) => {
    rl.question('Upload to which environment? (production/preview/development) [production]: ', (answer) => {
      resolve(answer.trim() || 'production');
    });
  });

  // Confirm
  console.log(`\n${colors.yellow}⚠️  WARNING: This will upload variables to ${environment} environment${colors.reset}`);
  const confirm = await new Promise((resolve) => {
    rl.question('Continue? (y/n): ', (answer) => {
      resolve(answer.toLowerCase() === 'y');
    });
  });

  rl.close();

  if (!confirm) {
    log.error('Aborted');
    process.exit(0);
  }

  // Upload variables
  console.log(`\n${colors.green}Uploading variables...${colors.reset}\n`);

  let successCount = 0;
  let errorCount = 0;
  let skipCount = 0;
  const removedNotRestored = [];

  for (const [key, value] of Object.entries(envVars)) {
    // Skip placeholders
    if (isPlaceholder(value)) {
      log.warning(`⊘ Skipped: ${key} (placeholder value)`);
      skipCount++;
      continue;
    }

    const outcome = uploadVar(key, value, environment);
    if (outcome === 'uploaded') {
      log.success(`✓ Uploaded: ${key}`);
      successCount++;
    } else if (outcome === 'updated') {
      log.success(`✓ Updated: ${key}`);
      successCount++;
    } else if (outcome === 'removed-not-restored') {
      log.error(`✗ REMOVED AND NOT RE-ADDED: ${key}`);
      removedNotRestored.push(key);
      errorCount++;
    } else {
      log.error(`✗ Failed: ${key}`);
      errorCount++;
    }
  }

  // Summary
  console.log('\n' + colors.blue + '╔════════════════════════════════════════╗' + colors.reset);
  console.log(colors.blue + '║           Upload Summary               ║' + colors.reset);
  console.log(colors.blue + '╚════════════════════════════════════════╝' + colors.reset);
  log.success(`Success: ${successCount} variables`);
  log.warning(`Skipped: ${skipCount} variables (placeholders)`);
  log.error(`Errors: ${errorCount} variables`);
  console.log('');

  if (removedNotRestored.length > 0) {
    log.error(`\n⛔ ${removedNotRestored.length} variable(s) were REMOVED from ${environment} and could not be re-added:`);
    for (const key of removedNotRestored) log.error(`   - ${key}`);
    log.error('They are NOT set in Vercel right now. Add them in the dashboard before the next deploy.\n');
  }

  if (errorCount > 0) {
    log.warning('⚠️  Some variables failed to upload. Please upload them manually in Vercel Dashboard.');
    console.log('https://vercel.com/dashboard');
  }

  if (skipCount > 0) {
    log.warning('⚠️  Some variables were skipped because they have placeholder values.');
    console.log('Please update .env.production with real values and run this script again.');
  }

  console.log('');
  log.success('✓ Done!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Verify variables in Vercel Dashboard: https://vercel.com/dashboard');
  console.log('2. Update any skipped variables manually');
  console.log('3. Trigger a new deployment: vercel --prod');
  console.log('');
}

module.exports = { parseEnvFile, uploadVar };

// Run only when executed directly (the tests require() this file).
if (require.main === module) {
  main().catch((error) => {
    log.error(`Error: ${error.message}`);
    process.exit(1);
  });
}
