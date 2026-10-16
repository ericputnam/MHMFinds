/**
 * Singapore Direct classification — pure library (no network, no fs, no env). E216, Pip, 2026-10-16.
 *
 * What it classifies: the stream GA4 labels country=Singapore, sessionSource="(direct)". On
 * 2026-10-16 the 31-day read (09-15→10-15, property 437117335) was 16,759 sessions = 17,198 users
 * = 17,236 pageviews, 99.5% on two screen resolutions (Chrome/Windows 1280x1200: 11,885 sessions,
 * 58 engaged; Chrome/Macintosh 1366x1366: 4,935 sessions, 4,228 "engaged" — a headless browser
 * that dwells ≥10 s fires `user_engagement`, so engagement rate is NOT a bot discriminator here),
 * spread over 8,238 distinct landing pages and all 24 hours. Outside Singapore those two
 * resolutions total ~190 sessions in the same window, so country + source captures the stream.
 *
 * Why the *whole* segment, not "excess over 250/day" (Rio's E206 method): the quiet-day trickle
 * (116–262/day since 09-15) is the same two fingerprints with the same 1:1:1 shape. Rio's method
 * read 1.93% of the 28d headline; the segment is 4.1%.
 *
 * `source` mirrors `funnel-scoreboard.ts` `bySource` (`src === '(direct)'` → 'direct') so a
 * number this prints can be subtracted from the scoreboard's own Direct line without a basis gap
 * (CLAUDE.md: "a monitor must mirror its consumer's selection query"). The unit test imports this
 * constant and asserts the scoreboard still selects on it.
 */

export const SG_DIRECT_RULE = {
  experiment: 'E216',
  classifiedOn: '2026-10-16',
  country: 'Singapore',
  /** GA4 `sessionSource` value — the scoreboard's Direct selector. */
  source: '(direct)',
  /** GA4 `screenResolution` values that carried 99.5% of the segment on 2026-10-16. */
  fingerprints: ['1280x1200', '1366x1366'],
  /**
   * Decision rule (printed in the report BEFORE the reading): the segment is `automated` when
   * every leg holds; otherwise `inconclusive` — never "human" (this lib cannot see a UA or ASN).
   */
  automated: {
    minUsersPerSession: 0.98,
    maxPvPerSession: 1.05,
    minFingerprintShare: 0.9,
  },
} as const;

export interface DailyRow {
  /** YYYY-MM-DD or GA4's YYYYMMDD — normalized by `ga4DateKey`. */
  date: string;
  sessions: number;
}

export interface SegmentDailyRow extends DailyRow {
  users: number;
  pageviews: number;
  engaged: number;
}

export interface DirectBotInput {
  start: string;
  end: string;
  /** All sessions by day (no filter). */
  site: DailyRow[];
  /** Sessions by day where sessionSource = rule.source (all countries). */
  direct: DailyRow[];
  /** Sessions by day where country = rule.country AND sessionSource = rule.source. */
  segment: SegmentDailyRow[];
  /** Segment sessions by screenResolution over the whole window; null when the pull failed. */
  fingerprintSessions: Record<string, number> | null;
}

export interface WoW {
  curr: number;
  prev: number;
  /** (curr − prev) / prev; null when prev is 0. */
  pct: number | null;
}

export interface DirectBotDaily {
  date: string;
  site: number;
  direct: number;
  segment: number;
  users: number;
  pageviews: number;
  engaged: number;
}

export interface DirectBotRead {
  rule: typeof SG_DIRECT_RULE;
  start: string;
  end: string;
  days: number;
  siteSessions: number;
  directSessions: number;
  segmentSessions: number;
  /** segment ÷ site, null when site is 0. */
  segmentShare: number | null;
  /** segment ÷ direct, null when direct is 0. */
  segmentShareOfDirect: number | null;
  usersPerSession: number | null;
  pvPerSession: number | null;
  engagedShare: number | null;
  fingerprintShare: number | null;
  fingerprintTop: Array<{ resolution: string; sessions: number }>;
  peak: { date: string; sessions: number } | null;
  /** Last 7 days of the window vs the 7 before; null when the window is shorter than 14 days. */
  wow: null | {
    currStart: string;
    currEnd: string;
    prevStart: string;
    prevEnd: string;
    all: WoW;
    allExSegment: WoW;
    direct: WoW;
    directExSegment: WoW;
    segment: WoW;
  };
  verdict: 'automated' | 'inconclusive';
  verdictWhy: string[];
  daily: DirectBotDaily[];
}

