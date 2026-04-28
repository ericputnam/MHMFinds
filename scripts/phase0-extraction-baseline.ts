/**
 * Phase 0 — Extraction baseline summarizer.
 *
 * Reads one or more CSVs produced by the ExtractionLogger (see
 * `lib/services/scraperExtraction/extractionLogger.ts`) and prints a
 * summary report to stdout. No DB queries — purely CSV in, report out.
 *
 * Input CSV schema (produced by ExtractionLogger.toCsv()):
 *   timestamp,url,title,field,value,confidence,strategy
 *
 * Usage:
 *   npx tsx scripts/phase0-extraction-baseline.ts data/phase0-mhm-baseline.csv
 *   npx tsx scripts/phase0-extraction-baseline.ts 'data/phase0-*.csv'
 *   npx tsx scripts/phase0-extraction-baseline.ts data/mhm.csv data/wwm.csv
 *
 * Exits non-zero if zero matching CSVs were found or all were empty.
 */

import * as fs from 'fs';
import * as path from 'path';

type Row = {
  timestamp: string;
  url: string;
  title: string;
  field: string;
  value: string;
  confidence: string;
  strategy: string;
};

const HEADER_ORDER = [
  'timestamp',
  'url',
  'title',
  'field',
  'value',
  'confidence',
  'strategy',
] as const;

/**
 * Minimal RFC 4180 CSV parser — sufficient for the logger's output.
 * Handles quoted fields, doubled-quote escapes, CRLF, and embedded commas.
 */
