/**
 * E241 (2026-10-19, Rio) — pure functions behind `guardrail-agreement-tracker.ts`.
 *
 * The revenue guardrail prints two sessions lines every morning since #326 (E227): the Mediavine
 * sessions delta (`actualDay.sessions` vs `expectedDay.sessions`, the basis of the red/yellow rules)
 * and the GA4 raw delta (`sessionsExSegment.raw`, the basis of the ex-Singapore-Direct read). The
 * 10-24 decision (ideas-inbox, Rio 10-17) is "wire the ex-segment ratio into the `red-traffic` leg
 * once the two lines have agreed within ±3 pts for 7 mornings". This module makes that decision
 * mechanical: one reading per guardrail JSON, `absent` when a morning has only one line (never
 * counted as agreement), and a WIRE / HOLD / INSUFFICIENT verdict printed with its rule.
 *
 * Nothing here reads the network or writes a report; the tracker is a reader of files the
 * guardrail already wrote.
 */

export const AGREEMENT_TOLERANCE_PTS = 3;
export const AGREEMENT_MORNINGS = 7;

/** Float slack for the boundary compare only — a 3.0-pt gap must pass, 0.030000000000000002 is 3.0. */
const BOUNDARY_EPS = 1e-9;

export type AgreementState = 'agree' | 'disagree' | 'absent';

export interface MorningReading {
  /** The morning the guardrail ran (from the file name), YYYY-MM-DD. */
  morning: string;
  /** The judged (last finalized) day, or null when the JSON carries none. */
  day: string | null;
  status: string | null;
  /** Mediavine sessions delta vs the 4-week same-weekday mean, in %. null = line absent. */
  mvDeltaPct: number | null;
  /** GA4 raw sessions delta vs its own same-weekday controls, in %. null = line absent. */
  ga4RawDeltaPct: number | null;
  /** |mv − ga4| in percentage points; null unless both lines are present. */
  gapPts: number | null;
  exSegmentDeltaPct: number | null;
  segmentSharePct: number | null;
  state: AgreementState;
  /** Why the state is `absent`, when it is. */
  absentWhy: string | null;
}

export type Decision = 'WIRE' | 'HOLD' | 'INSUFFICIENT';

