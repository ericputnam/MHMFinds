/**
 * No GA4 event on this site may carry a traffic-source parameter (Cass, E426).
 *
 * gtag.js reads an event parameter called `source` as the session's campaign
 * source. Every capture event carried the surface as `source`, so a form view
 * on the homepage restarted the visitor's session as sessionSource=home-hero /
 * medium (not set): the real channel lost the rest of the visit and the
 * channel report grew an Unassigned row (home-hero 2 → 349 → 945 sessions/wk
 * after E341's newsletter_form_view{source} shipped on 11-05).
 *
 * The scanner walks every gtag call in app/, components/ and lib/ — the raw
 * `window.gtag?.(...)` and every local wrapper whose name contains "gtag"
 * (`fireGtag`, a `const gtag = ...`) — and fails if a params object names one
 * of GA4_TRAFFIC_SOURCE_PARAMS as a key. Comments are stripped first, because
 * comments here quote the bad pattern on purpose.
 */
import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import { stripComments } from '../helpers/namedImports';
import { GA4_SURFACE_PARAM, GA4_TRAFFIC_SOURCE_PARAMS } from '@/lib/analytics/gtag';

const ROOT = path.resolve(__dirname, '../..');
const SCAN_DIRS = ['app', 'components', 'lib'];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.d\.ts$/.test(entry.name)) out.push(full);
  }
  return out;
}

/** Text between the `(` at `open` and its matching `)`. */
function balancedArgs(code: string, open: number): string {
  let depth = 0;
  for (let i = open; i < code.length; i++) {
    const c = code[i];
    if (c === '(') depth++;
    else if (c === ')') {
      depth--;
      if (depth === 0) return code.slice(open + 1, i);
    }
  }
  return code.slice(open + 1);
}

interface GtagCall {
  file: string;
  args: string;
}

/** Every call to an identifier containing "gtag" (case-insensitive). */
function findGtagCalls(file: string, src: string): GtagCall[] {
  const code = stripComments(src);
  const calls: GtagCall[] = [];
  const re = /(function\s+)?\b([A-Za-z_$][\w$]*)\s*(?:\?\.)?\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) {
    if (m[1]) continue; // a declaration, not a call
    if (!/gtag/i.test(m[2])) continue;
    const open = m.index + m[0].length - 1;
    calls.push({ file, args: balancedArgs(code, open) });
  }
  return calls;
}

/** Object keys in `args` that are traffic-source params (`{ source }`, `source: x`, `'source': x`). */
function trafficSourceKeys(args: string): string[] {
  const hits: string[] = [];
  for (const key of GA4_TRAFFIC_SOURCE_PARAMS) {
    const re = new RegExp(`[{,]\\s*(?:${key}|'${key}'|"${key}")\\s*(?::|,|\\})`);
    if (re.test(args)) hits.push(key);
  }
  return hits;
}

const files = SCAN_DIRS.flatMap((d) => walk(path.join(ROOT, d)));
const calls = files.flatMap((f) => findGtagCalls(path.relative(ROOT, f), fs.readFileSync(f, 'utf8')));

describe('GA4 events never carry a traffic-source parameter (E426)', () => {
  it('the scanner finds the site’s gtag calls (vacuity guard)', () => {
    expect(calls.length).toBeGreaterThanOrEqual(30);
    const surfaceKey = new RegExp(`[{,]\\s*${GA4_SURFACE_PARAM}\\s*:`);
    expect(calls.filter((c) => surfaceKey.test(c.args)).length).toBeGreaterThanOrEqual(25);
  });

  it('no gtag params object names source / medium / campaign / term / content / campaign_*', () => {
    const offenders = calls
      .map((c) => ({ file: c.file, keys: trafficSourceKeys(c.args), args: c.args.replace(/\s+/g, ' ').slice(0, 120) }))
      .filter((c) => c.keys.length > 0);
    expect(offenders).toEqual([]);
  });

  it('the surface param is a standard dimension, not a traffic-source field', () => {
    expect(GA4_SURFACE_PARAM).toBe('content_type');
    expect(GA4_TRAFFIC_SOURCE_PARAMS).not.toContain(GA4_SURFACE_PARAM);
    expect(GA4_TRAFFIC_SOURCE_PARAMS).toContain('source');
  });

  it('the key matcher catches every shape the site used and ignores values', () => {
    expect(trafficSourceKeys(`'event', 'x', { source }`)).toEqual(['source']);
    expect(trafficSourceKeys(`'event', 'x', {\n  source,\n  mod_id }`)).toEqual(['source']);
    expect(trafficSourceKeys(`'event', 'x', { source: 'home-hero' }`)).toEqual(['source']);
    expect(trafficSourceKeys(`'event', 'x', { mod_id: id, 'medium': m }`)).toEqual(['medium']);
    expect(trafficSourceKeys(`'event', 'x', { content_type: source, mod_id: id }`)).toEqual([]);
    expect(trafficSourceKeys(`'event', 'x', { source_type: s, content_type: c }`)).toEqual([]);
  });
});
