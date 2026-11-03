/**
 * short-video-frames-lib.ts — pure helpers for short-video-frames.ts (Pip, Traffic).
 *
 * Parses one short-video draft (reports/funnel/social/drafts/<date>/NN-short-video-*.md,
 * written by social-draft.ts) into the hook, the per-mod Text lines and the credited
 * mods (title, creator, mod page, creator's preview image). short-video-motion-lib.ts
 * turns that into the animated 1080×1920 composition.
 *
 * Every word on a slide comes from the draft, which a human (or the agent, by hand)
 * wrote and `social-draft.ts --lint` checked: the hook is the Copy section's
 * `Hook: "…"` line, and each mod slide's caption is the n-th `Text: "…"` line. Nothing
 * here writes copy (growth-plan.md voice rule: "it can't look like AI wrote it").
 */

export const FRAME_WIDTH = 1080;
export const FRAME_HEIGHT = 1920;

export interface DraftMod {
  title: string;
  creator: string;
  modUrl: string;
  img: string;
}

export interface ParsedDraft {
  platform: string;
  batch: string;
  targetUrl: string;
  hook: string | null;
  texts: string[];
  mods: DraftMod[];
}

function frontMatter(md: string, key: string): string {
  const m = md.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  return m ? m[1].trim() : '';
}

function section(md: string, heading: string): string {
  const start = md.indexOf(`## ${heading}\n`);
  if (start < 0) return '';
  const rest = md.slice(start + heading.length + 4);
  const next = rest.search(/^## /m);
  return next < 0 ? rest : rest.slice(0, next);
}

// "- Sims 4 Playable Pets Mod — by andrew · https://…/mods/x/ · img: https://…png"
const MOD_LINE_RE = /^- (.+?) — by (.+?) · (\S+) · img: (\S+)\s*$/;

export function parseDraft(md: string): ParsedDraft {
  const copy = section(md, 'Copy');
  const hook = copy.match(/^Hook:\s*"(.+)"\s*$/m);
  const texts = Array.from(copy.matchAll(/Text:\s*"([^"]+)"/g), (m) => m[1]);
  const seen = new Set<string>();
  const mods: DraftMod[] = [];
  for (const line of section(md, 'Mods and creators to credit').split('\n')) {
    const m = line.match(MOD_LINE_RE);
    if (!m || seen.has(m[1])) continue;
    seen.add(m[1]);
    mods.push({ title: m[1], creator: m[2], modUrl: m[3], img: m[4] });
  }
  return {
    platform: frontMatter(md, 'platform'),
    batch: frontMatter(md, 'batch'),
    targetUrl: frontMatter(md, 'target_url'),
    hook: hook ? hook[1] : null,
    texts,
    mods,
  };
}

/** "https://musthavemods.com/must-have-mods-sims-4/" → "musthavemods.com/must-have-mods-sims-4" */
export function displayDestination(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
