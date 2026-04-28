/**
 * Tier-2 cookie-auth resolver for paywalled Patreon posts.
 *
 * Why this exists:
 *   The standard backfill (scripts/backfill-mhm-authors.ts) calls Patreon's
 *   public posts API. For paid posts the API returns 403 ViewForbidden — no
 *   author, no campaign info. The extractor flags those mods with
 *   `isPaywalled: true`, and the backfill marks them `isFree: false`, but
 *   the author column stays null.
 *
 *   This script bridges that gap: it logs in to Patreon ONCE via Playwright,
 *   saves the auth cookies, and then re-runs the same public posts API
 *   request — but with the user's session cookies attached, so paid posts
 *   come back fully populated.
 *
 *   We DON'T scrape the rendered HTML. We just borrow the cookies and call
 *   the same JSON:API endpoint the public path uses. This keeps the
 *   author-resolution logic identical (full_name → campaign.name → vanity
 *   fallback chain) and gives us a single source of truth.
 *
 * Usage:
 *   # First time only — opens a browser so you can log in interactively:
 *   npx tsx scripts/resolve-paywalled-patreon.ts --login
 *
 *   # Resolve all paywalled MHM mods using saved cookies (dry run):
 *   npx tsx scripts/resolve-paywalled-patreon.ts
 *
 *   # Apply to DB:
 *   npx tsx scripts/resolve-paywalled-patreon.ts --apply
 *
 *   # Limit / target:
 *   npx tsx scripts/resolve-paywalled-patreon.ts --apply --limit 5
 *
 * Auth state lives in .playwright-state/patreon-state.json (gitignored).
 * Re-run --login any time the cookies expire.
 */

import './lib/setup-env';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { chromium, type BrowserContext, type Cookie } from 'playwright';
import { prisma } from '../lib/prisma';
import { isValidAuthor } from '../lib/services/scraperExtraction/badAuthorPatterns';

// ---------------- config ----------------

const STATE_DIR = path.join(process.cwd(), '.playwright-state');
const STATE_FILE = path.join(STATE_DIR, 'patreon-state.json');
const LOGIN_URL = 'https://www.patreon.com/login';
const ROOT_URL = 'https://www.patreon.com/home';

interface Flags {
  login: boolean;
  apply: boolean;
  limit?: number;
  delayMs: number;
}

function parseFlags(argv: string[]): Flags {
  const flags: Flags = { login: false, apply: false, delayMs: 800 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--login') flags.login = true;
    else if (a === '--apply') flags.apply = true;
    else if (a === '--limit' && argv[i + 1]) flags.limit = parseInt(argv[++i], 10);
    else if (a === '--delay' && argv[i + 1]) flags.delayMs = parseInt(argv[++i], 10);
    else if (a === '--help' || a === '-h') {
      console.log(
        '\nUsage: resolve-paywalled-patreon.ts [--login] [--apply] [--limit N] [--delay ms]\n\n' +
          '  --login     Open a browser to log in to Patreon (one-time setup)\n' +
          '  --apply     Actually write to DB (default: dry run)\n' +
          '  --limit N   Process at most N rows\n' +
          '  --delay ms  Sleep between API calls (default: 800)\n',
      );
      process.exit(0);
    }
  }
  return flags;
}

// ---------------- login flow ----------------

/**
 * Open a non-headless browser, point it at Patreon's login page, and wait
 * until the user has finished logging in. Detected by polling the URL — once
 * we hit the post-login redirect (/home or any non-login URL on patreon.com),
 * we save the storage state and exit.
 *
 * Patreon supports Google/Apple/email login. Magic links via email are also
 * supported. We don't handle any of that here — we just give the user a
 * browser and let them do whatever they need to.
 */
