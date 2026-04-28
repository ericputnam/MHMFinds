/**
 * ExtractionLogger — Phase 0 instrumentation for MHM + WWM scrapers.
 *
 * Accumulates `ExtractionEvent` records during a scraper run and can emit them
 * to stdout (JSON lines) + CSV. No DB writes, no external deps. A module-level
 * singleton is exported for convenience; callers can also construct their own
 * instance for tests.
 *
 * This logger is observation-only — it does NOT change extraction behavior.
 *
 * Environment variables:
 *   EXTRACTION_LOG_CSV   — if set, the logger will write its CSV to this path
 *                           when `flushToEnvTarget()` is called.
 *   EXTRACTION_LOG_JSONL — if set, the logger will write JSON Lines to this path.
 *
 * Usage:
 *   import { extractionLogger } from './extractionLogger';
 *
 *   extractionLogger.record({
 *     url: mod.sourceUrl,
 *     title: mod.title,
 *     field: 'contentType',
 *     value: detected,
 *     confidence: detected ? 'high' : null,
 *     strategy: detected ? 'url-pattern' : 'none',
 *   });
 *
 *   // At end of run:
 *   extractionLogger.flushToEnvTarget();
 *   console.log(extractionLogger.summary());
 */

import * as fs from 'fs';
import * as path from 'path';

export type ExtractionField = 'contentType' | 'author';
export type ExtractionConfidence = 'high' | 'medium' | 'low';

export type ExtractionEvent = {
  url: string;
  title: string;
  field: ExtractionField;
  value: string | null;
  confidence: ExtractionConfidence | null;
  strategy: string;
  timestamp: string;
};

export type ExtractionSummary = {
  total: number;
  byField: Record<string, { null: number; high: number; medium: number; low: number }>;
  topStrategies: { strategy: string; count: number }[];
};

const CSV_COLUMNS: (keyof ExtractionEvent)[] = [
  'timestamp',
  'url',
  'title',
  'field',
  'value',
  'confidence',
  'strategy',
];

/** Escape a value for CSV output per RFC 4180 (minimal). */
function csvEscape(input: unknown): string {
  if (input === null || input === undefined) return '';
  const str = String(input);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export class ExtractionLogger {
  private events: ExtractionEvent[] = [];

  /** Record a single extraction event. Timestamp is added automatically. */
  record(event: Omit<ExtractionEvent, 'timestamp'>): void {
    this.events.push({
      ...event,
      timestamp: new Date().toISOString(),
    });
  }

  /** All accumulated events (returns a copy). */
  getEvents(): ExtractionEvent[] {
    return [...this.events];
  }

  /** Clear all accumulated events. */
  reset(): void {
    this.events = [];
  }

  /** Count of events recorded. */
  get count(): number {
    return this.events.length;
  }

  /** Emit all events as JSON Lines (one event per line, trailing newline). */
  toJsonLines(): string {
    if (this.events.length === 0) return '';
    return this.events.map(e => JSON.stringify(e)).join('\n') + '\n';
  }

  /** Emit all events as CSV (with header row). */
  toCsv(): string {
    const header = CSV_COLUMNS.join(',');
    const rows = this.events.map(e =>
      CSV_COLUMNS.map(col => csvEscape(e[col])).join(',')
    );
    return [header, ...rows].join('\n') + '\n';
  }

  /** Summary stats — total events, per-field null/confidence buckets, top strategies. */
  summary(): ExtractionSummary {
    const byField: ExtractionSummary['byField'] = {};
    const strategyCounts = new Map<string, number>();

    for (const e of this.events) {
      if (!byField[e.field]) {
        byField[e.field] = { null: 0, high: 0, medium: 0, low: 0 };
      }
      if (e.value === null) {
        byField[e.field].null += 1;
      } else if (e.confidence) {
        byField[e.field][e.confidence] += 1;
      }
      // Also record a strategy count regardless of null/non-null outcome.
      strategyCounts.set(e.strategy, (strategyCounts.get(e.strategy) ?? 0) + 1);
    }

    const topStrategies = Array.from(strategyCounts.entries())
      .map(([strategy, count]) => ({ strategy, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      total: this.events.length,
      byField,
      topStrategies,
    };
  }

  /**
   * Write the CSV and/or JSONL to disk based on EXTRACTION_LOG_CSV and
   * EXTRACTION_LOG_JSONL env vars. Creates parent directories as needed.
   * Returns the list of written paths (may be empty).
   */
  flushToEnvTarget(): string[] {
    const written: string[] = [];
    const csvPath = process.env.EXTRACTION_LOG_CSV;
    const jsonlPath = process.env.EXTRACTION_LOG_JSONL;

    if (csvPath) {
      this.writeToFile(csvPath, this.toCsv());
      written.push(path.resolve(csvPath));
    }
    if (jsonlPath) {
      this.writeToFile(jsonlPath, this.toJsonLines());
      written.push(path.resolve(jsonlPath));
    }
    return written;
  }

  /** Write a string to disk, creating parent directories as needed. */
  writeToFile(filePath: string, contents: string): void {
    const abs = path.resolve(filePath);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, contents, 'utf8');
  }
}

/** Module-level singleton used by the scrapers. */
export const extractionLogger = new ExtractionLogger();
