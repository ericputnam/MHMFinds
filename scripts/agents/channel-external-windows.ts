/**
 * Known external events that make a GA4 channel's week-over-week read
 * non-comparable. The scoreboard prints a note under the Audience table when
 * either leg of the 7d-vs-prev-7d window overlaps one of these, so a
 * "−57% ai_referral" (or the mirror-image "+120%" a week later) is read with
 * its cause attached instead of dispatching a diagnosis.
 *
 * This is a measurement annotation only. It never changes the numbers.
 *
 * Add a row only with the evidence in the note: the source that moved, the
 * step dates, where the sessions went, and why it was not a site change.
 * Dates are inclusive, in the GA4 property's reporting timezone
 * (America/New_York), the same calendar the scoreboard windows use.
 */
export interface ChannelExternalWindow {
  channel: string;
  /** YYYY-MM-DD inclusive */
  start: string;
  /** YYYY-MM-DD inclusive */
  end: string;
  note: string;
}

export const CHANNEL_EXTERNAL_WINDOWS: readonly ChannelExternalWindow[] = [
  {
    channel: 'ai_referral',
    start: '2026-10-08',
    end: '2026-10-15',
    note:
      'OpenAI\'s "Intelligent UI" rollout stripped utm_source=chatgpt.com (and the referrer) from ChatGPT links ' +
      'from 10-08 18:30Z until 10-16 06:30Z; those visits landed in (direct). chatgpt.com sessions/day went ' +
      '42 (10-08) → 10–24 (10-09→10-14) → 29 (10-15) → 48 (10-16). Not a site change: /llms.txt, /robots.txt, ' +
      '/llms-full.txt and /mods/* returned 200 to GPTBot and ChatGPT-User throughout, no deploy landed ' +
      '10-07 07:47 → 10-11 11:09, and the medium stayed `ai-assistant` on both sides of the step (E224, Sage).',
  },
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Inclusive overlap of two YYYY-MM-DD ranges (lexical compare is safe for ISO dates). */
export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  if (![aStart, aEnd, bStart, bEnd].every((d) => DATE_RE.test(d))) return false;
  return aStart <= bEnd && bStart <= aEnd;
}

/**
 * Parses the scoreboard's GA4 window label, `${start}→${end} vs ${prevStart}→${prevEnd}`.
 * Returns null on any other shape so a changed label degrades to "no note", never a throw.
 */
export function parseWindowLabel(
  label: string,
): { start: string; end: string; prevStart: string; prevEnd: string } | null {
  const m = /^(\d{4}-\d{2}-\d{2})→(\d{4}-\d{2}-\d{2}) vs (\d{4}-\d{2}-\d{2})→(\d{4}-\d{2}-\d{2})$/.exec(label.trim());
  if (!m) return null;
  return { start: m[1], end: m[2], prevStart: m[3], prevEnd: m[4] };
}

/**
 * One line per (channel, external window) pair that touches the current or
 * previous 7d leg. Empty when nothing overlaps or the label cannot be parsed.
 */
export function externalWindowNotes(
  windowLabel: string,
  windows: readonly ChannelExternalWindow[] = CHANNEL_EXTERNAL_WINDOWS,
): string[] {
  const w = parseWindowLabel(windowLabel);
  if (!w) return [];
  const out: string[] = [];
  for (const x of windows) {
    const cur = rangesOverlap(w.start, w.end, x.start, x.end);
    const prev = rangesOverlap(w.prevStart, w.prevEnd, x.start, x.end);
    if (!cur && !prev) continue;
    const legs = cur && prev ? 'both 7d legs' : cur ? 'the current 7d' : 'the prev 7d';
    out.push(
      `⚠️ ${x.channel} WoW not comparable — ${legs} overlap a known external window ${x.start}→${x.end}: ${x.note}`,
    );
  }
  return out;
}