async function loginInteractive(): Promise<void> {
  if (!fs.existsSync(STATE_DIR)) {
    fs.mkdirSync(STATE_DIR, { recursive: true });
  }

  console.log('🌐 Opening browser for Patreon login...');
  console.log('   Please log in to your Patreon account in the browser window.');
  console.log('   Once you\'re past the login page, this script will save the cookies and exit.');
  console.log();

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' });

  // Poll the URL — when we leave /login (anywhere else on patreon.com), the
  // user has signed in. 5-minute timeout.
  const start = Date.now();
  const TIMEOUT_MS = 5 * 60 * 1000;
  while (Date.now() - start < TIMEOUT_MS) {
    const url = page.url();
    if (
      url.startsWith('https://www.patreon.com/') &&
      !url.includes('/login') &&
      !url.includes('/signup')
    ) {
      break;
    }
    await page.waitForTimeout(1000);
  }

  if (page.url().includes('/login') || page.url().includes('/signup')) {
    console.error('❌ Login timed out (5 min). Re-run --login to try again.');
    await browser.close();
    process.exit(1);
  }

  await context.storageState({ path: STATE_FILE });
  console.log(`✅ Saved auth state → ${STATE_FILE}`);

  await browser.close();
}

// ---------------- cookie-aware API call ----------------

/**
 * Read cookies from the saved storage state and format them as a Cookie
 * header value for axios. Filters to only patreon.com cookies (saves header
 * size, avoids leaking unrelated cookies).
 */
function readPatreonCookieHeader(): string {
  if (!fs.existsSync(STATE_FILE)) {
    throw new Error(
      `No auth state at ${STATE_FILE}. Run with --login first.`,
    );
  }
  const raw = fs.readFileSync(STATE_FILE, 'utf-8');
  const state = JSON.parse(raw) as { cookies: Cookie[] };
  const patreon = (state.cookies || []).filter(
    c => c.domain && c.domain.includes('patreon.com'),
  );
  if (patreon.length === 0) {
    throw new Error('Saved state has no patreon.com cookies. Re-run --login.');
  }
  return patreon.map(c => `${c.name}=${c.value}`).join('; ');
}

interface ResolveResult {
  value: string | null;
  strategy: string;
}

/**
 * Call the same `/api/posts/{id}` endpoint as fromPatreonApi, but with
 * authenticated cookies. Reuse the fallback chain (full_name →
 * campaign.name → vanity), each denylist-checked.
 */
async function resolveWithCookies(
  postId: string,
  cookieHeader: string,
): Promise<ResolveResult> {
  const url = `https://www.patreon.com/api/posts/${postId}`;
  let response;
  try {
    response = await axios.get(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        Accept: 'application/json',
        Cookie: cookieHeader,
      },
      timeout: 12000,
      validateStatus: s => s < 600,
    });
  } catch (e) {
    return { value: null, strategy: `network-error:${e instanceof Error ? e.message : 'unknown'}` };
  }

  if (response.status === 403) {
    const code = response.data?.errors?.[0]?.code_name;
    return {
      value: null,
      strategy: code === 'ViewForbidden'
        ? 'still-paywalled-cookies-rejected'
        : `403:${code ?? 'unknown'}`,
    };
  }
  if (response.status !== 200) {
    return { value: null, strategy: `status-${response.status}` };
  }

  const data = response.data;
  if (!data || !Array.isArray(data.included)) {
    return { value: null, strategy: 'no-included-array' };
  }

  // Same priority chain as fromPatreonApi.
  type Pri = { value: string; strategy: string };
  const priorities: Pri[] = [];

  for (const item of data.included) {
    if (item?.type !== 'user') continue;
    const attrs = item.attributes || {};
    const fullName = typeof attrs.full_name === 'string' ? attrs.full_name.trim() : '';
    if (fullName.length >= 2) priorities.push({ value: fullName, strategy: 'patreon-api-cookie' });
  }
  for (const item of data.included) {
    if (item?.type !== 'campaign') continue;
    const attrs = item.attributes || {};
    const name = typeof attrs.name === 'string' ? attrs.name.trim() : '';
    if (name.length >= 2) priorities.push({ value: name, strategy: 'patreon-api-cookie-campaign' });
  }
  for (const item of data.included) {
    if (item?.type !== 'user') continue;
    const attrs = item.attributes || {};
    const vanity = typeof attrs.vanity === 'string' ? attrs.vanity.trim() : '';
    if (vanity.length >= 2) priorities.push({ value: vanity, strategy: 'patreon-api-cookie-vanity' });
  }

  for (const p of priorities) {
    if (isValidAuthor(p.value)) {
      return { value: p.value, strategy: p.strategy };
    }
  }
  return { value: null, strategy: 'all-denylisted' };
}

