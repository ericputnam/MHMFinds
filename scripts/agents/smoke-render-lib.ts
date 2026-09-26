/**
 * scripts/agents/smoke-render-lib.ts — the pure decisions behind smoke-render.ts, split out so they
 * can be unit-tested without launching Chromium (smoke-render.ts runs main() on import).
 *
 * Three decisions live here:
 *  - shouldRetryRender: is a first-render failure plausibly transient (worth one fresh page)?
 *  - gradeNetwork: does the host's own network work right now (independent control)?
 *  - classifyRender: after the retry, is a failure POSITIVE evidence (fail), or could-not-run
 *    (inconclusive)? "Could not run ≠ is broken" (CLAUDE.md): only a verdict backed by positive
 *    evidence may reach deploy-verify's rollback branch.
 */
export type SmokeKind = 'catalog' | 'detail' | 'interstitial' | 'blog' | 'game' | 'xml' | 'text';

/** Non-ad, non-revenue targets: sitemaps, llms.txt, feeds, the IndexNow key. */
export const SECONDARY_KINDS: ReadonlySet<SmokeKind> = new Set<SmokeKind>(['xml', 'text']);
/** Pages that carry Mediavine furniture and are graded on it. */
export const AD_KINDS: ReadonlySet<SmokeKind> = new Set<SmokeKind>(['catalog', 'detail', 'interstitial', 'blog', 'game']);

/**
 * A full ad page normally loads in 7–10 s on this host. At or above SLOW_LOAD_MS a page whose text is
 * still below its `settledText` floor is "unsettled" (the client fetch has not finished), not "blank":
 * 2026-09-26 06:46 the homepage grid (client-fetched from /api/mods) sat at 1,788 chars after 27.8 s
 * (≈9,600 normally) with `.mv-ads` = 0, and that alone rolled production back (E111).
 */
export const SLOW_LOAD_MS = 20_000;
/** Default "fully rendered" floor — the same 400 chars as the blank-render check, so a target that does
 *  not name its own floor never enters the unsettled state (a small page cannot be "unsettled"). */
export const DEFAULT_SETTLED_TEXT = 400;

/** Independent network control: known-fast hosts that have nothing to do with our deploy. */
export const NETWORK_CONTROL_URLS: readonly string[] = [
  'https://www.google.com/generate_204',
  'https://vercel.com/',
  'https://www.cloudflare.com/cdn-cgi/trace',
];
export const CONTROL_TIMEOUT_MS = 8_000;
/** A control probe that answers slower than this is a failing probe — the host's network is degraded. */
export const CONTROL_SLOW_MS = 4_000;
/** Direct-fetch tie-breaker for a page that timed out twice in Chromium: 07:42 on 09-26 a curl of the blog
 *  article took 23.7 s and still answered 200, so the probe waits longer than a healthy page ever needs. */
export const PROBE_TIMEOUT_MS = 30_000;

export interface ControlSample { url: string; status: number | null; ms: number; }
export interface NetworkGrade { ok: boolean; passed: number; total: number; why: string; samples: ControlSample[]; }

/** ≥ 2 control hosts must answer (any HTTP status < 500) within CONTROL_SLOW_MS. Fewer than 2 samples → degraded (vacuity). */
export function gradeNetwork(samples: readonly ControlSample[]): NetworkGrade {
  const passing = samples.filter((s) => s.status !== null && s.status < 500 && s.ms <= CONTROL_SLOW_MS);
  const ok = samples.length >= 2 && passing.length >= 2;
  const why = samples.length
    ? samples.map((s) => `${new URL(s.url).host}=${s.status ?? 'none'}/${s.ms}ms`).join(' ')
    : 'no control samples';
  return { ok, passed: passing.length, total: samples.length, why, samples: [...samples] };
}

export interface RenderFacts {
  kind: SmokeKind;
  status: number | null;
  ms: number;
  textLength: number;
  appError: boolean;
  pageErrors: readonly string[];
  failures: readonly string[];
  /** Per-target "fully rendered" text floor (see SLOW_LOAD_MS). */
  settledText?: number;
}

export const isNavError = (e: string): boolean => /^(navigation|evaluate):/.test(e);
export const navigationFailed = (f: Pick<RenderFacts, 'status' | 'pageErrors'>): boolean =>
  f.status === null && f.pageErrors.some((e) => e.startsWith('navigation:'));