export interface AgreementSummary {
  tolerancePts: number;
  mornings: number;
  /** The readings in the window, oldest first. */
  window: MorningReading[];
  withBothLines: number;
  agreeing: number;
  disagreeing: string[];
  absent: string[];
  decision: Decision;
  why: string;
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const pct = (actual: number, expected: number): number | null => (expected > 0 ? (actual / expected - 1) * 100 : null);

/** Pull the YYYY-MM-DD out of `guardrail-2026-10-19.json`; null for anything else. */
export function morningFromFileName(name: string): string | null {
  const m = /^guardrail-(\d{4}-\d{2}-\d{2})\.json$/.exec(name);
  return m ? m[1] : null;
}

/**
 * One reading from one guardrail JSON (the object `revenue-guardrail.ts` writes). Tolerates any
 * shape: a missing or malformed line is `absent` with a reason, never a number.
 */
export function readMorning(morning: string, json: unknown, tolerancePts: number = AGREEMENT_TOLERANCE_PTS): MorningReading {
  const j = (json && typeof json === 'object' ? json : {}) as Record<string, unknown>;
  const actual = (j.actualDay ?? {}) as Record<string, unknown>;
  const expected = (j.expectedDay ?? {}) as Record<string, unknown>;
  const day = typeof j.day === 'string' ? j.day : null;
  const status = typeof j.status === 'string' ? j.status : null;

  const mvActual = num(actual.sessions);
  const mvExpected = num(expected.sessions);
  const mvDeltaPct = mvActual != null && mvExpected != null ? pct(mvActual, mvExpected) : null;

  const x = (j.sessionsExSegment && typeof j.sessionsExSegment === 'object' ? j.sessionsExSegment : null) as Record<string, unknown> | null;
  const raw = (x?.raw ?? null) as Record<string, unknown> | null;
  const ex = (x?.exSegment ?? null) as Record<string, unknown> | null;
  const seg = (x?.segment ?? null) as Record<string, unknown> | null;
  const rawActual = num(raw?.actual);
  const rawExpected = num(raw?.expected);
  const ga4RawDeltaPct = rawActual != null && rawExpected != null ? pct(rawActual, rawExpected) : null;
  const exActual = num(ex?.actual);
  const exExpected = num(ex?.expected);
  const exSegmentDeltaPct = exActual != null && exExpected != null ? pct(exActual, exExpected) : null;
  const share = num(seg?.shareActual);
  const segmentSharePct = share != null ? share * 100 : null;

  let absentWhy: string | null = null;
  if (mvDeltaPct == null) absentWhy = 'no Mediavine sessions line (actualDay/expectedDay.sessions)';
  else if (!x) absentWhy = 'no sessionsExSegment block (pre-#326 JSON or GA4 unavailable that morning)';
  else if (ga4RawDeltaPct == null) absentWhy = 'sessionsExSegment.raw missing or non-numeric';

  const gapPts = absentWhy == null && mvDeltaPct != null && ga4RawDeltaPct != null ? Math.abs(mvDeltaPct - ga4RawDeltaPct) : null;
  const state: AgreementState = gapPts == null ? 'absent' : gapPts <= tolerancePts + BOUNDARY_EPS ? 'agree' : 'disagree';

  return { morning, day, status, mvDeltaPct, ga4RawDeltaPct, gapPts, exSegmentDeltaPct, segmentSharePct, state, absentWhy };
}

/** The rule, as a sentence, so it is printed before any reading is taken. */
export function decisionRule(mornings: number = AGREEMENT_MORNINGS, tolerancePts: number = AGREEMENT_TOLERANCE_PTS): string {
  return `decision rule (pre-committed, E241): over the last ${mornings} guardrail mornings, WIRE the ex-segment ratio into the red-traffic leg only if every morning prints both sessions lines AND |Mediavine Δ − GA4 raw Δ| ≤ ${tolerancePts} pts on each; any disagreeing morning → HOLD; fewer than ${mornings} mornings with both lines → INSUFFICIENT (an absent line is never agreement).`;
}

/**
 * Pure: the last `mornings` readings (by morning date, oldest first in the output) and the verdict.
 * `readings` may arrive in any order and may contain more than the window; a morning with no JSON at
 * all is invisible here — the runner's liveness row owns "did not fire".
 */
export function summarizeAgreement(
  readings: MorningReading[],
  mornings: number = AGREEMENT_MORNINGS,
  tolerancePts: number = AGREEMENT_TOLERANCE_PTS,
): AgreementSummary {
  const sorted = [...readings].sort((a, b) => (a.morning < b.morning ? -1 : a.morning > b.morning ? 1 : 0));
  const window = sorted.slice(-mornings);
  const agreeing = window.filter((r) => r.state === 'agree').length;
  const disagreeing = window.filter((r) => r.state === 'disagree').map((r) => r.morning);
  const absent = window.filter((r) => r.state === 'absent').map((r) => r.morning);
  const withBothLines = window.length - absent.length;

  let decision: Decision;
  let why: string;
  if (disagreeing.length > 0) {
    decision = 'HOLD';
    why = `${disagreeing.length} of ${window.length} mornings disagree (> ${tolerancePts} pts): ${disagreeing.join(', ')}`;
  } else if (window.length < mornings || withBothLines < mornings) {
    decision = 'INSUFFICIENT';
    const need = mornings - agreeing;
    why = `${agreeing} of ${mornings} required mornings agree (${withBothLines} with both lines, ${absent.length} absent in window, ${window.length} files); ${need} more agreeing morning${need === 1 ? '' : 's'} needed`;
  } else {
    decision = 'WIRE';
    why = `${agreeing}/${mornings} mornings agree within ±${tolerancePts} pts`;
  }
  return { tolerancePts, mornings, window, withBothLines, agreeing, disagreeing, absent, decision, why };
}

const fmtPct = (v: number | null, digits = 1) => (v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(digits)}%`);
const fmtPts = (v: number | null) => (v == null ? '—' : `${v.toFixed(1)} pt`);

/** Markdown: the rule, the table (oldest first), the verdict line. */
export function renderAgreementMd(s: AgreementSummary, generatedOn: string): string {
  const lines: string[] = [];
  lines.push(`# Guardrail sessions-line agreement — ${generatedOn} (E241)`);
  lines.push('');
  lines.push(decisionRule(s.mornings, s.tolerancePts));
  lines.push('');
  lines.push('| Morning | Judged day | Status | MV sessions Δ | GA4 raw Δ | Gap | Ex-segment Δ | Segment share | State |');
  lines.push('|---|---|---|--:|--:|--:|--:|--:|---|');
  for (const r of s.window) {
    const state = r.state === 'absent' && r.absentWhy ? `absent — ${r.absentWhy}` : r.state;
    lines.push(`| ${r.morning} | ${r.day ?? '—'} | ${r.status ?? '—'} | ${fmtPct(r.mvDeltaPct)} | ${fmtPct(r.ga4RawDeltaPct)} | ${fmtPts(r.gapPts)} | ${fmtPct(r.exSegmentDeltaPct)} | ${r.segmentSharePct == null ? '—' : `${r.segmentSharePct.toFixed(2)}%`} | ${state} |`);
  }
  lines.push('');
  lines.push(`**${s.decision}** — ${s.why}`);
  lines.push('');
  lines.push('Source: `reports/funnel/guardrail-<morning>.json` (`actualDay`/`expectedDay`.sessions = Mediavine; `sessionsExSegment` = GA4, E227). A missing JSON is a missed run, not a reading.');
  return lines.join('\n') + '\n';
}