// ---------------- DB-driven loop ----------------

function extractPostId(url: string): string | null {
  let parsed: URL;
  try { parsed = new URL(url); } catch { return null; }
  if (!parsed.hostname.toLowerCase().includes('patreon.com')) return null;
  const m = parsed.pathname.match(/^\/posts\/(?:.*-)?(\d+)\/?$/);
  return m?.[1] ?? null;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

async function resolveAll(flags: Flags): Promise<void> {
  let cookieHeader: string;
  try {
    cookieHeader = readPatreonCookieHeader();
  } catch (e) {
    console.error(`❌ ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }

  // Target: paywalled MHM mods with null author. We trust the existing
  // isPaywalled flag (isFree=false from the standard backfill) — those are
  // exactly the ones the public API couldn't read.
  const rows = await prisma.mod.findMany({
    where: {
      source: 'MustHaveMods.com',
      author: null,
      isFree: false,
      downloadUrl: { contains: 'patreon.com' },
    },
    select: { id: true, title: true, downloadUrl: true },
    take: flags.limit,
    orderBy: { createdAt: 'asc' },
  });

  console.log(`🔐 Tier-2 paywalled-mod resolver`);
  console.log(`   mode: ${flags.apply ? 'APPLY' : 'DRY RUN'}`);
  console.log(`   delay: ${flags.delayMs}ms\n`);
  console.log(`Found ${rows.length} paywalled MHM mods with null author.\n`);

  let recovered = 0;
  let written = 0;
  const byStrategy: Record<string, number> = {};

  for (let i = 0; i < rows.length; i++) {
    const mod = rows[i];
    const postId = mod.downloadUrl ? extractPostId(mod.downloadUrl) : null;
    if (!postId) {
      console.log(`  ⛔ [${i + 1}/${rows.length}] not a /posts/ URL — ${mod.downloadUrl}`);
      continue;
    }

    const result = await resolveWithCookies(postId, cookieHeader);
    byStrategy[result.strategy] = (byStrategy[result.strategy] ?? 0) + 1;

    if (result.value) {
      recovered++;
      const marker = flags.apply ? '💾' : '👀';
      console.log(
        `  ${marker} [${String(i + 1).padStart(2, ' ')}/${rows.length}] ${result.value.padEnd(28)} (${result.strategy}) — ${mod.title.slice(0, 50)}`,
      );
      if (flags.apply) {
        try {
          await prisma.mod.update({
            where: { id: mod.id },
            data: { author: result.value },
          });
          written++;
        } catch (err) {
          console.log(`      ⚠️  update failed: ${err instanceof Error ? err.message : err}`);
        }
      }
    } else {
      console.log(
        `  … [${String(i + 1).padStart(2, ' ')}/${rows.length}] ${'(unresolved)'.padEnd(28)} (${result.strategy}) — ${mod.title.slice(0, 50)}`,
      );
    }

    if (flags.delayMs > 0 && i < rows.length - 1) {
      await sleep(flags.delayMs);
    }
  }

  console.log('\n📊 Summary');
  console.log(`   processed: ${rows.length}`);
  console.log(`   recovered: ${recovered}`);
  if (flags.apply) console.log(`   written:   ${written}`);
  console.log('\n   by strategy:');
  for (const [k, v] of Object.entries(byStrategy).sort((a, b) => b[1] - a[1])) {
    console.log(`     ${k.padEnd(40)} ${v}`);
  }

  await prisma.$disconnect();
}

// ---------------- entrypoint ----------------

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));
  if (flags.login) {
    await loginInteractive();
    return;
  }
  await resolveAll(flags);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
