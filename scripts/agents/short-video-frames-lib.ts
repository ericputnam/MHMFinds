/**
 * short-video-frames-lib.ts — pure helpers for short-video-frames.ts (Pip, Traffic).
 *
 * Turns one short-video draft (reports/funnel/social/drafts/<date>/NN-short-video-*.md,
 * written by social-draft.ts) into a list of 1080×1920 slides: an optional hook slide,
 * one slide per credited mod (the creator's own preview image, mod name and "by
 * <creator>" on screen), and an end card with the destination and every creator.
 *
 * Every word on a slide comes from the draft, which a human (or the agent, by hand)
 * wrote and `social-draft.ts --lint` checked: the hook is the Copy section's
 * `Hook: "…"` line, and each mod slide's overlay is the n-th `Text: "…"` line. Nothing
 * here writes copy (growth-plan.md voice rule: "it can't look like AI wrote it").
 */

export const FRAME_WIDTH = 1080;
export const FRAME_HEIGHT = 1920;
/** Seconds per slide in the mp4 (TikTok photo mode and IG carousels use the PNGs). */
export const SECONDS_PER_SLIDE = 2.5;

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

export type Slide =
  | { kind: 'hook'; text: string }
  | { kind: 'mod'; mod: DraftMod; text: string | null }
  | { kind: 'end'; destination: string; creators: string[] };

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

export function buildSlides(d: ParsedDraft): Slide[] {
  const slides: Slide[] = [];
  if (d.hook) slides.push({ kind: 'hook', text: d.hook });
  d.mods.forEach((mod, i) => slides.push({ kind: 'mod', mod, text: d.texts[i] ?? null }));
  const creators = Array.from(new Set(d.mods.map((m) => m.creator)));
  slides.push({ kind: 'end', destination: displayDestination(d.targetUrl), creators });
  return slides;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

const BASE_CSS = `
*{margin:0;box-sizing:border-box}
html,body{width:${FRAME_WIDTH}px;height:${FRAME_HEIGHT}px;overflow:hidden;background:#141018;color:#fff;
  font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif}
.bg{position:absolute;inset:-60px;background-size:cover;background-position:center;filter:blur(40px) brightness(.45)}
.img{position:absolute;left:0;right:0;top:300px;height:1100px;background-size:contain;background-repeat:no-repeat;background-position:center}
.overlay{position:absolute;left:72px;right:72px;top:140px;font-size:68px;font-weight:800;line-height:1.12;
  text-shadow:0 4px 18px rgba(0,0,0,.7)}
.credit{position:absolute;left:72px;right:72px;bottom:250px}
.credit .t{font-size:56px;font-weight:800;line-height:1.1}
.credit .c{font-size:44px;font-weight:600;opacity:.9;margin-top:18px}
.center{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;padding:0 90px}
.hook{font-size:104px;font-weight:900;line-height:1.05}
.dest{font-size:64px;font-weight:800;color:#ff8fc8;word-break:break-word}
.by{font-size:42px;margin-top:48px;opacity:.85;line-height:1.35}
`;

/** One self-contained HTML document per slide; images load from the creator's own URL. */
export function slideHtml(slide: Slide): string {
  let body: string;
  if (slide.kind === 'hook') {
    body = `<div class="center"><div class="hook">${escapeHtml(slide.text)}</div></div>`;
  } else if (slide.kind === 'mod') {
    const img = escapeHtml(slide.mod.img);
    body =
      `<div class="bg" style="background-image:url('${img}')"></div>` +
      `<div class="img" style="background-image:url('${img}')"></div>` +
      (slide.text ? `<div class="overlay">${escapeHtml(slide.text)}</div>` : '') +
      `<div class="credit"><div class="t">${escapeHtml(slide.mod.title)}</div>` +
      `<div class="c">by ${escapeHtml(slide.mod.creator)}</div></div>`;
  } else {
    body =
      `<div class="center"><div class="dest">${escapeHtml(slide.destination)}</div>` +
      `<div class="by">Mods by ${slide.creators.map(escapeHtml).join(', ')}</div></div>`;
  }
  return `<!doctype html><html><head><meta charset="utf-8"><style>${BASE_CSS}</style></head><body>${body}</body></html>`;
}

/** Image URLs a slide needs, so the renderer can wait for them and report the ones that fail. */
export function slideImages(slide: Slide): string[] {
  return slide.kind === 'mod' ? [slide.mod.img] : [];
}

export function ffmpegArgs(framesDir: string, outFile: string): string[] {
  return [
    '-y', '-loglevel', 'error',
    '-framerate', `1/${SECONDS_PER_SLIDE}`, '-i', `${framesDir}/slide-%02d.png`,
    '-vf', `fps=30,scale=${FRAME_WIDTH}:${FRAME_HEIGHT},format=yuv420p`,
    '-c:v', 'libx264', '-movflags', '+faststart', outFile,
  ];
}
