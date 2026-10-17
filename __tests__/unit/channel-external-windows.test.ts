import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  CHANNEL_EXTERNAL_WINDOWS,
  externalWindowNotes,
  parseWindowLabel,
  rangesOverlap,
} from '../../scripts/agents/channel-external-windows';

const ROOT = join(__dirname, '..', '..');

describe('channel-external-windows', () => {
  it('registry rows are well-formed and dated', () => {
    expect(CHANNEL_EXTERNAL_WINDOWS.length).toBeGreaterThan(0);
    for (const w of CHANNEL_EXTERNAL_WINDOWS) {
      expect(w.start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(w.end).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(w.start <= w.end).toBe(true);
      expect(w.channel.length).toBeGreaterThan(0);
      // a note without a number is an opinion, not evidence
      expect(w.note).toMatch(/\d/);
    }
  });

  it('parses the scoreboard window label and rejects other shapes', () => {
    expect(parseWindowLabel('2026-10-09→2026-10-15 vs 2026-10-02→2026-10-08')).toEqual({
      start: '2026-10-09',
      end: '2026-10-15',
      prevStart: '2026-10-02',
      prevEnd: '2026-10-08',
    });
    expect(parseWindowLabel('')).toBeNull();
    expect(parseWindowLabel('2026-10-09 to 2026-10-15')).toBeNull();
  });

  it('inclusive overlap, and malformed dates never overlap', () => {
    expect(rangesOverlap('2026-10-09', '2026-10-15', '2026-10-15', '2026-10-20')).toBe(true);
    expect(rangesOverlap('2026-10-09', '2026-10-15', '2026-10-16', '2026-10-20')).toBe(false);
    expect(rangesOverlap('2026-10-09', '2026-10-15', 'bad', '2026-10-20')).toBe(false);
  });

  it('flags the 2026-10-17 scoreboard window on both legs (the read that triggered E224)', () => {
    const notes = externalWindowNotes('2026-10-09→2026-10-15 vs 2026-10-02→2026-10-08');
    expect(notes).toHaveLength(1);
    expect(notes[0]).toContain('ai_referral');
    expect(notes[0]).toContain('both 7d legs');
    expect(notes[0]).toContain('2026-10-08→2026-10-15');
  });

  it('flags the mirror-image read a week later on the prev leg only, then goes quiet', () => {
    const prevOnly = externalWindowNotes('2026-10-16→2026-10-22 vs 2026-10-09→2026-10-15');
    expect(prevOnly).toHaveLength(1);
    expect(prevOnly[0]).toContain('the prev 7d');
    expect(externalWindowNotes('2026-10-23→2026-10-29 vs 2026-10-16→2026-10-22')).toEqual([]);
  });

  it('never flags a channel with no registry row, and degrades to [] on an unparseable label', () => {
    const notes = externalWindowNotes('2026-10-09→2026-10-15 vs 2026-10-02→2026-10-08', [
      { channel: 'google_organic', start: '2020-01-01', end: '2020-01-02', note: '0' },
    ]);
    expect(notes).toEqual([]);
    expect(externalWindowNotes('unavailable')).toEqual([]);
  });

  it('the scoreboard renders the notes under the Audience table (source scan, comments stripped)', () => {
    const src = readFileSync(join(ROOT, 'scripts/agents/funnel-scoreboard.ts'), 'utf8')
      .split('\n')
      .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
      .join('\n');
    expect(src).toContain("from './channel-external-windows'");
    const audience = src.indexOf('## Audience (GA4');
    const search = src.indexOf('## Search (GSC');
    expect(audience).toBeGreaterThan(-1);
    expect(search).toBeGreaterThan(audience);
    expect(src.slice(audience, search)).toContain('externalWindowNotes(');
  });
});
