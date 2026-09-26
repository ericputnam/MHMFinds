import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  CONTROL_SLOW_MS, DEFAULT_SETTLED_TEXT, NETWORK_CONTROL_URLS, SLOW_LOAD_MS,
  classifyRender, gradeNetwork, isUnsettled, navigationFailed, type RenderFacts,
} from '../../scripts/agents/smoke-render-lib';

/**
 * E111 (incident 2026-09-26-064626.md): deploy-verify rolled production back at 06:58 on four `page.goto`
 * timeouts and an unsettled homepage, taken while the host's own network was failing (Vercel CLI ETIMEDOUT,
 * Prisma unreachable, Pinterest API down). Second false-alarm rollback in five days (09-22 was the first).
 * Rule: grade on positive evidence; "could not run ≠ is broken". The cases below are the exact readings.
 */
const NAV = ['navigation: page.goto: Timeout 45000ms exceeded. Call log: - navigating to "https://musthavemods.com/go/x"', 'evaluate: Execution context was destroyed'];
const go0705: RenderFacts = { kind: 'interstitial', status: null, ms: 258976, textLength: 0, appError: false, pageErrors: NAV,
  failures: ['HTTP no response (navigation: page.goto: Timeout 45000ms exceeded.)', 'Mediavine loader (scripts.mediavine.com) missing', 'aside#secondary (Mediavine sidebar anchor) missing', '.mv-ads in-content anchors missing', 'page text only 0 chars (blank render?)'] };
const home0647: RenderFacts = { kind: 'catalog', status: 200, ms: 27779, textLength: 1788, appError: false, pageErrors: [], failures: ['.mv-ads in-content anchors missing'], settledText: 6000 };
const fast = (url: string) => ({ url, status: 200, ms: 300 });

describe('gradeNetwork (independent control)', () => {
  it('names at least three known-fast hosts none of which is ours', () => {
    expect(NETWORK_CONTROL_URLS.length).toBeGreaterThanOrEqual(3);
    for (const u of NETWORK_CONTROL_URLS) expect(new URL(u).host).not.toMatch(/musthavemods/);
  });
  it('ok when ≥2 hosts answer fast; degraded on timeouts, on slowness, and on no samples (vacuity)', () => {
    expect(gradeNetwork(NETWORK_CONTROL_URLS.map(fast)).ok).toBe(true);
    expect(gradeNetwork([fast('https://a/'), fast('https://b/'), { url: 'https://c/', status: null, ms: 8000 }]).ok).toBe(true);
    expect(gradeNetwork([fast('https://a/'), { url: 'https://b/', status: null, ms: 8000 }, { url: 'https://c/', status: null, ms: 8000 }]).ok).toBe(false);
    expect(gradeNetwork([fast('https://a/'), { url: 'https://b/', status: 200, ms: CONTROL_SLOW_MS + 1 }, { url: 'https://c/', status: 200, ms: CONTROL_SLOW_MS + 1 }]).ok).toBe(false);
    expect(gradeNetwork([]).ok).toBe(false);
    expect(gradeNetwork([fast('https://a/')]).ok).toBe(false);
  });
});

