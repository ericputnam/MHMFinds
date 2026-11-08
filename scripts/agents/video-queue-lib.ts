/**
 * video-queue-lib.ts — pure helpers for the video queue jobs (docs/VIDEO_QUEUE.md).
 *
 * No I/O, no side effects on import: slots, link rules, captions, credits and the
 * pre-upload check. The CLI (video-queue.ts) does the network, database and file work.
 */
import { NSFW_PATH_RE, isOptedOut, normalizeCreator, voiceLint, type VoiceViolation } from './social-draft-lib';

// ---------------------------------------------------------------- slots

export const SLOT_TZ = 'America/New_York';
export const SLOT_HOUR = 16;
/** 1 = Monday … 5 = Friday (JS getUTCDay numbering). */
export const SLOT_WEEKDAYS: readonly number[] = [1, 3, 5];
export const SLOT_MIN_LEAD_HOURS = 20;

/** Minutes the zone is ahead of UTC at `at` (New York: -240 in summer, -300 in winter). */
export function tzOffsetMinutes(at: Date, tz: string = SLOT_TZ): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? '0');
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'));
  return Math.round((asUtc - Math.floor(at.getTime() / 1000) * 1000) / 60000);
}

/** Calendar date (y, m 1-12, d) in the zone at `at`. */
function zonedYmd(at: Date, tz: string): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? '0');
  return { y: get('year'), m: get('month'), d: get('day') };
}

/** UTC instant of local wall-clock `hour`:00 on y-m-d in `tz`. Hour 16 never falls in a DST gap. */
export function zonedTimeToUtc(y: number, m: number, d: number, hour: number, tz: string = SLOT_TZ): Date {
  const guess = Date.UTC(y, m - 1, d, hour, 0, 0);
  const off1 = tzOffsetMinutes(new Date(guess), tz);
  let utc = guess - off1 * 60000;
  const off2 = tzOffsetMinutes(new Date(utc), tz);
  if (off2 !== off1) utc = guess - off2 * 60000;
  return new Date(utc);
}

/**
 * The next `n` Mon/Wed/Fri 16:00 New York slots, as UTC ISO strings without milliseconds
 * ("2026-11-09T21:00:00Z"), at least SLOT_MIN_LEAD_HOURS after `now`, skipping `taken`.
 */
export function nextSlots(now: Date, taken: readonly string[] = [], n = 3): string[] {
  const takenMs = new Set<number>();
  for (const t of taken) {
    const ms = Date.parse(t);
    if (!isNaN(ms)) takenMs.add(ms);
  }
  const earliest = now.getTime() + SLOT_MIN_LEAD_HOURS * 3600_000;
  const start = zonedYmd(now, SLOT_TZ);
  const out: string[] = [];
  for (let i = 0; i < 120 && out.length < n; i++) {
    // Walk calendar days via a UTC noon anchor so DST never skips or repeats a day.
    const anchor = new Date(Date.UTC(start.y, start.m - 1, start.d + i, 12));
    if (SLOT_WEEKDAYS.indexOf(anchor.getUTCDay()) < 0) continue;
    const slot = zonedTimeToUtc(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, anchor.getUTCDate(), SLOT_HOUR);
    if (slot.getTime() < earliest || takenMs.has(slot.getTime())) continue;
    out.push(isoNoMs(slot));
  }
  return out;
}

