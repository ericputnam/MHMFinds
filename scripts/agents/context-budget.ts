/**
 * scripts/agents/context-budget.ts — SD-12: keep every doc a funnel agent reads under a
 * per-file byte budget, and every specialist's daily read-set under a combined cap.
 *
 * Why: CLAUDE.md's own compound-learnings section grew 45KB -> 206KB in two weeks and blew
 * up every funnel agent's context before it could start ("Prompt is too long", 2026-09-17).
 * The same failure mode can happen to any of the docs under .claude/agents/mhm-funnel/** —
 * experiments.md, operator-queue.md, the playbooks — since they are append-only logs that
 * every agent re-reads in full every day. This budget is the early-warning system: it is
 * WARN-only (exit 2), never a hard block, because a doc going over budget must not stop the
 * team from shipping — it must get trimmed, which is a job for the next run or the docs
 * agent, not a reason to halt today's loop.
 *
 * Usage: npx tsx scripts/agents/context-budget.ts [--json]
 * Exit: 0 everything in budget · 1 could not run (repo root not found, glob failed) ·
 *       2 WARN — one or more files/read-sets are over budget (never blocks a caller)
 */
import fs from "fs";
import path from "path";
// This repo pins glob@7 (no `globSync` export there — that's a glob@10+ API), so use the
// v7 `sync` function instead. If glob is ever upgraded, `.sync` still exists as a deprecated
// alias in v8/v9, but not in v10+ — re-check this import then.
import { sync as globSync } from "glob";

export const ROOT = path.resolve(__dirname, "..", "..");

// ---------------------------------------------------------------------------------------
// CONTEXT_BUDGET: path (relative to repo root) -> max bytes. A key ending in "/*" or "/**"
// is a glob applied under scripts/agents/context-budget.ts's own root and covers every file
// it matches with the same limit (used for the playbooks directory and the mhm-*.md agent
// roster, both of which grow by adding files, not by one file growing without bound).
// ---------------------------------------------------------------------------------------
export const CONTEXT_BUDGET: Record<string, number> = {
  ".claude/agents/mhm-funnel/charter.md": 16000,
  ".claude/agents/mhm-funnel/autonomy.md": 14000,
  ".claude/agents/mhm-funnel/operating-model.md": 10000,
  ".claude/agents/mhm-funnel/experiments.md": 24000,
  ".claude/agents/mhm-funnel/operator-queue.md": 16000,
  ".claude/agents/mhm-funnel/ideas-inbox.md": 10000,
  ".claude/agents/mhm-funnel/scorecard.md": 10000,
  ".claude/agents/mhm-funnel/playbooks/*.md": 10000,
  ".claude/agents/mhm-*.md": 8000,
  ".claude/agents/mhm-gm.md": 12000, // overrides the mhm-*.md glob above for this one file
  "scripts/agents/funnel-daily-prompt.md": 12000,
  "CLAUDE.md": 60000,
};

// Directories excluded from every glob in CONTEXT_BUDGET — archived/retired docs are not
// read by any live agent and should not be trimmed or flagged.
const IGNORED_DIR_PREFIXES = [
  ".claude/agents/mhm-funnel/archive/",
  ".claude/agents/retired/",
];

// ---------------------------------------------------------------------------------------
// READ_SET_BUDGET: the combined size of one specialist's daily reading — charter + autonomy
// + operating-model + experiments + that specialist's own .claude/agents/mhm-*.md file +
// that specialist's own playbook. This is what actually lands in the agent's context window,
// as opposed to any single file's budget above.
// ---------------------------------------------------------------------------------------
export const READ_SET_BUDGET = 90000;

// agentFile: the mhm-*.md agent definition this specialist reads (relative to repo root),
// or null if the file does not exist yet (e.g. rowan/ops before their agent-definition files
// are created — see the note in the header docstring of the funnel restructuring task).
export const SPECIALIST_READ_SETS: { name: string; agentFile: string; playbook: string }[] = [
  { name: "pip", agentFile: ".claude/agents/mhm-distribution.md", playbook: ".claude/agents/mhm-funnel/playbooks/pip.md" },
  { name: "sage", agentFile: ".claude/agents/mhm-search-ai.md", playbook: ".claude/agents/mhm-funnel/playbooks/sage.md" },
  { name: "nova", agentFile: ".claude/agents/mhm-content-creators.md", playbook: ".claude/agents/mhm-funnel/playbooks/nova.md" },
  { name: "cass", agentFile: ".claude/agents/mhm-capture.md", playbook: ".claude/agents/mhm-funnel/playbooks/cass.md" },
  { name: "rio", agentFile: ".claude/agents/mhm-product-revenue.md", playbook: ".claude/agents/mhm-funnel/playbooks/rio.md" },
  { name: "rowan", agentFile: ".claude/agents/mhm-catalog-product.md", playbook: ".claude/agents/mhm-funnel/playbooks/rowan.md" },
  { name: "ops", agentFile: ".claude/agents/mhm-platform-ops.md", playbook: ".claude/agents/mhm-funnel/playbooks/ops.md" },
];

