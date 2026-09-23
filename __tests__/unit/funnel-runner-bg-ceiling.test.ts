import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Source-level guard for scripts/agents/run-funnel-daily.sh (E91, incident 2026-09-22-0655).
 *
 * `claude -p` terminates background tasks 600 s after the main turn ends
 * ("Background tasks still running after 600s; terminating. Set CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=0
 * to wait indefinitely."). Quinn's turn ends once the seven specialists are dispatched via the Agent
 * tool, so every agent that needs more than 10 minutes — build + type-check + PR + merge-gate + a
 * 6–10 min deploy-verify — was killed mid-flight on 09-18, 09-19 and 09-22; on 09-22 an orphaned
 * deploy-verify then rolled production back from a deleted worktree. The runner must export the
 * ceiling (0 = indefinite, or at least one hour) BEFORE the Quinn invocation, and must not strip it
 * again in the env -u list. Comments are stripped before asserting, so documenting the variable in
 * a comment can never satisfy this test.
 */
const RUNNER = 'scripts/agents/run-funnel-daily.sh';
const KNOB = 'CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS';
const MIN_CEILING_MS = 3_600_000;

const raw = readFileSync(join(process.cwd(), RUNNER), 'utf8');
const code = raw
  .split('\n')
  .filter((l) => !/^\s*#/.test(l))
  .join('\n');

describe('run-funnel-daily.sh keeps claude -p from killing the agents at the 600 s background ceiling', () => {
  it(`exports ${KNOB} in code (not just in a comment)`, () => {
    expect(code).toMatch(new RegExp(`^\\s*export ${KNOB}=`, 'm'));
  });

  it('sets the ceiling to 0 (indefinite) or at least one hour, with a bare-number default', () => {
    const m = code.match(new RegExp(`^\\s*export ${KNOB}="?\\$\\{[A-Z_]+:-(\\d+)\\}"?`, 'm'));
    expect(m, `expected export ${KNOB}="\${SOME_VAR:-<ms>}"`).not.toBeNull();
    const ms = Number(m![1]);
    expect(ms === 0 || ms >= MIN_CEILING_MS, `${ms} ms is below ${MIN_CEILING_MS} and not 0`).toBe(true);
  });

  it('exports it before the Quinn invocation and never unsets it in the CLAUDE_CLEAN env -u list', () => {
    const exportAt = code.search(new RegExp(`^\\s*export ${KNOB}=`, 'm'));
    const quinnAt = code.indexOf('--max-turns "$MAX_TURNS"');
    expect(quinnAt).toBeGreaterThan(0);
    expect(exportAt).toBeGreaterThan(-1);
    expect(exportAt).toBeLessThan(quinnAt);
    expect(code).not.toMatch(new RegExp(`-u ${KNOB}\\b`));
  });
});
