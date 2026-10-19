/**
 * scripts/agents/conflict-markers.ts — E243: find git conflict-marker lines in the funnel
 * registry (.claude/agents/mhm-funnel/**, archive/ and playbooks/ included).
 *
 * Why: #330 (10-18) landed 12 marker lines in 3 registry files on `main` after its fourth
 * rebase; build, type-check and every test passed because none of them read `.md`. Fixed
 * forward by #337. `__tests__/unit/funnel-context-budget.test.ts` now runs this scan, so a
 * marker fails the paper PR's own gate.
 *
 * Only line-anchored markers count — exactly what git writes:
 *   `<<<<<<< <ref>`, `||||||| <ref>` (diff3), `=======` alone on the line, `>>>>>>> <ref>`.
 * Prose that *mentions* a marker mid-line (the inbox item, the experiments row) does not
 * match, and neither does a longer `==========` rule or setext underline.
 *
 * Usage: npx tsx scripts/agents/conflict-markers.ts [dir]   (default: the registry under ROOT)
 * Exit: 0 clean · 1 markers found · 2 could not run (dir missing / unreadable)
 */
import fs from "fs";
import path from "path";

export const REGISTRY_DIR = path.join(path.resolve(__dirname, "..", ".."), ".claude", "agents", "mhm-funnel");

export const CONFLICT_MARKER_RE = /^(?:<{7} |\|{7} |={7}$|>{7} )/;

export type MarkerHit = { file: string; line: number; text: string };

/** Line-anchored marker lines in one text. CRLF-safe. 1-based line numbers. */
export function findConflictMarkers(text: string): { line: number; text: string }[] {
  const hits: { line: number; text: string }[] = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].replace(/\r$/, "");
    if (CONFLICT_MARKER_RE.test(l)) hits.push({ line: i + 1, text: l });
  }
  return hits;
}

/** Walk every regular file under `dir` (no hand-maintained list). Paths relative to `dir`. */
export function walkFiles(dir: string): string[] {
  const out: string[] = [];
  const visit = (abs: string) => {
    for (const ent of fs.readdirSync(abs, { withFileTypes: true })) {
      const p = path.join(abs, ent.name);
      if (ent.isDirectory()) visit(p);
      else if (ent.isFile()) out.push(path.relative(dir, p));
    }
  };
  visit(dir);
  return out.sort();
}

export function scanConflictMarkers(dir: string = REGISTRY_DIR): { filesScanned: string[]; hits: MarkerHit[] } {
  const filesScanned = walkFiles(dir);
  const hits: MarkerHit[] = [];
  for (const rel of filesScanned) {
    const text = fs.readFileSync(path.join(dir, rel), "utf8");
    for (const h of findConflictMarkers(text)) hits.push({ file: rel, ...h });
  }
  return { filesScanned, hits };
}

function main() {
  const dir = path.resolve(process.argv[2] ?? REGISTRY_DIR);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    console.error(`conflict-markers: could not run — not a directory: ${dir}`);
    process.exit(2);
  }
  const { filesScanned, hits } = scanConflictMarkers(dir);
  for (const h of hits) console.log(`${h.file}:${h.line}: ${h.text}`);
  const files = new Set(hits.map((h) => h.file)).size;
  console.log(`conflict-markers: ${hits.length} marker line(s) in ${files} file(s); ${filesScanned.length} files scanned`);
  process.exit(hits.length > 0 ? 1 : 0);
}

if (require.main === module) main();
