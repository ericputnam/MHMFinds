import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Source-level guard (E91, incident 2026-09-22-0655.md): "Could not run ≠ is broken".
 *
 * On 09-22 `check-blog-sidebar.sh --quiet` exited non-zero with EMPTY output twice (a failed curl under
 * `set -e` kills the script before any `[FAIL]` line prints) and deploy-verify graded it
 * "check-blog-sidebar: " → ROLLED BACK, STILL FAILING, while the Chromium pass in the same minute saw
 * the sidebar markers. An empty result must become INCONCLUSIVE (deploy-verify's existing could-not-run
 * state: logged, in the ledger row, exit 0, never a rollback trigger), and the check itself must say
 * why it could not run and exit 2, never die silently. Comments are stripped before asserting.
 */
const strip = (s: string) => s.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
const verify = strip(readFileSync(join(process.cwd(), 'scripts/agents/deploy-verify.sh'), 'utf8'));
const blog = strip(readFileSync(join(process.cwd(), 'scripts/agents/check-blog-sidebar.sh'), 'utf8'));

describe('deploy-verify.sh: an empty check-blog-sidebar result is INCONCLUSIVE, not FAIL', () => {
  const block = verify.slice(verify.indexOf('check: WordPress critical markers'), verify.indexOf('local n5'));

  it('only calls addfail "check-blog-sidebar:" when the script printed a FAIL line', () => {
    expect(block).toMatch(/blog_fails="\$\(.*grep FAIL/);
    expect(block).toMatch(/if \[ -n "\$blog_fails" \]; then addfail "check-blog-sidebar: \$blog_fails"/);
  });

  it('routes the empty case to INCONCLUSIVE (the could-not-run state) instead of a failure', () => {
    expect(block).toMatch(/else INCONCLUSIVE=.*check-blog-sidebar could not run/);
    expect(block).not.toMatch(/addfail "check-blog-sidebar: \$\(/);
  });
});

describe('check-blog-sidebar.sh: a curl failure is a loud could-not-run (exit 2), not a silent death', () => {
  it('guards the curl assignment so set -e cannot kill the script silently', () => {
    expect(blog).toMatch(/HTTP_CODE=\$\(curl[\s\S]*?\) \|\| HTTP_CODE="000"/);
  });

  it('prints a WARN line (not FAIL) and exits 2 when a page could not be fetched', () => {
    expect(blog).toMatch(/COULD_NOT_RUN=1/);
    expect(blog).toMatch(/\[WARN\] could not fetch/);
    expect(blog).toMatch(/\[ "\$COULD_NOT_RUN" -ne 0 \] && exit 2/);
    expect(blog).toMatch(/--max-time \d+/);
  });
});
