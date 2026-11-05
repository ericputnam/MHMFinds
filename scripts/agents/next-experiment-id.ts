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
 * E344 — a real reservation. Until 2026-11-05 this script only *read*, and every source it
 * read is on origin/main or in the caller's own worktree, so parallel agents in sibling
 * worktrees all saw the same max and printed the same id: on 11-04 E327 was claimed four
 * times and E329 three times, and 5 of 7 agents renumbered. Now the default mode RESERVES:
 * under a mkdir lock it computes max over (the sources above ∪ a host-wide reservation log
 * shared by every worktree ∪ open PR titles/bodies/branches ∪ remote branch names), appends
 * the id(s) it hands out to the log, and only then prints. Gaps are harmless; duplicates are
 * not — so an id that is reserved and never used is simply skipped forever.
 *
 * Usage: npx tsx scripts/agents/next-experiment-id.ts [--owner NAME] [--count N] [--json] [--verbose]
 *        npx tsx scripts/agents/next-experiment-id.ts --peek          (read-only, reserves nothing)
 *        npx tsx scripts/agents/next-experiment-id.ts --hold E336-E344 --owner Quinn
 *                                     (record ids handed out by hand, so the script skips them)
 * Env:   MHM_EXPERIMENT_RESERVATIONS — log path (default ~/.mhm-worktrees/.experiment-id-reservations.jsonl)
 *        MHM_EXPERIMENT_IDS_OFFLINE=1 — skip the gh / ls-remote legs (tests; the log still applies)
 * Exit: 0 printed a value · 1 could not run (lock not acquired, log unwritable, bad args)
 */
import fs from "fs";
import path from "path";
import os from "os";
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

// ---------------------------------------------------------------------------------------
// E344: sources outside origin/main, and the host-wide reservation log.
// ---------------------------------------------------------------------------------------

/** Ids in branch names: `funnel/ops/e344-foo`, `funnel/cass/E305_copy`. Bounded on both sides
 * by a separator so `release-2026` or a sha fragment never reads as an id. */
const BRANCH_ID_RE = /(?:^|[/_-])e(\d{1,4})(?=[/_-]|$)/gi;

export function extractBranchIds(names: string[], source: string): IdHit[] {
  const hits: IdHit[] = [];
  for (const name of names) {
    let m: RegExpExecArray | null;
    BRANCH_ID_RE.lastIndex = 0;
    while ((m = BRANCH_ID_RE.exec(name)) !== null) hits.push({ id: parseInt(m[1], 10), source });
  }
  return hits;
}

export type OpenPr = { number: number; title?: string; body?: string; headRefName?: string };

/** Pure: ids claimed by open PRs (title, body, head branch). An agent that pushed a PR from a
 * worktree this host cannot see still blocks its id. */
export function extractOpenPrIds(prs: OpenPr[]): IdHit[] {
  const hits: IdHit[] = [];
  for (const pr of prs) {
    const src = `open PR #${pr.number}`;
    hits.push(...extractIds(`${pr.title ?? ""}\n${pr.body ?? ""}`, src));
    if (pr.headRefName) hits.push(...extractBranchIds([pr.headRefName], src));
  }
  return hits;
}

export type RemoteLeg = { hits: IdHit[]; ok: boolean; note: string };

function readOpenPrIds(): RemoteLeg {
  try {
    const raw = execFileSync(
      "gh",
      ["pr", "list", "--state", "open", "--limit", "200", "--json", "number,title,body,headRefName"],
      { cwd: ROOT, encoding: "utf-8", timeout: 30_000, stdio: ["ignore", "pipe", "pipe"] }
    );
    const prs = JSON.parse(raw) as OpenPr[];
    return { hits: extractOpenPrIds(prs), ok: true, note: `${prs.length} open PR(s)` };
  } catch (err) {
    return { hits: [], ok: false, note: `gh pr list failed: ${err instanceof Error ? err.message.split("\n")[0] : String(err)}` };
  }
}

