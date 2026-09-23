/**
 * scripts/agents/next-experiment-id.ts — prints the next free experiment id (E<n>).
 *
 * Why: experiments.md rotates its older half into
 * .claude/agents/mhm-funnel/archive/experiments-YYYY-MM.md as it grows (the same pattern
 * CLAUDE.md's own compound-learnings section uses), so the highest E-number can live in the
 * archive rather than the live file — E81 was found in the September archive while the live
 * experiments.md topped out at E74. An agent picking its next experiment id by reading only
 * the live file can mint a duplicate. This scans every place an id could have been used:
 * the live experiments.md, every archived experiments-*.md, reports/funnel/**, and the
 * origin/main commit history (subject + body, PRs reference experiment ids in their titles),
 * and prints max+1.
 *
 * Usage: npx tsx scripts/agents/next-experiment-id.ts [--json] [--verbose]
 * Exit: 0 printed a value · 1 could not run (git log failed, no repo root)
 */
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { sync as globSync } from "glob";

export const ROOT = path.resolve(__dirname, "..", "..");

const ID_RE = /\bE(\d+)\b/g;

// A commit-message-only sanity cap: an experiment id embedded in a commit is never going to
// be a 5+ digit number (that's almost certainly a hash fragment, PR number typo, or an
// unrelated "E12345" in prose bleeding across a missing separator) — ignore matches with more
// than 4 digits so a corrupted git-log scrape can't invent a false ceiling like "E60023".
const MAX_PLAUSIBLE_DIGITS = 4;

export type IdHit = { id: number; source: string };

export function extractIds(text: string, source: string): IdHit[] {
  const hits: IdHit[] = [];
  let m: RegExpExecArray | null;
  ID_RE.lastIndex = 0;
  while ((m = ID_RE.exec(text)) !== null) {
    const digits = m[1];
    if (digits.length > MAX_PLAUSIBLE_DIGITS) continue;
    hits.push({ id: parseInt(digits, 10), source });
  }
  return hits;
}

function readFileIds(relPath: string): IdHit[] {
  const abs = path.join(ROOT, relPath);
  try {
    const text = fs.readFileSync(abs, "utf-8");
    return extractIds(text, relPath);
  } catch {
    return [];
  }
}

/**
 * Scans origin/main's commit subjects+bodies for experiment ids. Commits are joined with a
 * NUL byte (%x00) so that a missing separator between one commit's body and the next
 * commit's subject can never let digits bleed across the boundary and form a spurious id
 * (this actually happened during development: an unseparated git-log scrape produced a
 * phantom "E60023" from two adjacent commits' text concatenating with no delimiter).
 */
function readGitLogIds(): IdHit[] {
  try {
    const raw = execFileSync(
      "git",
      ["log", "origin/main", "--format=%s%n%b%x00"],
      { cwd: ROOT, encoding: "utf-8", maxBuffer: 64 * 1024 * 1024 }
    );
    return extractIds(raw, "git log origin/main");
  } catch {
    return [];
  }
}

export function findAllIds(): IdHit[] {
  const hits: IdHit[] = [];

  hits.push(...readFileIds(".claude/agents/mhm-funnel/experiments.md"));

  for (const f of globSync(".claude/agents/mhm-funnel/archive/**/*.md", { cwd: ROOT, nodir: true })) {
    hits.push(...readFileIds(f));
  }

  for (const f of globSync("reports/funnel/**/*.{md,json}", { cwd: ROOT, nodir: true })) {
    hits.push(...readFileIds(f));
  }

  hits.push(...readGitLogIds());

  return hits;
}

export type NextIdResult = { next: number; max: number; maxSource: string | null; hitCount: number };

/** Pure reducer over a list of hits — split out from nextExperimentId() so it can be unit
 * tested against fixture data without touching the real filesystem or shelling out to git. */
export function pickNext(hits: IdHit[]): NextIdResult {
  if (hits.length === 0) {
    return { next: 1, max: 0, maxSource: null, hitCount: 0 };
  }
  let best = hits[0];
  for (const h of hits) {
    if (h.id > best.id) best = h;
  }
  return { next: best.id + 1, max: best.id, maxSource: best.source, hitCount: hits.length };
}

export function nextExperimentId(): NextIdResult {
  return pickNext(findAllIds());
}

function main() {
  const jsonMode = process.argv.includes("--json");
  const verbose = process.argv.includes("--verbose");
  let result: ReturnType<typeof nextExperimentId>;
  try {
    result = nextExperimentId();
  } catch (err) {
    console.error(`next-experiment-id: could not run — ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
  } else if (verbose) {
    console.log(`next-experiment-id: scanned ${result.hitCount} id occurrence(s); highest is E${result.max} (${result.maxSource ?? "none found"})`);
    console.log(`E${result.next}`);
  } else {
    console.log(`E${result.next}`);
  }
  process.exit(0);
}

if (require.main === module) {
  main();
}
