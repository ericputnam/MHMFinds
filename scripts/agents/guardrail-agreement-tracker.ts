/**
 * E241 (2026-10-19, Rio) — guardrail sessions-line agreement tracker.
 *
 *   MHM_PROJECT_DIR=<worktree> npx tsx scripts/agents/guardrail-agreement-tracker.ts \
 *       [--mornings 7] [--tol 3] [--out <md path>] [--json <path>]
 *
 * Reads every `reports/funnel/guardrail-YYYY-MM-DD.json` under the project dir, takes the last
 * N mornings, and prints whether the Mediavine sessions delta and the GA4 raw sessions delta agreed
 * within ±tol pts on each — the pre-committed 10-24 gate for wiring the ex-Singapore-Direct ratio
 * into the guardrail's `red-traffic` leg (ideas-inbox, Rio 10-17). Read-only: writes nothing unless
 * `--out` / `--json` are passed.
 *
 * Exit codes: 0 = a verdict was printed (WIRE / HOLD / INSUFFICIENT are all verdicts);
 *             2 = could not run (no guardrail JSON found, unreadable dir). Never 1 — this tool
 *             cannot be "broken about the world", only unable to read it.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import {
  AGREEMENT_MORNINGS,
  AGREEMENT_TOLERANCE_PTS,
  morningFromFileName,
  readMorning,
  summarizeAgreement,
  renderAgreementMd,
  type MorningReading,
} from './guardrail-agreement-lib';

const PROJECT_DIR = process.env.MHM_PROJECT_DIR ?? resolve(__dirname, '..', '..');

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function main(): number {
  const mornings = Number(arg('mornings') ?? AGREEMENT_MORNINGS);
  const tol = Number(arg('tol') ?? AGREEMENT_TOLERANCE_PTS);
  const mdOut = arg('out');
  const jsonOut = arg('json');
  if (!Number.isInteger(mornings) || mornings < 1 || !Number.isFinite(tol) || tol < 0) {
    console.error('guardrail-agreement-tracker: --mornings must be a positive integer and --tol a non-negative number');
    return 2;
  }

  const dir = join(PROJECT_DIR, 'reports', 'funnel');
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch (e) {
    console.error(`guardrail-agreement-tracker: could not read ${dir}: ${(e as Error).message}`);
    return 2;
  }

  const readings: MorningReading[] = [];
  for (const name of names) {
    const morning = morningFromFileName(name);
    if (!morning) continue;
    let json: unknown;
    try {
      json = JSON.parse(readFileSync(join(dir, name), 'utf8'));
    } catch (e) {
      // An unreadable file is an absent reading with a reason, not a crash and not a number.
      readings.push({ ...readMorning(morning, null, tol), absentWhy: `unreadable JSON: ${(e as Error).message}` });
      continue;
    }
    readings.push(readMorning(morning, json, tol));
  }
  if (readings.length === 0) {
    console.error(`guardrail-agreement-tracker: no guardrail-YYYY-MM-DD.json under ${dir}`);
    return 2;
  }

  const summary = summarizeAgreement(readings, mornings, tol);
  const today = new Date().toISOString().slice(0, 10);
  const md = renderAgreementMd(summary, today);
  process.stdout.write(md);
  if (mdOut) { mkdirSync(dirname(mdOut), { recursive: true }); writeFileSync(mdOut, md); }
  if (jsonOut) { mkdirSync(dirname(jsonOut), { recursive: true }); writeFileSync(jsonOut, JSON.stringify({ generatedOn: today, projectDir: PROJECT_DIR, ...summary }, null, 2)); }
  return 0;
}

process.exit(main());
