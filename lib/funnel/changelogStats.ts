/**
 * Pure parsing/aggregation for reports/funnel/changelog.md, split out of
 * scripts/agents/funnel-scoreboard.ts so it's unit-testable without touching
 * the filesystem. The file is a pipe-delimited markdown table:
 *
 *   | when | mode | who / what | commit | deployment | result | notes |
 *
 * Rows are NOT chronological (documented in CLAUDE.md's compound learnings —
 * "changelog.md is now out of chronological order... so anything reading it
 * must sort, not assume append order"), so every function here sorts by the
 * parsed `when` timestamp rather than trusting file order.
 */

export interface ChangelogRow {
  when: string;
  whenMs: number | null;
  mode: string;
  who: string;
  commit: string;
  deployment: string;
  result: string;
  notes: string;
  /** First persona/word in the `who` column — before the first ':' and before a leading "for X" clause. */
  owner: string;
}

const HEADER_OR_SEPARATOR = /^\s*\|?\s*-{2,}\s*\|/;

/** Split one `| a | b | c |` row into trimmed cells, dropping the leading/trailing empty cells from the outer pipes. */
function splitRow(line: string): string[] {
  const trimmed = line.trim();
  const withoutOuter = trimmed.replace(/^\|/, '').replace(/\|$/, '');
  return withoutOuter.split('|').map((c) => c.trim());
}

/** First persona token from a "who/what" cell like "Quinn: PR #152 ..." or "operator-approved 3: ..." or "Rio for Cass: ...". */
export function extractOwner(who: string): string {
  const beforeColon = who.split(':')[0].trim();
  if (!beforeColon) return 'unknown';
  // "X for Y" -> the actor X did the work, even if it's on Y's behalf.
  const forMatch = beforeColon.match(/^(\S+)\s+for\s+/i);
  if (forMatch) return forMatch[1];
  // Otherwise the owner is the first whitespace-delimited token.
  return beforeColon.split(/\s+/)[0];
}

/**
 * A row is "paper-only" when it recorded something (a ledger row, a digest,
 * a report) without a production change — no commit/deployment landed.
 * Conservative by design: only rows with an empty/placeholder commit AND
 * deployment column, or explicit report/ledger/digest language, count.
 * Documented heuristic, not a guarantee — false negatives (missed paper-only
 * rows) are preferred over false positives (real merges undercounted).
 */
export function isPaperOnlyRow(row: Pick<ChangelogRow, 'mode' | 'commit' | 'deployment' | 'notes' | 'who'>): boolean {
  const blankish = (v: string) => !v || v === '-' || v === '—' || v.toLowerCase() === 'n/a';
  const hasNoArtifact = blankish(row.commit) && blankish(row.deployment);
  const text = `${row.mode} ${row.notes} ${row.who}`.toLowerCase();
  const mentionsPaper = /\b(ledger|digest|report)\b/.test(text);
  return hasNoArtifact && mentionsPaper;
}

/** Parse `when` into epoch ms for sorting; unparseable timestamps sort last (null). */
function parseWhenMs(when: string): number | null {
  const t = Date.parse(when);
  return Number.isNaN(t) ? null : t;
}

export function parseChangelogRows(raw: string): ChangelogRow[] {
  const rows: ChangelogRow[] = [];
  for (const line of raw.split('\n')) {
    if (!line.trim().startsWith('|')) continue;
    if (HEADER_OR_SEPARATOR.test(line)) continue;
    const cells = splitRow(line);
    if (cells.length < 7) continue;
    const [when, mode, who, commit, deployment, result, ...notesRest] = cells;
    if (when.toLowerCase() === 'when') continue; // header row without a separator line beneath it yet
    rows.push({
      when,
      whenMs: parseWhenMs(when),
      mode,
      who,
      commit,
      deployment,
      result,
      notes: notesRest.join(' | '),
      owner: extractOwner(who),
    });
  }
  return rows;
}

/** Rows sorted oldest -> newest by parsed `when`; unparseable timestamps sort to the end in file order. */
export function sortByWhen(rows: ChangelogRow[]): ChangelogRow[] {
  return [...rows].sort((a, b) => {
    if (a.whenMs == null && b.whenMs == null) return 0;
    if (a.whenMs == null) return 1;
    if (b.whenMs == null) return -1;
    return a.whenMs - b.whenMs;
  });
}

/** Rows whose `when` falls within the last `windowDays` ending at `nowMs` (inclusive). Unparseable rows are excluded, not guessed into the window. */
export function rowsInWindow(rows: ChangelogRow[], nowMs: number, windowDays: number): ChangelogRow[] {
  const cutoff = nowMs - windowDays * 24 * 60 * 60 * 1000;
  return rows.filter((r) => r.whenMs != null && r.whenMs >= cutoff && r.whenMs <= nowMs);
}

export interface TeamStats {
  mergesByOwner: Record<string, number>;
  totalMerges: number;
  opsMergeShare: number | null;
  paperOnlyMerges: number;
}

/** mode values counted as a real merge to main, per the runner's ship protocol (deploy-verify.sh's "after-merge" event, including its "(recheck)" variant). */
function isMergeMode(mode: string): boolean {
  return /after-merge/i.test(mode);
}

/**
 * Merge counts by owner over the window, the Ops share of those merges
 * (targets.json's autonomy doc caps Ops-authored merges at 20% — this
 * computes the share, the cap check belongs to the caller), and how many
 * merge-mode rows in the window were paper-only (a ledger/digest write with
 * no actual commit+deployment, still worth surfacing separately).
 */
export function computeTeamStats(rows: ChangelogRow[], nowMs: number, windowDays = 7): TeamStats {
  const windowRows = rowsInWindow(rows, nowMs, windowDays).filter((r) => isMergeMode(r.mode));
  const mergesByOwner: Record<string, number> = {};
  let paperOnlyMerges = 0;
  for (const r of windowRows) {
    if (isPaperOnlyRow(r)) {
      paperOnlyMerges++;
      continue; // a paper-only row is not a real merge; don't credit an owner with it
    }
    mergesByOwner[r.owner] = (mergesByOwner[r.owner] ?? 0) + 1;
  }
  const totalMerges = Object.values(mergesByOwner).reduce((s, n) => s + n, 0);
  const opsMerges = mergesByOwner['Ops'] ?? 0;
  const opsMergeShare = totalMerges > 0 ? opsMerges / totalMerges : null;
  return { mergesByOwner, totalMerges, opsMergeShare, paperOnlyMerges };
}

/**
 * Share of the last `windowDays` calendar days (as YYYY-MM-DD strings, UTC)
 * that have a corresponding entry in `datesWithRun` (e.g. a scoreboard+digest
 * file existing for that morning). Exact fraction; the caller rounds only for
 * display.
 */
export function computeRunSuccessShare(datesWithRun: Set<string>, todayIso: string, windowDays = 14): number {
  const today = new Date(`${todayIso}T00:00:00Z`).getTime();
  let hits = 0;
  for (let i = 1; i <= windowDays; i++) {
    const d = new Date(today - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    if (datesWithRun.has(d)) hits++;
  }
  return hits / windowDays;
}