function readRemoteBranchIds(): RemoteLeg {
  try {
    const raw = execFileSync("git", ["ls-remote", "--heads", "origin"], {
      cwd: ROOT, encoding: "utf-8", timeout: 30_000, stdio: ["ignore", "pipe", "pipe"],
    });
    const names = raw.split("\n").map((l) => l.split("\t")[1] ?? "").filter(Boolean).map((r) => r.replace(/^refs\/heads\//, ""));
    return { hits: extractBranchIds(names, "git ls-remote origin"), ok: true, note: `${names.length} remote branch(es)` };
  } catch (err) {
    return { hits: [], ok: false, note: `git ls-remote failed: ${err instanceof Error ? err.message.split("\n")[0] : String(err)}` };
  }
}

export function defaultReservationsPath(): string {
  return process.env.MHM_EXPERIMENT_RESERVATIONS || path.join(os.homedir(), ".mhm-worktrees", ".experiment-id-reservations.jsonl");
}

export type Reservation = { id: number; owner: string; at: string; mode: "reserve" | "hold"; cwd?: string };

/** Tolerant reader: a torn or hand-edited line is skipped, never fatal — but its ids still
 * count, so a corrupt line can only push the ceiling up, never let an id be handed out twice. */
export function readReservations(file: string): { rows: Reservation[]; hits: IdHit[] } {
  let text = "";
  try {
    text = fs.readFileSync(file, "utf-8");
  } catch {
    return { rows: [], hits: [] };
  }
  const rows: Reservation[] = [];
  const hits: IdHit[] = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      const r = JSON.parse(line) as Reservation;
      if (Number.isInteger(r.id)) {
        rows.push(r);
        hits.push({ id: r.id, source: `reservation (${r.owner})` });
        continue;
      }
    } catch {
      /* fall through */
    }
    hits.push(...extractIds(line, "reservation (unparsed line)"));
  }
  return { rows, hits };
}

function sleepMs(ms: number) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/** mkdir is atomic on every local filesystem; a lock older than staleMs belongs to a dead
 * process (the critical section is a scan + one append, ~1–3 s) and is broken. */
export function withLock<T>(file: string, fn: () => T, opts: { waitMs?: number; staleMs?: number } = {}): T {
  const lockDir = `${file}.lock`;
  const waitMs = opts.waitMs ?? 60_000;
  const staleMs = opts.staleMs ?? 120_000;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const start = Date.now();
  for (;;) {
    try {
      fs.mkdirSync(lockDir);
      break;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
      try {
        if (Date.now() - fs.statSync(lockDir).mtimeMs > staleMs) {
          fs.rmdirSync(lockDir);
          continue;
        }
      } catch {
        continue; // released between our mkdir and stat
      }
      if (Date.now() - start > waitMs) throw new Error(`reservation lock ${lockDir} held > ${waitMs} ms`);
      sleepMs(50 + Math.floor(Math.random() * 100));
    }
  }
  try {
    return fn();
  } finally {
    try { fs.rmdirSync(lockDir); } catch { /* already gone */ }
  }
}

export type ReserveOpts = {
  file?: string;
  count?: number;
  owner?: string;
  hold?: number[];
  /** Injected for tests; defaults to findAllIds() + the gh / ls-remote legs. */
  sources?: () => IdHit[];
};

export type ReserveResult = NextIdResult & { ids: number[]; file: string; legs: string[] };

function defaultSources(legs: string[]): IdHit[] {
  const hits = findAllIds();
  if (process.env.MHM_EXPERIMENT_IDS_OFFLINE === "1") {
    legs.push("remote legs skipped (MHM_EXPERIMENT_IDS_OFFLINE=1)");
    return hits;
  }
  for (const leg of [readOpenPrIds(), readRemoteBranchIds()]) {
    legs.push(leg.ok ? leg.note : `UNKNOWN — ${leg.note} (reservation log still applies)`);
    hits.push(...leg.hits);
  }
  return hits;
}