/** GA4 returns `date` as YYYYMMDD; accept either shape, return YYYY-MM-DD ('' when malformed). */
export function ga4DateKey(raw: string): string {
  const s = (raw ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  return '';
}

/** Inclusive list of YYYY-MM-DD keys from start to end (UTC arithmetic, no DST drift). */
export function dateKeys(start: string, end: string): string[] {
  const out: string[] = [];
  const [sy, sm, sd] = start.split('-').map(Number);
  const [ey, em, ed] = end.split('-').map(Number);
  let t = Date.UTC(sy, sm - 1, sd);
  const stop = Date.UTC(ey, em - 1, ed);
  while (t <= stop) {
    out.push(new Date(t).toISOString().slice(0, 10));
    t += 86_400_000;
  }
  return out;
}

function pct(curr: number, prev: number): number | null {
  return prev > 0 ? (curr - prev) / prev : null;
}

function wow(curr: number, prev: number): WoW {
  return { curr, prev, pct: pct(curr, prev) };
}

function ratio(num: number, den: number): number | null {
  return den > 0 ? num / den : null;
}

function sum(rows: DirectBotDaily[], key: keyof Omit<DirectBotDaily, 'date'>): number {
  return rows.reduce((a, r) => a + r[key], 0);
}

export function buildDirectBotRead(input: DirectBotInput): DirectBotRead {
  const { start, end } = input;
  const keys = dateKeys(start, end);
  const byKey = <T extends DailyRow>(rows: T[]) => {
    const m = new Map<string, T>();
    for (const r of rows) {
      const k = ga4DateKey(r.date);
      if (k) m.set(k, r);
    }
    return m;
  };
  const site = byKey(input.site);
  const direct = byKey(input.direct);
  const segment = byKey(input.segment);

  const daily: DirectBotDaily[] = keys.map((date) => {
    const seg = segment.get(date);
    return {
      date,
      site: site.get(date)?.sessions ?? 0,
      direct: direct.get(date)?.sessions ?? 0,
      segment: seg?.sessions ?? 0,
      users: seg?.users ?? 0,
      pageviews: seg?.pageviews ?? 0,
      engaged: seg?.engaged ?? 0,
    };
  });

  const siteSessions = sum(daily, 'site');
  const directSessions = sum(daily, 'direct');
  const segmentSessions = sum(daily, 'segment');
  const users = sum(daily, 'users');
  const pageviews = sum(daily, 'pageviews');
  const engaged = sum(daily, 'engaged');

  const fp = input.fingerprintSessions;
  const fingerprintTop = fp
    ? Object.entries(fp)
        .map(([resolution, sessions]) => ({ resolution, sessions }))
        .sort((a, b) => b.sessions - a.sessions)
        .slice(0, 5)
    : [];
  const fpTotal = fp ? Object.values(fp).reduce((a, b) => a + b, 0) : 0;
  const fpNamed = fp
    ? (SG_DIRECT_RULE.fingerprints as readonly string[]).reduce((a, r) => a + (fp[r] ?? 0), 0)
    : 0;
  // screenResolution is user-scoped, so its session sum can exceed the date-scoped total by a
  // hair; the share is taken against the resolution pull's own total, never against the other.
  const fingerprintShare = fp ? ratio(fpNamed, fpTotal) : null;

  let peak: DirectBotRead['peak'] = null;
  for (const d of daily) if (!peak || d.segment > peak.sessions) peak = { date: d.date, sessions: d.segment };
  if (peak && peak.sessions === 0) peak = null;

  let wowBlock: DirectBotRead['wow'] = null;
  if (keys.length >= 14) {
    const curr = daily.slice(-7);
    const prev = daily.slice(-14, -7);
    wowBlock = {
      currStart: curr[0].date,
      currEnd: curr[6].date,
      prevStart: prev[0].date,
      prevEnd: prev[6].date,
      all: wow(sum(curr, 'site'), sum(prev, 'site')),
      allExSegment: wow(sum(curr, 'site') - sum(curr, 'segment'), sum(prev, 'site') - sum(prev, 'segment')),
      direct: wow(sum(curr, 'direct'), sum(prev, 'direct')),
      directExSegment: wow(sum(curr, 'direct') - sum(curr, 'segment'), sum(prev, 'direct') - sum(prev, 'segment')),
      segment: wow(sum(curr, 'segment'), sum(prev, 'segment')),
    };
  }

  const usersPerSession = ratio(users, segmentSessions);
  const pvPerSession = ratio(pageviews, segmentSessions);
  const engagedShare = ratio(engaged, segmentSessions);

  const rule = SG_DIRECT_RULE.automated;
  const why: string[] = [];
  let automated = segmentSessions > 0;
  if (usersPerSession == null || usersPerSession < rule.minUsersPerSession) {
    automated = false;
    why.push(`users/session ${fmt(usersPerSession)} < ${rule.minUsersPerSession}`);
  } else why.push(`users/session ${fmt(usersPerSession)} ≥ ${rule.minUsersPerSession}`);
  if (pvPerSession == null || pvPerSession > rule.maxPvPerSession) {
    automated = false;
    why.push(`pageviews/session ${fmt(pvPerSession)} > ${rule.maxPvPerSession}`);
  } else why.push(`pageviews/session ${fmt(pvPerSession)} ≤ ${rule.maxPvPerSession}`);
  if (fingerprintShare == null || fingerprintShare < rule.minFingerprintShare) {
    automated = false;
    why.push(
      fingerprintShare == null
        ? 'fingerprint share unavailable'
        : `fingerprint share ${fmtPct(fingerprintShare)} < ${fmtPct(rule.minFingerprintShare)}`,
    );
  } else why.push(`fingerprint share ${fmtPct(fingerprintShare)} ≥ ${fmtPct(rule.minFingerprintShare)}`);
  if (segmentSessions === 0) why.push('segment empty');

  return {
    rule: SG_DIRECT_RULE,
    start,
    end,
    days: keys.length,
    siteSessions,
    directSessions,
    segmentSessions,
    segmentShare: ratio(segmentSessions, siteSessions),
    segmentShareOfDirect: ratio(segmentSessions, directSessions),
    usersPerSession,
    pvPerSession,
    engagedShare,
    fingerprintShare,
    fingerprintTop,
    peak,
    wow: wowBlock,
    verdict: automated ? 'automated' : 'inconclusive',
    verdictWhy: why,
    daily,
  };
}

function fmt(n: number | null, d = 3): string {
  return n == null ? '—' : n.toFixed(d);
}
function fmtPct(n: number | null, d = 1): string {
  return n == null ? '—' : `${(n * 100).toFixed(d)}%`;
}
function fmtWoW(w: WoW): string {
  return `${w.curr.toLocaleString('en-US')} vs ${w.prev.toLocaleString('en-US')} (${w.pct == null ? '—' : `${w.pct >= 0 ? '+' : ''}${(w.pct * 100).toFixed(1)}%`})`;
}

export function renderDirectBotReadMd(read: DirectBotRead): string {
  const r = read.rule;
  const lines: string[] = [];
  lines.push(`# Singapore Direct read — ${read.start} → ${read.end} (${read.days} d) · ${r.experiment}, Pip`);
  lines.push('');
  lines.push(
    `Segment: GA4 country = ${r.country} AND sessionSource = \`${r.source}\` (the scoreboard's Direct selector). ` +
      `Source: GA4 property 437117335, Data API; aggregates only.`,
  );
  lines.push('');
  lines.push('## Decision rule (fixed before the pull)');
  lines.push('');
  lines.push(
    `\`automated\` iff users/session ≥ ${r.automated.minUsersPerSession} AND pageviews/session ≤ ${r.automated.maxPvPerSession} ` +
      `AND share of segment sessions on ${r.fingerprints.join(' + ')} ≥ ${fmtPct(r.automated.minFingerprintShare)}; otherwise \`inconclusive\` ` +
      `(never "human" — this read cannot see a user agent or ASN). Engagement rate is not a leg: a headless browser that dwells ≥10 s fires \`user_engagement\`.`,
  );
  lines.push('');
  lines.push('## Reading');
  lines.push('');
  lines.push(`- **Verdict: ${read.verdict}** — ${read.verdictWhy.join('; ')}`);
  lines.push(
    `- Segment ${read.segmentSessions.toLocaleString('en-US')} sessions = ${fmtPct(read.segmentShare, 2)} of ${read.siteSessions.toLocaleString('en-US')} site sessions, ` +
      `${fmtPct(read.segmentShareOfDirect)} of Direct (${read.directSessions.toLocaleString('en-US')})`,
  );
  lines.push(
    `- Shape: users/session ${fmt(read.usersPerSession)}, pageviews/session ${fmt(read.pvPerSession)}, engaged ${fmtPct(read.engagedShare)}` +
      (read.peak ? ` · peak day ${read.peak.date} ${read.peak.sessions.toLocaleString('en-US')}` : ''),
  );
  if (read.fingerprintTop.length) {
    lines.push(
      `- Fingerprints (screenResolution): ${read.fingerprintTop.map((f) => `${f.resolution} ${f.sessions.toLocaleString('en-US')}`).join(', ')} · named share ${fmtPct(read.fingerprintShare)}`,
    );
  } else lines.push('- Fingerprints: unavailable');
  if (read.wow) {
    const w = read.wow;
    lines.push('');
    lines.push(`## WoW ${w.currStart}→${w.currEnd} vs ${w.prevStart}→${w.prevEnd}`);
    lines.push('');
    lines.push('| Series | curr vs prev |');
    lines.push('|---|--:|');
    lines.push(`| All sessions | ${fmtWoW(w.all)} |`);
    lines.push(`| **All sessions ex segment** | ${fmtWoW(w.allExSegment)} |`);
    lines.push(`| Direct | ${fmtWoW(w.direct)} |`);
    lines.push(`| **Direct ex segment** | ${fmtWoW(w.directExSegment)} |`);
    lines.push(`| Segment | ${fmtWoW(w.segment)} |`);
  }
  lines.push('');
  lines.push('## Daily');
  lines.push('');
  lines.push('| date | site | direct | segment | users | pv | engaged |');
  lines.push('|---|--:|--:|--:|--:|--:|--:|');
  for (const d of read.daily) {
    lines.push(`| ${d.date} | ${d.site} | ${d.direct} | ${d.segment} | ${d.users} | ${d.pageviews} | ${d.engaged} |`);
  }
  lines.push('');
  lines.push(`_Generated by scripts/agents/direct-bot-read.ts · rule ${r.experiment} classified ${r.classifiedOn}._`);
  lines.push('');
  return lines.join('\n');
}
