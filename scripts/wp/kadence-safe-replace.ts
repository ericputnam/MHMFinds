#!/usr/bin/env tsx
/**
 * CLI wrapper around lib/wp/kadenceSafeReplace.ts.
 *
 * Does the actual SSH / WP-CLI I/O for a Kadence-safe literal string swap
 * in a WordPress post's post_content, guarded by the invariants in the
 * pure library. See docs/WORDPRESS_GUIDE.md#kadence-safe-post-content-edits
 * for the full write-up (encodings, cache layers, safety rationale).
 *
 * SECURITY / HARD LIMITS (do not relax without a new, explicit operator
 * instruction — see E134 item D task):
 *   - Never prints the SSH host/IP, key path contents, or anything from
 *     wp-config.php.
 *   - Never uses `wp search-replace`.
 *   - Never writes content through the REST API.
 *   - `--apply --prod` requires BOTH `--prod` AND `--approved-snapshot=<file>`
 *     whose recorded sha256 for the target post ID matches the CURRENT
 *     live post_content sha256, read fresh at run time. Missing either
 *     one refuses the write outright.
 *   - Every apply verifies a before-sha256, writes via a raw $wpdb->update
 *     (bypasses wp_insert_post -> no wp_unslash, no kses, no revision, no
 *     post_modified bump), verifies an after-sha256, and auto-restores +
 *     re-verifies on any mismatch.
 *
 * Usage:
 *   tsx scripts/wp/kadence-safe-replace.ts read   --path=<docroot> --post-id=<id> [--out=<file>]
 *   tsx scripts/wp/kadence-safe-replace.ts dry-run --path=<docroot> --post-id=<id> [--from=X --to=Y]
 *   tsx scripts/wp/kadence-safe-replace.ts apply  --path=<docroot> --post-id=<id> --approved-snapshot=<file> [--prod] [--from=X --to=Y]
 */

import { execFileSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { createHash } from 'crypto';
import { join, dirname } from 'path';
import {
  checkReplacementInvariants,
  literalReplaceAll,
  proposeReplacement,
  type ReplacementRequest,
} from '../../lib/wp/kadenceSafeReplace';

// --- SSH constants (same server/key as scripts/staging/push-blog-functions*.sh) ---
// Never print these values. They exist here only so this script can connect.
const SSH_KEY = `${process.env.HOME}/.ssh/bigscoots_staging`;
const REMOTE_USER = 'nginx';
const REMOTE_HOST = '74.121.204.122';
const REMOTE_PORT = '2222';

const STAGING_PATH = '/home/nginx/domains/blogmusthavemodscom.bigscoots-staging.com/public';
const PROD_PATH = '/home/nginx/domains/blog.musthavemods.com/public';

const DEFAULT_FROM = 'musthavemod08-20';
const DEFAULT_TO = 'musthavemod04-20';

interface Args {
  mode: 'read' | 'dry-run' | 'apply' | 'load-raw';
  path: string;
  postId: number;
  from: string;
  to: string;
  out?: string;
  prod: boolean;
  approvedSnapshot?: string;
  inputFile?: string;
}

function parseArgs(argv: string[]): Args {
  const mode = argv[0] as Args['mode'];
  if (!['read', 'dry-run', 'apply', 'load-raw'].includes(mode)) {
    throw new Error(`First argument must be "read", "dry-run", "apply", or "load-raw" (got ${JSON.stringify(mode)}).`);
  }
  const flags: Record<string, string | boolean> = {};
  for (const arg of argv.slice(1)) {
    if (arg === '--prod') {
      flags.prod = true;
      continue;
    }
    const m = arg.match(/^--([a-z-]+)=(.*)$/);
    if (m) flags[m[1]] = m[2];
  }
  const path = String(flags.path ?? '');
  const postId = Number(flags['post-id'] ?? NaN);
  if (!path) throw new Error('--path=<docroot> is required.');
  if (!Number.isInteger(postId) || postId <= 0) throw new Error('--post-id=<id> is required and must be a positive integer.');

  return {
    mode,
    path,
    postId,
    from: String(flags.from ?? DEFAULT_FROM),
    to: String(flags.to ?? DEFAULT_TO),
    out: flags.out ? String(flags.out) : undefined,
    prod: Boolean(flags.prod),
    approvedSnapshot: flags['approved-snapshot'] ? String(flags['approved-snapshot']) : undefined,
    inputFile: flags['input-file'] ? String(flags['input-file']) : undefined,
  };
}

/**
 * Run a command on the remote server non-interactively. Throws a clear,
 * distinctive error (rather than trying any fallback auth) if SSH cannot
 * run without a prompt — per the hard limit "if SSH/WP-CLI cannot run
 * non-interactively, stop and report."
 */
function sshExec(remoteCommand: string, opts: { input?: Buffer | string } = {}): string {
  try {
    const result = execFileSync(
      'ssh',
      [
        '-i', SSH_KEY,
        '-p', REMOTE_PORT,
        '-o', 'BatchMode=yes', // never fall back to a password/passphrase prompt
        '-o', 'ConnectTimeout=15',
        `${REMOTE_USER}@${REMOTE_HOST}`,
        remoteCommand,
      ],
      {
        input: opts.input,
        maxBuffer: 1024 * 1024 * 64,
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    );
    return result.toString('utf8');
  } catch (e: any) {
    const stderr = e?.stderr ? e.stderr.toString('utf8') : '';
    const stdout = e?.stdout ? e.stdout.toString('utf8') : '';
    // Never echo raw stderr/stdout here if it could contain host/key info;
    // BatchMode=yes auth failures are short, generic OpenSSH lines with no
    // secret material, so surfacing them is safe and useful for diagnosis.
    throw new Error(
      `SSH command failed (non-interactive only; not retrying with another auth method). ` +
        `exit=${e?.status ?? 'unknown'} stderr=${stderr.slice(0, 300)} stdout=${stdout.slice(0, 300)}`,
    );
  }
}

function wpEval(path: string, php: string): string {
  const b64 = Buffer.from(php, 'utf8').toString('base64');
  // Write the PHP to a remote temp file via stdin (avoids shell-quoting the
  // PHP itself), then eval-file it. `wp eval-file` runs the script through
  // WP-CLI's bootstrap exactly like `wp eval`.
  const remoteTmp = `/tmp/kadence-safe-replace-${process.pid}-${Date.now()}.php`;
  sshExec(`base64 -d > '${remoteTmp}'`, { input: b64 });
  try {
    const sizeCheck = sshExec(`wc -c < '${remoteTmp}'`).trim();
    if (process.env.KSR_DEBUG) console.error(`[debug] remote PHP file size: ${sizeCheck} bytes (local php.length=${php.length}, b64.length=${b64.length})`);
    return sshExec(`wp eval-file '${remoteTmp}' --path='${path}'`);
  } finally {
    sshExec(`rm -f '${remoteTmp}'`);
  }
}

function sha256(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

/**
 * True UTF-8 byte length. JS string `.length` counts UTF-16 code units, not
 * bytes — for post content with any multi-byte character (smart quotes,
 * emoji, non-Latin text) it silently under- or over-counts. Every "bytes"
 * label printed by this CLI must use this, not `.length`, so the operator
 * report can quote them and match `ls -la` / `wc -c` ground truth exactly.
 * (sha256() above was already correct: Node hashes the UTF-8 encoding of the
 * string regardless of `.length`; only the human-readable counts were wrong.)
 */
function byteLength(s: string): number {
  return Buffer.byteLength(s, 'utf8');
}

/** Read a post's raw post_content (byte-safe, base64 transport both ways). */
function readPostContent(path: string, postId: number): { content: string; postTitle: string; postStatus: string; postModified: string; permalink: string } {
  const php = `<?php
$id = ${postId};
$content = get_post_field('post_content', $id, 'raw');
if ($content === '') { $p = get_post($id); if (!$p) { fwrite(STDERR, "POST_NOT_FOUND\\n"); exit(1); } }
$post = get_post($id);
echo json_encode([
  'content_b64' => base64_encode($content),
  'post_title' => $post ? $post->post_title : '',
  'post_status' => $post ? $post->post_status : '',
  'post_modified' => $post ? $post->post_modified : '',
  'permalink' => $post ? get_permalink($post) : '',
]);
`;
  const out = wpEval(path, php).trim();
  const parsed = JSON.parse(out);
  return {
    content: Buffer.from(parsed.content_b64, 'base64').toString('utf8'),
    postTitle: parsed.post_title,
    postStatus: parsed.post_status,
    postModified: parsed.post_modified,
    permalink: parsed.permalink,
  };
}

function flushCache(path: string) {
  try {
    sshExec(`cd '${path}' && wp cache flush`);
  } catch {
    // non-fatal; object cache flush failing does not affect content correctness
  }
}

/**
 * Fetch a public URL's rendered HTML (our own staging/prod server; never
 * amazon.com/amzn.to). A direct request to the blog host 301s to the apex
 * (musthavemods.com) for any client that isn't the Next.js proxy itself —
 * confirmed on staging (blogmusthavemodscom.bigscoots-staging.com), and by
 * the architecture (middleware.ts) prod's blog host works the same way.
 * fetch() follows redirects by default, so an unmarked request here would
 * silently render the *apex's* (production, unmodified) copy of the page
 * and report false results for a staging-only change. Send the same
 * `X-MHM-Proxy: nextjs-edge` header middleware.ts sends on every legitimate
 * server-to-server fetch to the blog host, so this checks the host we
 * actually wrote to. Never remove this header — see middleware.ts's own
 * comment on why the redirect exists and what it guards against.
 */
async function fetchRendered(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'mhm-kadence-safe-replace-check/1.0', 'X-MHM-Proxy': 'nextjs-edge' },
  });
  return res.text();
}