function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  while (i < content.length) {
    const ch = content[i];

    if (inQuotes) {
      if (ch === '"') {
        if (content[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ',') {
      current.push(field);
      field = '';
      i++;
      continue;
    }
    if (ch === '\r') {
      i++;
      continue;
    }
    if (ch === '\n') {
      current.push(field);
      rows.push(current);
      current = [];
      field = '';
      i++;
      continue;
    }
    field += ch;
    i++;
  }

  // Flush trailing record (file may not end with newline).
  if (field.length > 0 || current.length > 0) {
    current.push(field);
    rows.push(current);
  }

  return rows;
}

/** Turn the header row into a { column -> index } map. */
function headerIndex(header: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  header.forEach((h, idx) => {
    map[h.trim()] = idx;
  });
  return map;
}

/** Load all rows from one CSV file. */
function loadCsv(filePath: string): Row[] {
  const abs = path.resolve(filePath);
  const content = fs.readFileSync(abs, 'utf8');
  const parsed = parseCsv(content);
  if (parsed.length === 0) return [];

  const header = parsed[0];
  const idx = headerIndex(header);
  // Verify all expected columns are present.
  for (const col of HEADER_ORDER) {
    if (idx[col] === undefined) {
      throw new Error(
        `CSV ${abs} is missing column "${col}". Found: ${header.join(', ')}`
      );
    }
  }

  const rows: Row[] = [];
  for (let r = 1; r < parsed.length; r++) {
    const raw = parsed[r];
    // Skip blank trailing rows.
    if (raw.length === 1 && raw[0] === '') continue;
    rows.push({
      timestamp: raw[idx.timestamp] ?? '',
      url: raw[idx.url] ?? '',
      title: raw[idx.title] ?? '',
      field: raw[idx.field] ?? '',
      value: raw[idx.value] ?? '',
      confidence: raw[idx.confidence] ?? '',
      strategy: raw[idx.strategy] ?? '',
    });
  }
  return rows;
}

/** Resolve CLI arguments into a list of existing CSV paths. */
function resolveInputs(args: string[]): string[] {
  const paths: string[] = [];
  for (const arg of args) {
    // Plain path (file or directory).
    if (!arg.includes('*') && !arg.includes('?')) {
      if (fs.existsSync(arg)) {
        const stat = fs.statSync(arg);
        if (stat.isDirectory()) {
          for (const f of fs.readdirSync(arg)) {
            if (f.endsWith('.csv')) paths.push(path.join(arg, f));
          }
        } else {
          paths.push(arg);
        }
      } else {
        console.warn(`⚠️  Skipping missing path: ${arg}`);
      }
      continue;
    }
    // Glob-ish pattern — expand within the directory portion.
    const dir = path.dirname(arg) || '.';
    const base = path.basename(arg);
    const regex = new RegExp(
      '^' +
        base
          .replace(/[.+^${}()|[\]\\]/g, '\\$&')
          .replace(/\*/g, '.*')
          .replace(/\?/g, '.') +
        '$'
    );
    if (!fs.existsSync(dir)) {
      console.warn(`⚠️  Skipping missing directory: ${dir}`);
      continue;
    }
    for (const f of fs.readdirSync(dir)) {
      if (regex.test(f)) paths.push(path.join(dir, f));
    }
  }
  // Dedup while preserving order.
  return Array.from(new Set(paths));
}

function pct(n: number, total: number): string {
  if (total === 0) return '0.0%';
  return `${((n / total) * 100).toFixed(1)}%`;
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error(
      'Usage: npx tsx scripts/phase0-extraction-baseline.ts <csv-or-glob> [more-csvs...]'
    );
    process.exit(1);
  }

  const inputs = resolveInputs(args);
  if (inputs.length === 0) {
    console.error('❌ No CSV files matched the given arguments.');
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log('📊 Phase 0 Extraction Baseline Report');
  console.log('='.repeat(60));
  console.log(`\nInputs (${inputs.length}):`);
  for (const p of inputs) console.log(`  - ${path.resolve(p)}`);

  const allRows: Row[] = [];
  for (const p of inputs) {
    try {
      const rows = loadCsv(p);
      allRows.push(...rows);
      console.log(`\n  ${p} → ${rows.length} events`);
    } catch (error) {
      console.error(`  ❌ Failed to read ${p}:`, error instanceof Error ? error.message : error);
    }
  }

  if (allRows.length === 0) {
    console.error('\n❌ All inputs were empty.');
    process.exit(1);
  }

  // Aggregate by field.
  const byField = new Map<
    string,
    { null: number; high: number; medium: number; low: number; nonNullNoConf: number }
  >();
  const strategyCounts = new Map<string, number>();
  const strategyByField = new Map<string, Map<string, number>>();

  for (const row of allRows) {
    const field = row.field || '(unknown)';
    if (!byField.has(field)) {
      byField.set(field, {
        null: 0,
        high: 0,
        medium: 0,
        low: 0,
        nonNullNoConf: 0,
      });
    }
    const bucket = byField.get(field)!;

    if (row.value === '' || row.value === 'null') {
      bucket.null += 1;
    } else {
      const conf = row.confidence.toLowerCase();
      if (conf === 'high') bucket.high += 1;
      else if (conf === 'medium') bucket.medium += 1;
      else if (conf === 'low') bucket.low += 1;
      else bucket.nonNullNoConf += 1;
    }

    const strat = row.strategy || '(unknown)';
    strategyCounts.set(strat, (strategyCounts.get(strat) ?? 0) + 1);

    if (!strategyByField.has(field)) strategyByField.set(field, new Map());
    const fieldStrats = strategyByField.get(field)!;
    fieldStrats.set(strat, (fieldStrats.get(strat) ?? 0) + 1);
  }

  console.log('\n' + '-'.repeat(60));
  console.log(`Total events: ${allRows.length}`);
  console.log('-'.repeat(60));

  for (const [field, b] of Array.from(byField.entries())) {
    const total = b.null + b.high + b.medium + b.low + b.nonNullNoConf;
    const nonNull = total - b.null;
    console.log(`\nField: ${field}  (events: ${total})`);
    console.log(`  null         : ${b.null} (${pct(b.null, total)})`);
    console.log(`  non-null     : ${nonNull} (${pct(nonNull, total)})`);
    console.log(`    high       : ${b.high} (${pct(b.high, total)})`);
    console.log(`    medium     : ${b.medium} (${pct(b.medium, total)})`);
    console.log(`    low        : ${b.low} (${pct(b.low, total)})`);
    if (b.nonNullNoConf > 0) {
      console.log(`    (no conf)  : ${b.nonNullNoConf} (${pct(b.nonNullNoConf, total)})`);
    }
  }

  console.log('\n' + '-'.repeat(60));
  console.log('Top 10 strategies overall');
  console.log('-'.repeat(60));
  const topStrategies = Array.from(strategyCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  for (const [strat, count] of topStrategies) {
    console.log(`  ${strat.padEnd(30)} ${String(count).padStart(6)}  ${pct(count, allRows.length)}`);
  }

  console.log('\n' + '-'.repeat(60));
  console.log('Top strategies per field');
  console.log('-'.repeat(60));
  for (const [field, stratMap] of Array.from(strategyByField.entries())) {
    console.log(`\n  ${field}:`);
    const fieldTotal = Array.from(stratMap.values()).reduce<number>((a, b) => a + b, 0);
    const topPerField = Array.from(stratMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    for (const [strat, count] of topPerField) {
      console.log(
        `    ${strat.padEnd(28)} ${String(count).padStart(6)}  ${pct(count, fieldTotal)}`
      );
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Report complete.');
  console.log('='.repeat(60));
}

main();