const SHARED_READ_SET_FILES = [
  ".claude/agents/mhm-funnel/charter.md",
  ".claude/agents/mhm-funnel/autonomy.md",
  ".claude/agents/mhm-funnel/operating-model.md",
  ".claude/agents/mhm-funnel/experiments.md",
];

export type FileViolation = {
  kind: "file";
  file: string; // relative to repo root
  bytes: number;
  budget: number;
  budgetKey: string;
};

export type ReadSetViolation = {
  kind: "read-set";
  specialist: string;
  bytes: number;
  budget: number;
  missing: string[]; // files in the read-set that don't exist yet
};

export type BudgetResult = {
  fileViolations: FileViolation[];
  readSetViolations: ReadSetViolation[];
  filesChecked: number;
  readSetsChecked: number;
};

function isIgnored(relPath: string): boolean {
  return IGNORED_DIR_PREFIXES.some((prefix) => relPath.startsWith(prefix));
}

function sizeOf(relPath: string): number | null {
  const abs = path.join(ROOT, relPath);
  try {
    return fs.statSync(abs).size;
  } catch {
    return null;
  }
}

/** Resolve a CONTEXT_BUDGET key to the set of relative file paths it governs. */
function resolveKeyToFiles(key: string): string[] {
  if (key.includes("*")) {
    const matches = globSync(key, { cwd: ROOT, nodir: true });
    return matches.filter((m) => !isIgnored(m));
  }
  return isIgnored(key) ? [] : [key];
}

export function checkContextBudget(): BudgetResult {
  const fileViolations: FileViolation[] = [];
  let filesChecked = 0;

  // Sort keys so a more specific exact-path key (e.g. mhm-gm.md) is evaluated AFTER the
  // glob it overrides, and dedupe by resolved file path (last budget for a path wins) —
  // this lets mhm-gm.md's 12000 override the mhm-*.md glob's 8000 for that one file.
  const perFileBudget = new Map<string, { budget: number; budgetKey: string }>();
  for (const [key, budget] of Object.entries(CONTEXT_BUDGET)) {
    for (const f of resolveKeyToFiles(key)) {
      perFileBudget.set(f, { budget, budgetKey: key });
    }
  }

  // forEach rather than for..of: this repo's tsconfig targets es5 without downlevelIteration,
  // so iterating a Map with for..of fails to compile (TS2802) even though it runs fine at
  // runtime under tsx/node.
  perFileBudget.forEach(({ budget, budgetKey }, file) => {
    const bytes = sizeOf(file);
    if (bytes === null) return; // file doesn't exist yet — not this check's job to flag
    filesChecked++;
    if (bytes > budget) {
      fileViolations.push({ kind: "file", file, bytes, budget, budgetKey });
    }
  });

  const readSetViolations: ReadSetViolation[] = [];
  let readSetsChecked = 0;
  for (const spec of SPECIALIST_READ_SETS) {
    readSetsChecked++;
    const files = [...SHARED_READ_SET_FILES, spec.agentFile, spec.playbook];
    let total = 0;
    const missing: string[] = [];
    for (const f of files) {
      const bytes = sizeOf(f);
      if (bytes === null) {
        missing.push(f);
        continue;
      }
      total += bytes;
    }
    if (total > READ_SET_BUDGET) {
      readSetViolations.push({ kind: "read-set", specialist: spec.name, bytes: total, budget: READ_SET_BUDGET, missing });
    }
  }

  return { fileViolations, readSetViolations, filesChecked, readSetsChecked };
}

function main() {
  const jsonMode = process.argv.includes("--json");
  let result: BudgetResult;
  try {
    result = checkContextBudget();
  } catch (err) {
    console.error(`context-budget: could not run — ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`context-budget: checked ${result.filesChecked} file(s) and ${result.readSetsChecked} specialist read-set(s).`);
    for (const v of result.fileViolations) {
      console.log(`  OVER BUDGET  ${v.file}  ${v.bytes}B > ${v.budget}B  (rule: ${v.budgetKey})`);
    }
    for (const v of result.readSetViolations) {
      const missingNote = v.missing.length ? `  [missing: ${v.missing.join(", ")}]` : "";
      console.log(`  OVER BUDGET  read-set:${v.specialist}  ${v.bytes}B > ${v.budget}B${missingNote}`);
    }
    if (result.fileViolations.length === 0 && result.readSetViolations.length === 0) {
      console.log("context-budget: all in budget.");
    }
  }

  if (result.fileViolations.length > 0 || result.readSetViolations.length > 0) {
    process.exit(2); // WARN — never blocks the caller
  }
  process.exit(0);
}

if (require.main === module) {
  main();
}
