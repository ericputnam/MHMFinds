import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Source-level guard for scripts/agents/deploy-verify.sh.
 *
 * A `vercel rollback` silently pauses auto-promotion: later merges build READY but production keeps serving
 * the rollback target. On 2026-09-07/08 three builds (PRs #56, #57, nightly compound) sat un-promoted for 22 h
 * while the ledger said "verified live". After-merge verification must promote the new build explicitly and
 * must not record PASS for a build that is not serving. Same pattern as sidebar-sticky-health: test the
 * structure of the script, not its runtime.
 */
const src = readFileSync(join(process.cwd(), 'scripts/agents/deploy-verify.sh'), 'utf8');

describe('deploy-verify.sh promotes the merged build before verifying it', () => {
  it('defines ensure_promoted and calls vercel promote on the READY deployment', () => {
    expect(src).toMatch(/^ensure_promoted\(\)/m);
    expect(src).toMatch(/vercel promote "\$1" --yes/);
  });

  it('after-merge mode gates the smoke check on ensure_promoted and records NOT PROMOTED on failure', () => {
    const afterMerge = src.slice(src.indexOf('  after-merge)'), src.indexOf('  check)'));
    expect(afterMerge).toMatch(/if ! ensure_promoted "\$DEPLOY_URL"; then/);
    expect(afterMerge).toMatch(/ledger "NOT PROMOTED"/);
    expect(afterMerge.indexOf('ensure_promoted')).toBeLessThan(afterMerge.indexOf('if smoke; then'));
  });

  it('no longer verifies "what is live" as a substitute for verifying the merge', () => {
    expect(src).not.toMatch(/verifying what is live/);
  });
});