/** A 200 that is still filling in: slow AND short AND every failure is structural (anchor/loader/text-size). */
export function isUnsettled(f: RenderFacts): boolean {
  if (f.status !== 200 || !AD_KINDS.has(f.kind) || f.appError || !f.failures.length) return false;
  if (f.ms < SLOW_LOAD_MS || f.textLength >= (f.settledText ?? DEFAULT_SETTLED_TEXT)) return false;
  return f.failures.every(isStructural);
}
const isStructural = (x: string): boolean => /anchors? missing|anchor\) missing|loader .* missing|page text only/.test(x);

/**
 * Render the target once more with a fresh page (longer settle) when the first result is plausibly transient:
 *  - every failure is an uncaught page error (third-party script race — the 2026-09-05 rule), or
 *  - the navigation itself failed (`page.goto` timeout / no response) on ANY kind — 2026-09-22: one 45 s
 *    timeout on the prerendered /sitemap.xml (561 ms four minutes later) rolled production back (E91); 2026-09-26:
 *    four 45 s timeouts on ad pages during a host-wide network stall rolled it back again (E111), or
 *  - the page answered 200 but is unsettled (see isUnsettled).
 * The retry result replaces the first; a failure counts only if it reproduces — and even then classifyRender
 * decides whether what reproduced is evidence about the site or about the network.
 */
export function shouldRetryRender(kind: SmokeKind, failures: readonly string[], pageErrors: readonly string[], facts?: Omit<RenderFacts, 'kind' | 'failures' | 'pageErrors'>): boolean {
  if (!failures.length) return false;
  if (failures.every((f) => /uncaught page error/.test(f))) return true;
  if (pageErrors.some((e) => e.startsWith('navigation:'))) return true;
  return !!facts && isUnsettled({ kind, failures, pageErrors, ...facts });
}

export type Verdict = 'pass' | 'fail' | 'inconclusive';
export interface ProbeSample { status: number | null; ms: number; }
export interface Classification { verdict: Verdict; why: string; }

/**
 * Positive evidence (→ fail): an HTTP status that is not 200, the Application-error boundary, an uncaught page
 * error that reproduced, a secondary target that answered with the wrong content, or an ad page that rendered
 * fully (or fast) without its anchors. Everything else the smoke can observe — no response, or a slow unsettled
 * 200 — is could-not-run (→ inconclusive) UNLESS the network control passed and a direct fetch of the same URL
 * also got no response / a non-200: then the site, not the network, is what is not answering.
 */
export function classifyRender(f: RenderFacts, ctx: { networkOk: boolean; probe?: ProbeSample | null }): Classification {
  if (!f.failures.length) return { verdict: 'pass', why: '' };
  const positive: string[] = [];
  if (typeof f.status === 'number' && f.status !== 200) positive.push(`HTTP ${f.status}`);
  if (f.appError) positive.push('Next.js "Application error" boundary rendered');
  positive.push(...f.failures.filter((x) => /uncaught page error/.test(x)));
  if (f.status === 200) {
    const rest = f.failures.filter((x) => !/uncaught page error|^HTTP /.test(x));
    if (SECONDARY_KINDS.has(f.kind)) positive.push(...rest);
    else if (!isUnsettled(f)) positive.push(...rest.map((x) => `${x} (rendered ${f.textLength} chars in ${f.ms} ms)`));
  }
  if (positive.length) return { verdict: 'fail', why: positive.join('; ') };
  if (navigationFailed(f)) {
    const nav = f.pageErrors.find((e) => e.startsWith('navigation:')) ?? 'navigation failed';
    if (!ctx.networkOk) return { verdict: 'inconclusive', why: `${nav.slice(0, 80)} while the network control was degraded — could not run, not a site verdict` };
    const p = ctx.probe;
    if (p && (p.status === null || p.status !== 200)) {
      return { verdict: 'fail', why: `no response in Chromium twice and a direct fetch got ${p.status === null ? 'no response' : `HTTP ${p.status}`} in ${p.ms} ms while the network control passed` };
    }
    return { verdict: 'inconclusive', why: `${nav.slice(0, 80)} twice, but ${p ? `a direct fetch answered HTTP ${p.status} in ${p.ms} ms` : 'no direct probe was taken'} — not evidence the site is down` };
  }
  return { verdict: 'inconclusive', why: `unsettled render: ${f.textLength} chars (< ${f.settledText ?? DEFAULT_SETTLED_TEXT}) after ${f.ms} ms${ctx.networkOk ? '' : ', network control degraded'} — could not tell` };
}
