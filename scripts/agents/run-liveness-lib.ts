/**
 * Run liveness — did each of the last N mornings actually run? Pure helpers for
 * funnel-scoreboard.ts "Team health". No network, no git, no secrets: the caller
 * reads the files and passes their contents in.
 *
 * Why this exists (E187, 2026-10-11): the loop produced no digest on 10-05, 10-06,
 * 10-08, 10-09 and 10-10, and every one of those days was found by a human reading
 * logs/funnel-daily.log days later. On 10-08 and 10-10 the runner DID start (a
 * `day-lock: pid N owns DATE` line, a scoreboard, a PASS morning check) and then sat
 * in the Quinn preflight with logs/funnel-preflight-DATE.json at 0 bytes until
 * 10-11 10:55 — so "the runner started" and "a preflight file exists" both read as a
 * run while nothing reached main. A 0-byte preflight is the CLI never answering,
 * not a run. The watcher is the NEXT morning's scoreboard (a "did not fire" detector
 * must not live inside the job it reports on).
 *
 * One verdict per day, three evidence signals, never collapsed:
 *   - preflight: logs/funnel-preflight-DATE.json is ok ("is_error":false) | failed
 *     (non-empty, not ok) | empty (0 bytes) | absent | unknown (log dir unreadable)
 *   - runner: funnel-daily.log has a `day-lock: pid N owns DATE` line or any line
 *     stamped `[DATE ` — true | false | null (log unreadable)
 *   - digest: reports/funnel/digest-DATE.md is on main (the tree the scoreboard runs
 *     in) and is not a DEGRADED one
 * RAN needs the digest on main and no negative signal. MISSED needs at least one
 * negative signal (each one is printed as a reason). A day whose only problem is an
 * unreadable log dir, with a digest on main, is UNKNOWN — never a verdict we cannot
 * back with a file.
 */

export type PreflightState = 'ok' | 'failed' | 'empty' | 'absent' | 'unknown';
export type DayVerdict = 'RAN' | 'MISSED' | 'UNKNOWN';

export interface DayEvidence {
  preflight: PreflightState;
  /** null = funnel-daily.log could not be read */
  runnerStarted: boolean | null;
  digestOnMain: boolean;
  digestDegraded: boolean;
}

export interface DayLiveness {
  date: string;
  verdict: DayVerdict;
  reasons: string[];
  evidence: DayEvidence;
}

export interface RunLiveness {
  window: { from: string; to: string; days: number };
  days: DayLiveness[];
  ran: number;
  missed: number;
  unknown: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** The `n` calendar days before `todayIso`, newest first. Today is excluded: its run is the one reading this. */
export function priorDays(todayIso: string, n: number): string[] {
  const t = new Date(`${todayIso}T00:00:00Z`).getTime();
  if (!Number.isFinite(t)) throw new Error(`bad date ${todayIso}`);
  return Array.from({ length: n }, (_, i) => new Date(t - (i + 1) * DAY_MS).toISOString().slice(0, 10));
}

/**
 * `content` = the file's text, `null` = the file does not exist; `dirReadable=false` = we could not look.
 * A 0-byte (or whitespace-only) file is EMPTY: the runner's redirect created it and the CLI never answered.
 */
export function classifyPreflight(content: string | null, dirReadable = true): PreflightState {
  if (!dirReadable) return 'unknown';
  if (content == null) return 'absent';
  if (content.trim() === '') return 'empty';
  return /"is_error"\s*:\s*false/.test(content) ? 'ok' : 'failed';
}

/** Dates on which the runner logged a start: a day-lock `owns DATE` line, or any line stamped `[DATE `. */
export function runnerStartDates(logText: string): Set<string> {
  const out = new Set<string>();
  // exec loops, not matchAll: tsconfig's target cannot iterate a RegExpStringIterator (TS2802).
  for (const re of [/day-lock: pid \d+ owns (\d{4}-\d{2}-\d{2})/g, /^\[(\d{4}-\d{2}-\d{2}) \d{2}:\d{2}:\d{2}\]/gm]) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(logText)) !== null) out.add(m[1]);
  }
  return out;
}

export function isDegradedDigest(text: string): boolean {
  return /DEGRADED: Quinn did not run/.test(text);
}

export function gradeDay(date: string, ev: DayEvidence): DayLiveness {
  const reasons: string[] = [];
  if (ev.runnerStarted === false) reasons.push('no runner start in funnel-daily.log');
  if (ev.preflight === 'absent') reasons.push('no preflight file');
  if (ev.preflight === 'empty') reasons.push('preflight 0 bytes (CLI never answered)');
  if (ev.preflight === 'failed') reasons.push('preflight failed');
  if (!ev.digestOnMain) reasons.push('no digest on main');
  else if (ev.digestDegraded) reasons.push('digest on main is DEGRADED (Quinn did not run)');
  if (reasons.length) return { date, verdict: 'MISSED', reasons, evidence: ev };
  if (ev.preflight === 'unknown' || ev.runnerStarted === null) {
    return { date, verdict: 'UNKNOWN', reasons: ['digest on main, but logs/ unreadable — preflight/runner not checked'], evidence: ev };
  }
  return { date, verdict: 'RAN', reasons: [], evidence: ev };
}

export interface RunLivenessInputs {
  todayIso: string;
  days?: number;
  /** false when the operator's logs/ dir is missing or unreadable (e.g. not on the runner host). */
  logDirReadable: boolean;
  /** date -> preflight file text, or null when the file does not exist. Missing key = absent. */
  preflightByDate: Map<string, string | null>;
  /** funnel-daily.log text, or null when unreadable. */
  logText: string | null;
  /** date -> digest text, for digest-DATE.md files present in the main tree. */
  digestsOnMain: Map<string, string>;
}

export function assessRunLiveness(inp: RunLivenessInputs): RunLiveness {
  const n = inp.days ?? 7;
  const dates = priorDays(inp.todayIso, n);
  const started = inp.logText == null ? null : runnerStartDates(inp.logText);
  const days = dates.map((d) => {
    const digest = inp.digestsOnMain.get(d);
    return gradeDay(d, {
      preflight: classifyPreflight(inp.preflightByDate.get(d) ?? null, inp.logDirReadable),
      runnerStarted: started == null || !inp.logDirReadable ? null : started.has(d),
      digestOnMain: digest != null,
      digestDegraded: digest != null && isDegradedDigest(digest),
    });
  });
  return {
    window: { from: dates[dates.length - 1], to: dates[0], days: n },
    days,
    ran: days.filter((d) => d.verdict === 'RAN').length,
    missed: days.filter((d) => d.verdict === 'MISSED').length,
    unknown: days.filter((d) => d.verdict === 'UNKNOWN').length,
  };
}

/** Markdown lines for the scoreboard's "Team health" section: one summary line, then one MISSED/UNKNOWN line per day. */
export function formatRunLiveness(r: RunLiveness): string[] {
  const lines = [
    `- Run liveness ${r.window.days}d (${r.window.from} → ${r.window.to}): **${r.ran}/${r.window.days} ran** · ${r.missed} MISSED · ${r.unknown} unknown`,
  ];
  for (const d of r.days) {
    if (d.verdict !== 'RAN') lines.push(`  - ${d.verdict} ${d.date}: ${d.reasons.join(' · ')}`);
  }
  return lines;
}