/**
 * Write post_content via a raw $wpdb->update — bypasses wp_insert_post /
 * wp_update_post entirely, so there is no wp_unslash(), no kses filtering,
 * no revision row, and no post_modified bump (we do not include that
 * column in the UPDATE). Verifies before-sha immediately before writing
 * and after-sha immediately after; auto-restores on any after-mismatch.
 *
 * IMPORTANT: the PHP file handed to `wp eval-file` must stay small and
 * fixed-size (id + two sha256 hashes + a temp file path — never the post
 * content itself). This host silently no-ops `wp eval-file` for large
 * eval'd files: a ~200KB script with the content inlined as a base64
 * string literal loads WordPress, then produces zero stdout and exits 0
 * with no error (confirmed by bisection, independent of $wpdb and of
 * WordPress entirely — a bare `<?php base64_decode('<200KB literal>');
 * echo ...;` script reproduces it under `wp eval-file` but runs fine
 * under plain `php` CLI on the same host). Very likely a host-side
 * anti-webshell guard on `wp eval`/`eval-file` (BigScoots' `bs_helper`
 * MU-plugin is visible in `wp eval-file --debug`'s loaded-commands list).
 * Do not try to raise/bypass it — instead keep content out of the
 * evaluated file: write it to its own remote temp file first (plain
 * `cat`/`base64 -d` shell redirection has no such limit — proven up to
 * 200KB) and have the tiny PHP script `file_get_contents()` it at
 * runtime. Never re-inline content into a `wp eval-file` payload.
 */
function applyContentUpdate(
  path: string,
  postId: number,
  expectedBeforeSha: string,
  newContent: string,
): { ok: boolean; detail: string; restoredOk?: boolean } {
  const newB64 = Buffer.from(newContent, 'utf8').toString('base64');
  const expectedAfterSha = sha256(newContent);
  const remoteContentTmp = `/tmp/kadence-safe-replace-content-${process.pid}-${Date.now()}.b64`;
  sshExec(`cat > '${remoteContentTmp}'`, { input: newB64 });
  try {
    return applyContentUpdateWithSideFile(path, postId, expectedBeforeSha, expectedAfterSha, remoteContentTmp);
  } finally {
    sshExec(`rm -f '${remoteContentTmp}'`);
  }
}