describe('classifyRender: positive evidence fails, could-not-run is inconclusive', () => {
  it('09-26 07:05 /go/: navigation timeout under a degraded control → inconclusive', () => {
    expect(navigationFailed(go0705)).toBe(true);
    expect(classifyRender(go0705, { networkOk: false }).verdict).toBe('inconclusive');
  });
  it('09-26 06:47 homepage: 200 in 27.8 s with 1,788 chars and no .mv-ads → unsettled → inconclusive, with or without the control', () => {
    expect(home0647.ms).toBeGreaterThanOrEqual(SLOW_LOAD_MS);
    expect(isUnsettled(home0647)).toBe(true);
    expect(classifyRender(home0647, { networkOk: true }).verdict).toBe('inconclusive');
    expect(classifyRender(home0647, { networkOk: false }).verdict).toBe('inconclusive');
  });
  it('the same homepage reading fully rendered (10,344 chars) with no .mv-ads → fail: the anchors really are gone', () => {
    const settled = { ...home0647, textLength: 10344, ms: 9000 };
    expect(isUnsettled(settled)).toBe(false);
    expect(classifyRender(settled, { networkOk: false }).verdict).toBe('fail');
  });
  it('a fast blank 200 is not "unsettled" — it answered quickly with nothing → fail', () => {
    const blank = { ...home0647, ms: 3000, textLength: 120, failures: ['.mv-ads in-content anchors missing', 'page text only 120 chars (blank render?)'] };
    expect(classifyRender(blank, { networkOk: true }).verdict).toBe('fail');
  });
  it('a target without its own settled floor cannot be unsettled (default floor = blank threshold)', () => {
    const go = { ...home0647, kind: 'interstitial' as const, settledText: undefined, textLength: DEFAULT_SETTLED_TEXT + 10, failures: ['.mv-ads in-content anchors missing'] };
    expect(isUnsettled(go)).toBe(false);
    expect(classifyRender(go, { networkOk: true }).verdict).toBe('fail');
  });
  it('timeout twice with a healthy control: a direct fetch decides — 200 → inconclusive, 5xx / no response → fail', () => {
    expect(classifyRender(go0705, { networkOk: true, probe: { status: 200, ms: 23700 } }).verdict).toBe('inconclusive');
    expect(classifyRender(go0705, { networkOk: true, probe: null }).verdict).toBe('inconclusive');
    expect(classifyRender(go0705, { networkOk: true, probe: { status: 503, ms: 400 } }).verdict).toBe('fail');
    expect(classifyRender(go0705, { networkOk: true, probe: { status: null, ms: 30000 } }).verdict).toBe('fail');
  });
  it('an HTTP status, an Application error or a reproduced uncaught error is positive evidence even under a degraded control', () => {
    expect(classifyRender({ ...home0647, status: 500, failures: ['HTTP 500'] }, { networkOk: false }).verdict).toBe('fail');
    expect(classifyRender({ ...home0647, status: 404, failures: ['HTTP 404'] }, { networkOk: false }).verdict).toBe('fail');
    expect(classifyRender({ ...home0647, appError: true, failures: ['Next.js "Application error" boundary rendered'] }, { networkOk: false }).verdict).toBe('fail');
    expect(classifyRender({ ...home0647, pageErrors: ['TypeError: x is undefined @ https://musthavemods.com/_next/a.js'], failures: ['1 uncaught page error(s): TypeError: x is undefined'] }, { networkOk: false }).verdict).toBe('fail');
  });
  it('a secondary target that answered 200 with wrong content is positive evidence; a passing render is pass', () => {
    expect(classifyRender({ kind: 'xml', status: 200, ms: 500, textLength: 0, appError: false, pageErrors: [], failures: ['empty response'] }, { networkOk: false }).verdict).toBe('fail');
    expect(classifyRender({ ...home0647, failures: [] }, { networkOk: false }).verdict).toBe('pass');
  });
});

describe('smoke-render.ts wires the control and the verdict (the lib is not decoration)', () => {
  const src = readFileSync(join(process.cwd(), 'scripts/agents/smoke-render.ts'), 'utf8')
    .split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  it('samples the network control before the first render and after the last', () => {
    expect(src.indexOf('const netBefore = await networkControl()')).toBeGreaterThan(-1);
    expect(src.indexOf('const netBefore = await networkControl()')).toBeLessThan(src.indexOf('chromium.launch'));
    expect(src.indexOf('const netAfter = await networkControl()')).toBeGreaterThan(src.indexOf('browser.close()'));
  });
  it('classifies every failure, keeps `failed` empty when the control is degraded, and exits 2 on INCONCLUSIVE', () => {
    expect(src).toMatch(/classifyRender\(facts\(r\), \{ networkOk, probe: r\.probe \}\)/);
    expect(src).toMatch(/failed: networkOk \? failed\.map/);
    expect(src).toMatch(/suspect: networkOk \? \[\] : failed\.map/);
    expect(src).toMatch(/process\.exit\(verdict === 'FAIL' \? 1 : verdict === 'INCONCLUSIVE' \? 2 : 0\)/);
  });
  it('a navigation failure is no longer counted as an "uncaught page error" (it is judged by classifyRender instead)', () => {
    expect(src).toMatch(/!isHydration\(e\) && !isThirdParty\(e\) && !isNavError\(e\)/);
  });
});