/** Read-only: what the next reservation would hand out. */
export function peekExperimentId(opts: Omit<ReserveOpts, "count" | "owner" | "hold"> = {}): ReserveResult {
  const file = opts.file ?? defaultReservationsPath();
  const legs: string[] = [];
  const hits = [...(opts.sources ? opts.sources() : defaultSources(legs)), ...readReservations(file).hits];
  const r = pickNext(hits);
  return { ...r, ids: [r.next], file, legs };
}

/** Atomically hand out `count` ids (or record `hold` ids handed out by hand) in the shared log. */
export function reserveExperimentIds(opts: ReserveOpts = {}): ReserveResult {
  const file = opts.file ?? defaultReservationsPath();
  const count = opts.count ?? 1;
  const owner = opts.owner ?? process.env.FUNNEL_AGENT ?? "unknown";
  if (!Number.isInteger(count) || count < 1 || count > 50) throw new Error(`--count must be 1..50, got ${count}`);
  const legs: string[] = [];
  // Remote legs run outside the lock — they are slow (network) and only ever raise the floor.
  const external = opts.sources ? opts.sources() : defaultSources(legs);
  return withLock(file, () => {
    const hits = [...external, ...readReservations(file).hits];
    const r = pickNext(hits);
    const at = new Date().toISOString();
    let ids: number[];
    let mode: Reservation["mode"];
    if (opts.hold && opts.hold.length) {
      ids = [...opts.hold];
      mode = "hold";
    } else {
      ids = Array.from({ length: count }, (_, i) => r.next + i);
      mode = "reserve";
    }
    const lines = ids.map((id) => JSON.stringify({ id, owner, at, mode, cwd: process.cwd() } satisfies Reservation)).join("\n") + "\n";
    fs.appendFileSync(file, lines);
    return { ...r, ids, file, legs };
  });
}

export function parseHold(spec: string): number[] {
  const m = /^E?(\d{1,4})(?:-E?(\d{1,4}))?$/i.exec(spec.trim());
  if (!m) throw new Error(`--hold wants E<n> or E<a>-E<b>, got "${spec}"`);
  const a = parseInt(m[1], 10);
  const b = m[2] ? parseInt(m[2], 10) : a;
  if (b < a || b - a > 50) throw new Error(`--hold range ${spec} is empty or wider than 50`);
  return Array.from({ length: b - a + 1 }, (_, i) => a + i);
}

/** Read-only, offline view of origin/main + this worktree only (the pre-E344 behaviour). */
export function nextExperimentId(): NextIdResult {
  return pickNext(findAllIds());
}

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function main() {
  const jsonMode = process.argv.includes("--json");
  const verbose = process.argv.includes("--verbose");
  const peek = process.argv.includes("--peek");
  let result: ReserveResult;
  try {
    const holdSpec = argValue("--hold");
    const countArg = argValue("--count");
    result = peek
      ? peekExperimentId()
      : reserveExperimentIds({
          owner: argValue("--owner"),
          count: countArg ? parseInt(countArg, 10) : 1,
          hold: holdSpec ? parseHold(holdSpec) : undefined,
        });
  } catch (err) {
    console.error(`next-experiment-id: could not run — ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    if (verbose) {
      console.error(`next-experiment-id: scanned ${result.hitCount} id occurrence(s); highest is E${result.max} (${result.maxSource ?? "none found"})`);
      for (const l of result.legs) console.error(`next-experiment-id: ${l}`);
      console.error(`next-experiment-id: ${peek ? "peek (nothing reserved)" : `reserved in ${result.file}`}`);
    }
    console.log(result.ids.map((n) => `E${n}`).join("\n"));
  }
  process.exit(0);
}

if (require.main === module) {
  main();
}