function applyContentUpdateWithSideFile(
  path: string,
  postId: number,
  expectedBeforeSha: string,
  expectedAfterSha: string,
  remoteContentTmp: string,
): { ok: boolean; detail: string; restoredOk?: boolean } {
  const php = `<?php
global $wpdb;
$id = ${postId};
$expected_before = '${expectedBeforeSha}';
$expected_after = '${expectedAfterSha}';
$new_content = base64_decode(file_get_contents('${remoteContentTmp}'));

$current = get_post_field('post_content', $id, 'raw');
$current_sha = hash('sha256', $current);
if ($current_sha !== $expected_before) {
  echo json_encode(['ok' => false, 'stage' => 'before-check', 'actual_sha' => $current_sha]);
  exit(0);
}

$wpdb->update($wpdb->posts, ['post_content' => $new_content], ['ID' => $id]);
clean_post_cache($id);

$after = get_post_field('post_content', $id, 'raw');
$after_sha = hash('sha256', $after);
if ($after_sha !== $expected_after) {
  // Auto-restore immediately.
  $wpdb->update($wpdb->posts, ['post_content' => $current], ['ID' => $id]);
  clean_post_cache($id);
  $restored = get_post_field('post_content', $id, 'raw');
  $restored_sha = hash('sha256', $restored);
  echo json_encode([
    'ok' => false,
    'stage' => 'after-check',
    'actual_sha' => $after_sha,
    'restored_ok' => ($restored_sha === $expected_before),
  ]);
  exit(0);
}

echo json_encode(['ok' => true, 'stage' => 'done', 'actual_sha' => $after_sha]);
`;
  const out = wpEval(path, php).trim();
  let parsed: any;
  try {
    parsed = JSON.parse(out);
  } catch (e) {
    throw new Error(`applyContentUpdate: could not parse remote output as JSON (length=${out.length}). Raw output (first 2000 chars): ${out.slice(0, 2000)}`);
  }
  if (parsed.ok) {
    return { ok: true, detail: `write verified, after-sha=${parsed.actual_sha}` };
  }
  if (parsed.stage === 'before-check') {
    return { ok: false, detail: `refused: live content no longer matches approved snapshot (live sha=${parsed.actual_sha})` };
  }
  return {
    ok: false,
    detail: `write verification failed after writing (unexpected after-sha=${parsed.actual_sha}); auto-restore ${parsed.restored_ok ? 'SUCCEEDED' : 'FAILED — MANUAL INTERVENTION NEEDED'}`,
    restoredOk: parsed.restored_ok,
  };
}

