/**
 * The functions.php push scripts overwrite a live WordPress file over scp. Two ways they
 * could leave it broken or wipe a feature, both red against the pre-fix scripts:
 *   1. staging: a failed pull was swallowed (`|| true`), so the wipe check compared
 *      against an empty file and passed;
 *   2. both: when the uploaded file failed `php -l` on the server, `set -e` exited and
 *      left the broken file live instead of restoring the backup just taken.
 * ssh / scp / php are stubbed on PATH — nothing here touches a network.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'child_process';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const ROOT = join(__dirname, '..', '..');
const PROD = join(ROOT, 'scripts/staging/push-blog-functions-prod.sh');
const STAGING = join(ROOT, 'scripts/staging/push-blog-functions.sh');
const PROD_PHP = join(ROOT, 'staging/wordpress/kadence-child-prod/functions.php');
const STAGING_PHP = join(ROOT, 'staging/wordpress/kadence-child/functions.php');

let dir: string;
let log: string;

function stub(name: string, body: string) {
  const p = join(dir, name);
  writeFileSync(p, `#!/bin/bash\n${body}\n`);
  chmodSync(p, 0o755);
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'push-failsafe-'));
  log = join(dir, 'calls.log');
  writeFileSync(log, '');
  // php: local lint always passes (the real files are linted elsewhere).
  stub('php', 'exit 0');
  // scp: last arg is the destination. user@host:... = upload; a local path = pull.
  stub(
    'scp',
    `dest="\${@: -1}"
if [[ "$dest" == *@* ]]; then echo "UPLOAD" >>"$CALLS"; exit 0; fi
echo "PULL" >>"$CALLS"
[ "\${FAIL_PULL:-0}" = "1" ] && exit 1
cp "$REMOTE_FIXTURE" "$dest"`,
  );
  // ssh: last arg is the remote command.
  stub(
    'ssh',
    `cmd="\${@: -1}"
echo "SSH $cmd" >>"$CALLS"
if [[ "$cmd" == php\\ -l* ]] && [ "\${FAIL_LINT:-0}" = "1" ]; then exit 1; fi
exit 0`,
  );
});

afterEach(() => rmSync(dir, { recursive: true, force: true }));

/** A "server" copy that differs from local by one trailing line, so there is something to push. */
function remoteFixture(localPhp: string): string {
  const p = join(dir, 'remote-functions.php');
  writeFileSync(p, readFileSync(localPhp, 'utf8') + '\n// server-only trailing line\n');
  return p;
}

function run(script: string, args: string[], env: Record<string, string>, input = '') {
  const r = spawnSync('bash', [script, ...args], {
    encoding: 'utf8',
    input,
    env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, CALLS: log, ...env },
    timeout: 30_000,
  });
  return { rc: r.status, out: `${r.stdout}${r.stderr}`, calls: readFileSync(log, 'utf8').trim().split('\n') };
}

describe('push-blog-functions-prod.sh', () => {
  it('a failed remote lint restores the backup and exits non-zero', () => {
    const r = run(PROD, ['--yes'], { REMOTE_FIXTURE: remoteFixture(PROD_PHP), FAIL_LINT: '1' });
    expect(r.rc).toBe(5);
    const backup = r.calls.find((c) => /^SSH cp '.*functions\.php' '.*\.bak\.\d+'$/.test(c));
    expect(backup, r.out).toBeTruthy();
    const backupName = backup!.match(/'([^']*\.bak\.\d+)'$/)![1];
    const lintAt = r.calls.findIndex((c) => c.startsWith('SSH php -l'));
    const restoreAt = r.calls.findIndex((c) => c.startsWith(`SSH cp '${backupName}' '`));
    expect(lintAt).toBeGreaterThan(r.calls.indexOf('UPLOAD'));
    expect(restoreAt, r.out).toBeGreaterThan(lintAt);
    expect(r.out).toContain('Production is back on the previous file');
    expect(r.calls.some((c) => c.includes('wp cache flush'))).toBe(false);
  });

  it('a clean push still uploads, lints and flushes, with no restore', () => {
    const r = run(PROD, ['--yes'], { REMOTE_FIXTURE: remoteFixture(PROD_PHP) });
    expect(r.rc, r.out).toBe(0);
    expect(r.calls).toContain('UPLOAD');
    expect(r.calls.some((c) => c.includes('wp cache flush'))).toBe(true);
    expect(r.calls.filter((c) => /^SSH cp '.*\.bak\.\d+' '/.test(c))).toEqual([]);
  });

  it('an empty pull aborts before anything is uploaded', () => {
    const empty = join(dir, 'empty.php');
    writeFileSync(empty, '');
    const r = run(PROD, ['--yes'], { REMOTE_FIXTURE: empty });
    expect(r.rc).toBe(4);
    expect(r.calls).not.toContain('UPLOAD');
  });
});

describe('push-blog-functions.sh (staging)', () => {
  it('a failed pull stops the push instead of passing the wipe check on an empty file', () => {
    const r = run(STAGING, [], { REMOTE_FIXTURE: remoteFixture(STAGING_PHP), FAIL_PULL: '1' }, 'y\ny\n');
    expect(r.rc).toBe(4);
    expect(r.calls).toContain('PULL');
    expect(r.calls).not.toContain('UPLOAD');
    expect(r.out).toContain('Could not pull');
  });

  it('a failed remote lint restores the backup', () => {
    const r = run(STAGING, [], { REMOTE_FIXTURE: remoteFixture(STAGING_PHP), FAIL_LINT: '1' }, 'y\ny\n');
    expect(r.rc, r.out).toBe(5);
    const lintAt = r.calls.findIndex((c) => c.startsWith('SSH php -l'));
    const restoreAt = r.calls.findIndex((c, i) => i > lintAt && /^SSH cp '.*\.bak\.\d+' '.*functions\.php'$/.test(c));
    expect(restoreAt, r.out).toBeGreaterThan(lintAt);
  });

  it('vacuity guard: the fixtures and scripts exist', () => {
    for (const p of [PROD, STAGING, PROD_PHP, STAGING_PHP]) expect(existsSync(p), p).toBe(true);
  });
});
