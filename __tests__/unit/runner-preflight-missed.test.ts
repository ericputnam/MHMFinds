import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Behavioural guard for run-funnel-daily.sh's `# >>> preflight-missed` block (E264, 2026-10-23).
 *
 * On 2026-10-22 the Quinn preflight failed in 2 s ("Failed to authenticate: OAuth session expired and could not be
 * refreshed"). The runner wrote a DEGRADED digest, the scoreboard and the guardrail into the operator checkout and
 * exited 4: nothing reached main, no ledger row existed, `token-expiry=unknown`, and the next scoreboard read
 * "MISSED 2026-10-22: preflight failed · no digest on main". The keychain carried a refreshTokenExpiresAt the whole
 * time that nobody read.
 *
 * This test extracts the REAL block and runs it under /bin/bash (3.2, the scheduled task's shell) with a stub
 * `security` on PATH (prints a keychain-shaped JSON with ONLY expiry fields) and stub ledger-commit.sh /
 * digest-land.sh under $WT/scripts/agents that record their argv. Red on the pre-fix tree: the block does not exist,
 * so `block` is '' and every case fails on "command not found" (the wiring case fails on the missing call sites).
 */
const RUNNER = process.env.RUNNER_UNDER_TEST ?? 'scripts/agents/run-funnel-daily.sh';
const BASH = '/bin/bash';
const DAY = '2026-10-22';
const raw = readFileSync(RUNNER.startsWith('/') ? RUNNER : join(process.cwd(), RUNNER), 'utf8');
const block = raw.match(/^# >>> preflight-missed\n[\s\S]*?^# <<< preflight-missed\n/m)?.[0] ?? '';

let base: string;
let bin: string;
let wt: string;
let projectDir: string;

function writeExec(path: string, body: string): string {
  writeFileSync(path, body);
  chmodSync(path, 0o755);
  return path;
}

/** Stub `security` printing a credentials JSON whose refresh token expires `refreshDays` from now (or no field at all). */
function fakeSecurity(opts: { refreshDays?: number; broken?: boolean; absent?: boolean }): void {
  if (opts.absent) {
    writeExec(join(bin, 'security'), '#!/bin/bash\nexit 44\n');
    return;
  }
  if (opts.broken) {
    writeExec(join(bin, 'security'), '#!/bin/bash\necho "not json"\n');
    return;
  }
  const now = Date.now();
  const o: Record<string, unknown> = { expiresAt: now + 8 * 3600_000, scopes: ['x'], subscriptionType: 'max' };
  if (opts.refreshDays !== undefined) o.refreshTokenExpiresAt = now + opts.refreshDays * 86_400_000 + 3600_000;
  writeExec(join(bin, 'security'), `#!/bin/bash\ncat <<'J'\n${JSON.stringify({ claudeAiOauth: o })}\nJ\n`);
}

function stubLanders(opts: { ledgerRc?: number; digestRc?: number; noLedger?: boolean } = {}): void {
  const agents = join(wt, 'scripts/agents');
  mkdirSync(agents, { recursive: true });
  if (!opts.noLedger) {
    writeExec(
      join(agents, 'ledger-commit.sh'),
      `#!/bin/bash\nprintf '%s\\x1f' "$@" >>"${join(base, 'lc-args')}"; echo >>"${join(base, 'lc-args')}"\necho "ledger-commit: stub"\nexit ${opts.ledgerRc ?? 0}\n`,
    );
  }
  writeExec(
    join(agents, 'digest-land.sh'),
    `#!/bin/bash\nprintf '%s\\x1f' "$@" >>"${join(base, 'dl-args')}"; echo >>"${join(base, 'dl-args')}"\necho "digest-land: stub"\nexit ${opts.digestRc ?? 0}\n`,
  );
}

function argsOf(file: string): string[][] {
  const p = join(base, file);
  if (!existsSync(p)) return [];
  return readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => l.split('\x1f').filter((x) => x !== ''));
}

function run(driver: string, env: Record<string, string> = {}): { out: string; rc: number | null } {
  const script = [
    'log() { echo "LOG $*"; }',
    `PROJECT_DIR="${projectDir}"`,
    `WT="${wt}"`,
    block,
    driver,
  ].join('\n');
  const r = spawnSync(BASH, ['-uo', 'pipefail', '-c', script], {
    cwd: tmpdir(),
    encoding: 'utf8',
    env: { PATH: `${bin}:/usr/bin:/bin:/usr/sbin:/sbin`, HOME: base, ...env } as unknown as NodeJS.ProcessEnv,
    timeout: 30_000,
  });
  return { out: `${r.stdout}${r.stderr}`, rc: r.status };
}

beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), 'preflight-missed-'));
  bin = join(base, 'bin');
  wt = join(base, 'wt');
  projectDir = join(base, 'project');
  mkdirSync(bin);
  mkdirSync(join(projectDir, 'reports/funnel'), { recursive: true });
  mkdirSync(join(projectDir, 'scripts/agents'), { recursive: true });
});