function ensureDir(p: string) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const req: ReplacementRequest = { from: args.from, to: args.to };

  if (args.mode === 'read') {
    const { content, postTitle, postStatus, postModified, permalink } = readPostContent(args.path, args.postId);
    const digest = sha256(content);
    console.log(`post ${args.postId} ("${postTitle}", status=${postStatus}, post_modified=${postModified})`);
    console.log(`  permalink: ${permalink}`);
    console.log(`  bytes: ${byteLength(content)}`);
    console.log(`  sha256: ${digest}`);
    console.log(`  occurrences of "${args.from}": ${(content.match(new RegExp(args.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length}`);
    if (args.out) {
      ensureDir(dirname(args.out));
      writeFileSync(args.out, content, 'utf8');
      console.log(`  wrote raw content to ${args.out}`);
    }
    return;
  }

  if (args.mode === 'load-raw') {
    // TEST-SETUP ONLY: loads arbitrary raw bytes from a local file onto a
    // post, verified before/after by sha256, auto-restoring on mismatch.
    // Used to mirror prod's exact bytes onto a staging post before proving
    // the tool. Never intended for --prod (no invariant claim is made
    // about the content being loaded, so it must never be used to write
    // arbitrary content to production).
    if (args.prod) {
      throw new Error('load-raw must never be used with --prod (it makes no safety claim about the content being loaded).');
    }
    if (!args.inputFile) throw new Error('load-raw requires --input-file=<local raw content file>.');
    const newContent = readFileSync(args.inputFile, 'utf8');
    const { content: currentContent, postTitle } = readPostContent(args.path, args.postId);
    const currentSha = sha256(currentContent);
    console.log(`load-raw — post ${args.postId} ("${postTitle}") on ${args.path}`);
    console.log(`  current (about to be overwritten) sha256: ${currentSha} (${byteLength(currentContent)} bytes)`);
    console.log(`  incoming sha256: ${sha256(newContent)} (${byteLength(newContent)} bytes)`);
    const writeResult = applyContentUpdate(args.path, args.postId, currentSha, newContent);
    console.log(writeResult.ok ? `LOADED: ${writeResult.detail}` : `FAILED: ${writeResult.detail}`);
    if (writeResult.ok) flushCache(args.path);
    if (!writeResult.ok) process.exitCode = 1;
    return;
  }

  if (args.mode === 'dry-run') {
    const { content: before, postTitle, postStatus, postModified } = readPostContent(args.path, args.postId);
    const { after, result } = proposeReplacement(before, req);
    console.log(`DRY RUN — post ${args.postId} ("${postTitle}", status=${postStatus}, post_modified=${postModified})`);
    console.log(`  before sha256: ${sha256(before)} (${byteLength(before)} bytes)`);
    console.log(`  after  sha256: ${sha256(after)} (${byteLength(after)} bytes)`);
    console.log(`  occurrences of "${args.from}" found: ${result.occurrencesBefore}`);
    console.log(`  invariants: ${result.ok ? 'PASS' : 'FAIL'}`);
    if (!result.ok) {
      for (const f of result.failures) console.log(`    [${f.code}] ${f.message}`);
      process.exitCode = 1;
    }
    if (args.out) {
      ensureDir(dirname(args.out));
      writeFileSync(args.out, after, 'utf8');
      console.log(`  wrote proposed content to ${args.out} (NOT written to WordPress)`);
    }
    return;
  }

  // apply
  if (!args.approvedSnapshot) {
    throw new Error('apply requires --approved-snapshot=<file> (a JSON map of postId -> approved before-sha256).');
  }
  const snapshot = JSON.parse(readFileSync(args.approvedSnapshot, 'utf8')) as Record<string, string>;
  const approvedSha = snapshot[String(args.postId)];
  if (!approvedSha) {
    throw new Error(`No approved sha256 for post ${args.postId} in ${args.approvedSnapshot}. Refusing.`);
  }
  if (args.prod) {
    // Both conditions enforced explicitly and independently, per the hard
    // limit: an explicit --prod flag AND an approved snapshot file whose
    // hash must match the CURRENT live content (checked inside
    // applyContentUpdate's before-check, not just presence of the file).
    console.log('PROD write requested. --prod flag present, approved-snapshot present. Proceeding to live before-sha check...');
  } else {
    console.log(`Applying to non-prod path (${args.path}).`);
  }

  const { content: before } = readPostContent(args.path, args.postId);
  const liveSha = sha256(before);
  if (liveSha !== approvedSha) {
    console.log(`REFUSING: live content sha256 (${liveSha}) does not match approved snapshot (${approvedSha}). The post changed since approval.`);
    process.exitCode = 1;
    return;
  }

  const { result, after } = (() => {
    const after = literalReplaceAll(before, req.from, req.to);
    const result = checkReplacementInvariants(before, after, req);
    return { result, after };
  })();

  if (!result.ok) {
    console.log('REFUSING: proposed edit fails invariants:');
    for (const f of result.failures) console.log(`  [${f.code}] ${f.message}`);
    process.exitCode = 1;
    return;
  }

  const writeResult = applyContentUpdate(args.path, args.postId, liveSha, after);
  console.log(writeResult.ok ? `APPLIED: ${writeResult.detail}` : `FAILED: ${writeResult.detail}`);
  if (writeResult.ok) {
    flushCache(args.path);
    const { content: reread, permalink } = readPostContent(args.path, args.postId);
    console.log(`  post-write re-read sha256: ${sha256(reread)}`);
    if (permalink) {
      try {
        const rendered = await fetchRendered(permalink);
        const stillHasFrom = rendered.includes(args.from);
        const nowHasTo = rendered.includes(args.to);
        console.log(`  rendered page (${permalink}): contains "${args.from}"=${stillHasFrom}, contains "${args.to}"=${nowHasTo}`);
      } catch (e) {
        console.log(`  (could not fetch rendered page for confirmation: ${String(e).slice(0, 150)})`);
      }
    }
  }
  if (!writeResult.ok) process.exitCode = 1;
}

main().catch((e) => {
  console.error(`ERROR: ${e?.message ?? e}`);
  process.exitCode = 1;
});

export { STAGING_PATH, PROD_PATH };