export function isoNoMs(d: Date): string {
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/** YYYY-MM-DD of a UTC instant in New York (the campaign date of a slot). */
export function slotDate(slotIso: string): string {
  const { y, m, d } = zonedYmd(new Date(slotIso), SLOT_TZ);
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// ---------------------------------------------------------------- writer links

export type LinkClass =
  | { ok: true; kind: 'mod'; id: string; url: string }
  | { ok: true; kind: 'go'; id: string; url: string }
  | { ok: true; kind: 'page'; path: string; url: string }
  | { ok: false; url: string; reason: string };

const OUR_HOSTS = ['musthavemods.com', 'www.musthavemods.com', 'blog.musthavemods.com'];

/**
 * Writer links are suggestions. Only our own pages count; anything else is ignored and the
 * reason goes back on the idea. blog.* is accepted because it 301s to the apex.
 */
export function classifyLink(raw: string): LinkClass {
  const url = (raw ?? '').trim();
  let u: URL;
  try {
    u = new URL(/^[a-z]+:\/\//i.test(url) ? url : `https://${url}`);
  } catch {
    return { ok: false, url, reason: 'not a URL' };
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return { ok: false, url, reason: `unsupported scheme ${u.protocol}` };
  const host = u.hostname.toLowerCase();
  if (OUR_HOSTS.indexOf(host) < 0) return { ok: false, url, reason: `not a musthavemods.com page (${host})` };
  let path = u.pathname.replace(/\/{2,}/g, '/');
  if (!path.endsWith('/')) path += '/';
  if (NSFW_PATH_RE.test(path)) return { ok: false, url, reason: 'adult/NSFW page — never used in videos' };
  const seg = path.split('/').filter(Boolean);
  if (seg[0] === 'mods' && seg[1]) return { ok: true, kind: 'mod', id: decodeURIComponent(seg[1]), url };
  if (seg[0] === 'go' && seg[1]) return { ok: true, kind: 'go', id: decodeURIComponent(seg[1]), url };
  return { ok: true, kind: 'page', path, url };
}

/** Pulls http(s) links out of free text (one idea's "links" box can hold anything). */
export function extractLinks(text: string): string[] {
  const out: string[] = [];
  const re = /\bhttps?:\/\/[^\s<>"')\]]+|\b(?:www\.|blog\.)?musthavemods\.com\/[^\s<>"')\]]*/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text ?? ''))) {
    const link = m[0].replace(/[.,;:!?]+$/, '');
    if (out.indexOf(link) < 0) out.push(link);
  }
  return out;
}

// ---------------------------------------------------------------- credits

export interface CreatorHandle {
  creator: string;
  tiktok: string | null;
  youtube: string | null;
  confirmed_from: string;
  date: string;
}

export interface CreatorHandlesFile {
  creators: CreatorHandle[];
}

export interface Credit {
  creator: string;
  tiktok: string | null;
  youtube: string | null;
}

export interface SceneInput {
  mod: string;
  creator: string;
  text?: string | null;
  mod_url?: string | null;
  nsfw?: boolean;
}

function validHandle(h: string | null | undefined): string | null {
  const v = (h ?? '').trim();
  return /^@[A-Za-z0-9._-]{2,30}$/.test(v) ? v : null;
}

/**
 * One credit per distinct creator, in scene order. A handle is only used when it is in the
 * confirmed-handles file (docs/SHORT_VIDEO_RUNBOOK.md "Tagging creators"); an opted-out
 * creator is never tagged.
 */
export function creditsFor(scenes: readonly SceneInput[], handles: CreatorHandlesFile | null, optout: Set<string>): Credit[] {
  const byName: Record<string, CreatorHandle> = {};
  for (const h of handles?.creators ?? []) byName[normalizeCreator(h.creator)] = h;
  const seen: Record<string, true> = {};
  const out: Credit[] = [];
  for (const s of scenes) {
    const key = normalizeCreator(s.creator);
    if (!key || seen[key]) continue;
    seen[key] = true;
    const h = byName[key];
    const tag = !!h && !isOptedOut(s.creator, optout);
    out.push({ creator: s.creator.trim(), tiktok: tag ? validHandle(h.tiktok) : null, youtube: tag ? validHandle(h.youtube) : null });
  }
  return out;
}

// ---------------------------------------------------------------- captions

export const DEFAULT_HASHTAGS: readonly string[] = ['#sims4', '#sims4cc', '#ts4cc'];
const HASHTAG_TOKEN_RE = /(^|\s)(#[A-Za-z0-9_]+)/g;

/** Hook as plain text: `*word*` emphasis markers removed, whitespace collapsed. */
export function plainHook(hook: string): string {
  return (hook ?? '').replace(/\*([^*]+)\*/g, '$1').replace(/\*/g, '').replace(/\s+/g, ' ').trim();
}

/** Splits trailing/inline hashtags off the caption sentences. */
export function splitHashtags(text: string): { body: string; hashtags: string[] } {
  const tags: string[] = [];
  const body = (text ?? '')
    .replace(HASHTAG_TOKEN_RE, (_all, lead: string, tag: string) => {
      if (tags.indexOf(tag.toLowerCase()) < 0) tags.push(tag.toLowerCase());
      return lead;
    })
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\s+$/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
  return { body, hashtags: tags };
}

function stripQuery(url: string): string {
  return url.split('#')[0].split('?')[0];
}

/** "https://musthavemods.com/black-sims-4-cc/" → "musthavemods.com/black-sims-4-cc" */
export function plainDestination(url: string): string {
  return stripQuery(url).replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
}

export function youtubeLink(targetUrl: string, date: string): string {
  return `${stripQuery(targetUrl)}?utm_source=youtube&utm_medium=social&utm_campaign=short-${date}`;
}

export interface Captions {
  youtube_title: string;
  youtube_description: string;
  tiktok: string;
}

export interface CaptionInput {
  hook: string;
  /** The draft's "Caption:" block; hashtags in it are moved to the hashtag line. */
  captionSentences: string;
  targetUrl: string;
  /** Campaign date, YYYY-MM-DD (the slot's New York date). */
  date: string;
  scenes: readonly SceneInput[];
  handles: CreatorHandlesFile | null;
  optout?: Set<string>;
}

export interface CaptionResult {
  captions: Captions;
  credits: Credit[];
  lint: Array<VoiceViolation & { field: keyof Captions | 'caption' }>;
}

/** The three captions in exactly the runbook formats ("How to post: YouTube" / "TikTok"). */
export function buildCaptions(input: CaptionInput): CaptionResult {
  const optout = input.optout ?? new Set<string>();
  const { body, hashtags } = splitHashtags(input.captionSentences);
  const tags = (hashtags.length ? hashtags : DEFAULT_HASHTAGS.slice()).slice(0, 3).join(' ');
  const credits = creditsFor(input.scenes, input.handles, optout);
  const youtubeOf: Record<string, string | null> = {};
  for (const c of credits) youtubeOf[normalizeCreator(c.creator)] = c.youtube;

  const seenMods: Record<string, true> = {};
  const ytCredits: string[] = [];
  for (const s of input.scenes) {
    const line = `${s.mod.trim()} by ${s.creator.trim()}`;
    if (seenMods[line]) continue;
    seenMods[line] = true;
    const yt = youtubeOf[normalizeCreator(s.creator)];
    ytCredits.push(yt ? `${line} (${yt})` : line);
  }

  const title = `${plainHook(input.hook)} #shorts`;
  const description = [
    body,
    '',
    `Full list + downloads: ${youtubeLink(input.targetUrl, input.date)}`,
    '',
    'Credits:',
    ...ytCredits,
    '',
    tags,
  ].join('\n');
  const tiktok = [
    body,
    '',
    `Full list + downloads: ${plainDestination(input.targetUrl)}`,
    '',
    `Credits: ${credits.map((c) => c.tiktok ?? c.creator).join(', ')}`,
    '',
    tags,
  ].join('\n');

  const lint: CaptionResult['lint'] = [];
  for (const v of voiceLint(`${body}\n\n${tags}`)) lint.push({ ...v, field: 'caption' });
  for (const v of voiceLint(title)) lint.push({ ...v, field: 'youtube_title' });
  if (title.length > 100) lint.push({ rule: 'title-length', detail: `${title.length} chars (YouTube max 100)`, field: 'youtube_title' });
  if (tiktok.length > 2200) lint.push({ rule: 'caption-length', detail: `${tiktok.length} chars (TikTok max 2200)`, field: 'tiktok' });
  if (description.length > 5000) lint.push({ rule: 'description-length', detail: `${description.length} chars (YouTube max 5000)`, field: 'youtube_description' });

  return { captions: { youtube_title: title, youtube_description: description, tiktok }, credits, lint };
}

/** The "Caption:" block of a draft's Copy section (everything after the "Caption:" line). */
/**
 * A revision changed the mods but the reviewer's caption edits are kept: swap in the new credits and
 * leave everything else she wrote alone. YouTube: the "Credits:" block (up to the next blank line).
 * TikTok: the "Credits: …" line. If her text has no credits section, the new one is appended.
 */
export function mergeCredits(kept: Captions, fresh: Captions): Captions {
  const ytBlock = (t: string): string[] | null => {
    const lines = t.split('\n');
    const i = lines.findIndex((l) => /^credits:\s*$/i.test(l.trim()));
    if (i < 0) return null;
    let j = i + 1;
    while (j < lines.length && lines[j].trim() !== '') j++;
    return lines.slice(i, j);
  };
  const freshYt = ytBlock(fresh.youtube_description) ?? [];
  let desc = kept.youtube_description;
  const keptLines = desc.split('\n');
  const ki = keptLines.findIndex((l) => /^credits:\s*$/i.test(l.trim()));
  if (ki >= 0) {
    let kj = ki + 1;
    while (kj < keptLines.length && keptLines[kj].trim() !== '') kj++;
    desc = [...keptLines.slice(0, ki), ...freshYt, ...keptLines.slice(kj)].join('\n');
  } else if (freshYt.length) {
    desc = `${desc.replace(/\s+$/, '')}\n\n${freshYt.join('\n')}`;
  }
  const freshTk = fresh.tiktok.split('\n').find((l) => /^credits:/i.test(l.trim()));
  let tiktok = kept.tiktok;
  if (freshTk) {
    const tl = tiktok.split('\n');
    const ti = tl.findIndex((l) => /^credits:/i.test(l.trim()));
    if (ti >= 0) tl[ti] = freshTk;
    else tl.push('', freshTk);
    tiktok = tl.join('\n');
  }
  return { youtube_title: kept.youtube_title, youtube_description: desc, tiktok };
}

/** True when two scene lists credit different mods or creators (order-insensitive). */
export function creditsChanged(a: ReadonlyArray<{ mod: string; creator: string }>, b: ReadonlyArray<{ mod: string; creator: string }>): boolean {
  const key = (xs: ReadonlyArray<{ mod: string; creator: string }>) =>
    xs.map((x) => `${x.mod.trim().toLowerCase()}|${x.creator.trim().toLowerCase()}`).sort().join('\n');
  return key(a) !== key(b);
}

export function parseCaptionBlock(md: string): string {
  const start = md.indexOf('## Copy\n');
  if (start < 0) return '';
  const rest = md.slice(start + 8);
  const next = rest.search(/^## /m);
  const copy = next < 0 ? rest : rest.slice(0, next);
  const m = copy.match(/^Caption:[ \t]*(.*)$/m);
  if (!m || m.index === undefined) return '';
  const after = copy.slice(m.index + m[0].length);
  const block = `${m[1]}${after}`.trim();
  // Tolerate a caption written in quotes, like the Hook/Text lines.
  const q = block.match(/^"([\s\S]*)"$/);
  return (q ? q[1] : block).trim();
}

// ---------------------------------------------------------------- pre-upload check

export interface VideoMeta {
  durationS: number | null;
  width: number | null;
  height: number | null;
  hook: string | null;
  targetUrl: string;
  scenes: readonly SceneInput[];
  captions: Captions | null;
  /** Images the renderer reported as not loaded (README.txt). */
  failedImages?: readonly string[];
  optout?: Set<string>;
}

export const MIN_DURATION_S = 10;
export const MAX_DURATION_S = 60;
export const MIN_SCENES = 4;
export const MAX_SCENES = 8;

/**
 * Author values that are a file host, a site or scraper debris, not a person. The catalog has
 * some (see docs/PRD-author-data-cleanup.md); crediting one breaks the "every creator credited"
 * rule, so the scene has to go.
 */
const NOT_A_CREATOR_RE =
  /^(?:sim\s*file\s*share|simfileshare|updated?\s*file|download(?:s)?|patreon|curseforge|tumblr|the\s*sims\s*resource|tsr|mediafire|google\s*drive|dropbox|title|shref|href|id|unknown|n\/?a|none|null|undefined|admin|link|here|free|new|cc)$/i;

export function isPlaceholderCreator(name: string | null | undefined): boolean {
  const t = (name ?? '').trim();
  return !t || NOT_A_CREATOR_RE.test(t) || /^https?:\/\//i.test(t);
}

/** Every reason this video must not go to the reviewer. [] = ready to upload. */
export function checkVideo(meta: VideoMeta): string[] {
  const p: string[] = [];
  const optout = meta.optout ?? new Set<string>();
  if (meta.durationS === null || !isFinite(meta.durationS)) p.push('no video duration (was video.mp4 rendered?)');
  else if (meta.durationS < MIN_DURATION_S || meta.durationS > MAX_DURATION_S)
    p.push(`duration ${meta.durationS.toFixed(1)} s outside ${MIN_DURATION_S}–${MAX_DURATION_S} s`);
  if (meta.width !== 1080 || meta.height !== 1920) p.push(`frame ${meta.width ?? '?'}×${meta.height ?? '?'} is not 1080×1920`);
  if (!meta.hook || !plainHook(meta.hook)) p.push('no hook');
  if (meta.scenes.length < MIN_SCENES || meta.scenes.length > MAX_SCENES)
    p.push(`${meta.scenes.length} mod scenes (need ${MIN_SCENES}–${MAX_SCENES})`);
  meta.scenes.forEach((s, i) => {
    const n = i + 1;
    if (!s.creator || !s.creator.trim()) p.push(`scene ${n} (${s.mod}) has no creator credit`);
    else if (isPlaceholderCreator(s.creator)) p.push(`scene ${n} (${s.mod}) credits "${s.creator}", which is not a creator name`);
    if (!s.text || !s.text.trim()) p.push(`scene ${n} (${s.mod}) has no on-screen text`);
    if (s.nsfw) p.push(`scene ${n} (${s.mod}) is an NSFW mod`);
    if (NSFW_PATH_RE.test(s.mod) || (s.mod_url && NSFW_PATH_RE.test(s.mod_url))) p.push(`scene ${n} (${s.mod}) looks adult/NSFW`);
    if (isOptedOut(s.creator, optout)) p.push(`scene ${n}: ${s.creator} opted out of MHM social`);
  });
  if (NSFW_PATH_RE.test(meta.targetUrl)) p.push('target URL is an adult/NSFW page');
  if (!/^https:\/\/musthavemods\.com\//.test(meta.targetUrl)) p.push(`target URL ${meta.targetUrl || '(none)'} is not a musthavemods.com page`);
  for (const f of meta.failedImages ?? []) p.push(`image did not load: ${f}`);
  const onScreen = [meta.hook ?? '', ...meta.scenes.map((s) => s.text ?? '')].join('\n');
  for (const v of voiceLint(onScreen)) if (v.rule !== 'hashtag-stack') p.push(`on-screen copy: ${v.rule} (${v.detail})`);
  if (!meta.captions) p.push('no captions');
  else {
    for (const [field, text] of [
      ['youtube_title', meta.captions.youtube_title],
      ['youtube_description', meta.captions.youtube_description],
      ['tiktok', meta.captions.tiktok],
    ] as const) {
      if (!text || !text.trim()) p.push(`${field} is empty`);
      for (const v of voiceLint(text ?? '')) if (v.rule === 'banned-phrase' || v.rule === 'hashtag-stack') p.push(`${field}: ${v.rule} (${v.detail})`);
    }
  }
  return p;
}

/** Parses the "IMAGES THAT DID NOT LOAD" list out of a render README.txt. */
export function failedImagesFromReadme(readme: string): string[] {
  const i = (readme ?? '').indexOf('IMAGES THAT DID NOT LOAD');
  if (i < 0) return [];
  const out: string[] = [];
  for (const line of readme.slice(i).split('\n').slice(1)) {
    const t = line.trim();
    if (!/^https?:\/\//.test(t)) break;
    out.push(t);
  }
  return out;
}