afterEach(() => {
  rmSync(base, { recursive: true, force: true });
});

describe('run-funnel-daily.sh preflight-missed block (E264)', () => {
  it('the block exists in the runner and is wired: auth line before the preflight, land call in the failure branch, warning appended to the digest', () => {
    expect(block.length).toBeGreaterThan(500);
    expect(raw).toMatch(/AUTH_LINE="\$\(auth_expiry\)"; log "auth: \$AUTH_LINE/);
    expect(raw).toMatch(/AUTH_WARN="\$\(auth_warn_line "\$AUTH_LINE"\)"/);
    expect(raw).toMatch(/preflight_missed_land "\$TODAY" "\$MISSED_HHMM" "\$DIAG_KIND" "\$CLI_VER" "\$AUTH_LINE" "\$DIAG_EXCERPT"/);
    // the landing happens BEFORE the degraded branch exits, and the degraded digest exists by then
    const land = raw.indexOf('preflight_missed_land "$TODAY"');
    const degradedWrite = raw.indexOf('Wrote degraded digest:');
    const exit4 = raw.indexOf('exit 4', land);
    expect(degradedWrite).toBeGreaterThan(0);
    expect(land).toBeGreaterThan(degradedWrite);
    expect(exit4).toBeGreaterThan(land);
    // the warning rides the operator-facing digest after the fallback step, idempotently
    expect(raw).toMatch(/grep -qF 'Claude CLI auth:' "\$PROJECT_DIR\/reports\/funnel\/digest-\$TODAY\.md"/);
  });

  it('auth_expiry reads expiry DATES (never the token) and auth_warn_line is silent with 27 days left', () => {
    fakeSecurity({ refreshDays: 27 });
    const r = run('A="$(auth_expiry)"; echo "AUTH $A"; W="$(auth_warn_line "$A")"; echo "WARN[$W]"');
    expect(r.rc).toBe(0);
    expect(r.out).toMatch(/AUTH access=\d{4}-\d{2}-\d{2} \d{2}:\d{2} refresh=\d{4}-\d{2}-\d{2} \d{2}:\d{2} refresh_days=27/);
    expect(r.out).toMatch(/WARN\[\]/);
    expect(r.out).not.toMatch(/accessToken|refreshToken"/);
  });

  it('auth_warn_line warns at ≤ FUNNEL_AUTH_WARN_DAYS (default 5) with the date and the login command', () => {
    fakeSecurity({ refreshDays: 3 });
    const r = run('A="$(auth_expiry)"; auth_warn_line "$A"');
    expect(r.out).toMatch(/⚠️ Claude CLI auth: refresh token expires \d{4}-\d{2}-\d{2} \d{2}:\d{2} \(3 d left\) — run `claude auth login`/);
    // threshold is a parameter, not a literal: 3 days is fine when the operator asks for 2
    const r2 = run('A="$(auth_expiry)"; W="$(auth_warn_line "$A")"; echo "WARN[$W]"', { FUNNEL_AUTH_WARN_DAYS: '2' });
    expect(r2.out).toMatch(/WARN\[\]/);
  });

  it('an unreadable keychain or a credentials blob without refreshTokenExpiresAt is "unknown" and still warns (never a crash)', () => {
    fakeSecurity({ absent: true });
    const r1 = run('A="$(auth_expiry)"; echo "AUTH $A"; auth_warn_line "$A"');
    expect(r1.rc).toBe(0);
    expect(r1.out).toMatch(/AUTH access=unknown refresh=unknown refresh_days=unknown/);
    expect(r1.out).toMatch(/refresh-token expiry unknown .* `claude auth status`/);
    fakeSecurity({ broken: true });
    const r2 = run('A="$(auth_expiry)"; echo "AUTH $A"');
    expect(r2.out).toMatch(/AUTH access=unknown refresh=unknown refresh_days=unknown/);
    fakeSecurity({});
    const r3 = run('A="$(auth_expiry)"; echo "AUTH $A"');
    expect(r3.out).toMatch(/AUTH access=\d{4}-\d{2}-\d{2} \d{2}:\d{2} refresh=unknown refresh_days=unknown/);
  });

  it('preflight_missed_land writes ONE MISSED ledger row via ledger-commit.sh and lands the degraded digest + existing artifacts via digest-land.sh --allow-degraded', () => {
    fakeSecurity({ refreshDays: 27 });
    stubLanders();
    const rf = join(projectDir, 'reports/funnel');
    writeFileSync(join(rf, `digest-${DAY}.md`), `# Funnel digest — ${DAY} (DEGRADED: Quinn did not run)\n`);
    writeFileSync(join(rf, `${DAY}.md`), '# scoreboard\n');
    writeFileSync(join(rf, `guardrail-${DAY}.md`), '# guardrail\n');
    writeFileSync(join(rf, `guardrail-${DAY}.json`), '{}\n');
    // no 2026-10-22.json on purpose: digest-land skips missing extras itself; the runner still names it
    const r = run(
      `preflight_missed_land "${DAY}" "06:38" "AUTH" "2.1.280 (Claude Code)" "access=2026-10-21 14:38 refresh=unknown refresh_days=unknown" "Failed to authenticate: OAuth session expired and could not be refreshed"; echo "RC=$?"`,
    );
    expect(r.out).toMatch(/RC=0/);
    const lc = argsOf('lc-args');
    expect(lc).toHaveLength(1);
    const rowIdx = lc[0].indexOf('--row');
    const row = lc[0][rowIdx + 1];
    expect(row).toMatch(/^\| 2026-10-22 06:38 \| check \| mhm-funnel-daily: MISSED 2026-10-22 — Quinn did not run \(preflight=AUTH, cli=2\.1\.280 \(Claude Code\)\) \|  \|  \| MISSED \| /);
    expect(row).toMatch(/OAuth session expired and could not be refreshed · access=2026-10-21 14:38 refresh=unknown refresh_days=unknown · degraded digest \+ scoreboard \+ guardrail landed on main by the runner \(E264\) \|$/);
    expect(row.split('|')).toHaveLength(9); // 7 cells + leading/trailing — the notes cell carries no stray pipe
    expect(lc[0]).toContain('--label');
    expect(lc[0][lc[0].indexOf('--label') + 1]).toBe('MISSED 2026-10-22 preflight=AUTH');
    const dl = argsOf('dl-args');
    expect(dl).toHaveLength(1);
    expect(dl[0]).toContain('--allow-degraded');
    expect(dl[0][dl[0].indexOf('--date') + 1]).toBe(DAY);
    expect(dl[0][dl[0].indexOf('--file') + 1]).toBe(join(rf, `digest-${DAY}.md`));
    const extras = dl[0].filter((_, i) => dl[0][i - 1] === '--extra');
    expect(extras).toEqual([join(rf, `${DAY}.md`), join(rf, `${DAY}.json`), join(rf, `guardrail-${DAY}.md`), join(rf, `guardrail-${DAY}.json`)]);
    expect(r.out).toMatch(/LOG preflight-missed: ledger-commit: stub/);
    expect(r.out).toMatch(/LOG preflight-missed: digest-land: stub/);
  });

  it('a lander that cannot land (exit 2) or is missing is a log line and rc 2 — never fatal, never silent', () => {
    fakeSecurity({ refreshDays: 27 });
    stubLanders({ ledgerRc: 2, digestRc: 2 });
    writeFileSync(join(projectDir, `reports/funnel/digest-${DAY}.md`), `# Funnel digest — ${DAY} (DEGRADED: Quinn did not run)\n`);
    const r = run(`preflight_missed_land "${DAY}" "06:38" "AUTH" "2.1.280" "access=x refresh=y refresh_days=z" ""; echo "RC=$?"`);
    expect(r.out).toMatch(/RC=2/);
    expect(argsOf('lc-args')).toHaveLength(1);
    expect(argsOf('dl-args')).toHaveLength(1);
    // no ledger-commit.sh anywhere and no degraded digest: the row text itself is logged so nothing is lost
    rmSync(base + '/lc-args', { force: true }); rmSync(base + '/dl-args', { force: true });
    rmSync(join(wt, 'scripts/agents/ledger-commit.sh'));
    rmSync(join(projectDir, `reports/funnel/digest-${DAY}.md`));
    const r2 = run(`preflight_missed_land "${DAY}" "06:38" "OTHER" "2.1.280" "access=x refresh=y refresh_days=z" ""; echo "RC=$?"`);
    expect(r2.out).toMatch(/RC=2/);
    expect(r2.out).toMatch(/LOG preflight-missed: ledger-commit\.sh not found — MISSED row NOT landed: \| 2026-10-22 06:38 \| check \| mhm-funnel-daily: MISSED 2026-10-22 — Quinn did not run \(preflight=OTHER/);
    expect(r2.out).toMatch(/LOG preflight-missed: digest-land\.sh or reports\/funnel\/digest-2026-10-22\.md missing/);
    expect(argsOf('lc-args')).toHaveLength(0);
    expect(argsOf('dl-args')).toHaveLength(0);
  });
});
