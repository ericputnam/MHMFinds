#!/usr/bin/env npx tsx
/**
 * short-video-frames.ts — render a short-video draft into a postable vertical video (Pip, Traffic).
 *
 * WHAT IT DOES
 *   For each short-video draft in reports/funnel/social/drafts/<date>/ (or one --file),
 *   builds the animated composition in short-video-motion-lib.ts (kinetic hook, one
 *   whip-in card per credited mod, end card with the destination and every creator),
 *   steps it frame by frame in headless Chromium and pipes the frames into ffmpeg:
 *     video.mp4         1080×1920 30 fps H.264 with our synthesized sound design
 *     video-silent.mp4  same picture, no audio — use this one to add a trending sound in-app
 *     cover.jpg         the cover frame (TikTok/Reels cover picker)
 *     slide-NN.png      one still per scene for TikTok photo mode / an Instagram carousel
 *   Output: reports/funnel/social/assets/<date>/<draft>/ (gitignored). Without ffmpeg on
 *   PATH only the stills and cover are written.
 *
 * WHAT IT NEVER DOES
 *   Post, or write copy. Every word comes from the draft (see short-video-motion-lib.ts).
 *   Posting stays the operator's until the channel's approval window ends (growth-plan.md).
 *
 * USAGE
 *   npx tsx scripts/agents/short-video-frames.ts --date YYYY-MM-DD [--file NN-short-video-x.md] [--stills-only]
 *
 * Exit codes: 0 ok · 1 error · 2 nothing to render.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

import { chromium, type Page } from 'playwright';

import { FRAME_HEIGHT, FRAME_WIDTH, parseDraft } from './short-video-frames-lib';
import {
  FPS,
  type Timeline,
  buildTimeline,
  compositionHtml,
  coverTime,
  encodeArgs,
  frameCount,
  sfxWav,
  stillTimes,
} from './short-video-motion-lib';

const ROOT = resolve(__dirname, '..', '..');

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}

function hasFfmpeg(): boolean {
  return spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;
}

async function seek(page: Page, t: number): Promise<void> {
  await page.evaluate((x) => (window as unknown as { __seek: (t: number) => void }).__seek(x), t);
}

/** Steps the timeline at FPS and streams JPEG frames into ffmpeg's stdin. */
async function encode(page: Page, tl: Timeline, out: string): Promise<string | null> {
  const ff = spawn('ffmpeg', encodeArgs({ fps: FPS, audio: null, out }), { stdio: ['pipe', 'ignore', 'pipe'] });
  let stderr = '';
  ff.stderr.on('data', (b) => (stderr += b));
  const closed = new Promise<number>((done) => ff.on('close', (code) => done(code ?? 1)));
  const n = frameCount(tl);
  for (let f = 0; f < n; f++) {
    await seek(page, f / FPS);
    const jpg = await page.screenshot({ type: 'jpeg', quality: 92 });
    if (!ff.stdin.write(jpg)) await new Promise((r) => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  return (await closed) === 0 ? null : stderr.trim().slice(0, 300) || 'ffmpeg failed';
}

async function main(): Promise<number> {
  const date = arg('date');
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('--date YYYY-MM-DD is required');
  const draftsDir = join(ROOT, 'reports', 'funnel', 'social', 'drafts', date);
  if (!existsSync(draftsDir)) throw new Error(`no draft batch at ${draftsDir}`);
  const only = arg('file');
  const files = readdirSync(draftsDir)
    .filter((f) => /^\d+-short-video-.+\.md$/.test(f))
    .filter((f) => !only || f === only)
    .sort();
  if (!files.length) {
    console.error(`[short-video-frames] no short-video drafts in ${draftsDir}${only ? ` matching ${only}` : ''}`);
    return 2;
  }

  const ffmpeg = hasFfmpeg() && !process.argv.includes('--stills-only');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: FRAME_WIDTH, height: FRAME_HEIGHT } });
    for (const file of files) {
      const draft = parseDraft(readFileSync(join(draftsDir, file), 'utf8'));
      if (!draft.mods.length) {
        console.warn(`[short-video-frames] ${file}: no credited mods with an image — skipped`);
        continue;
      }
      const outDir = join(ROOT, 'reports', 'funnel', 'social', 'assets', date, basename(file, '.md'));
      mkdirSync(outDir, { recursive: true });
      const tl = buildTimeline(draft);
      await page.setContent(compositionHtml(tl), { waitUntil: 'networkidle', timeout: 60_000 });
      const ready = (await page.evaluate(() => (window as unknown as { __ready: Promise<{ failed: string[] }> }).__ready)) as { failed: string[] };

      const stills = stillTimes(tl);
      for (let i = 0; i < stills.length; i++) {
        await seek(page, stills[i]);
        await page.screenshot({ path: join(outDir, `slide-${String(i + 1).padStart(2, '0')}.png`) });
      }
      await seek(page, coverTime(tl));
      await page.screenshot({ path: join(outDir, 'cover.jpg'), type: 'jpeg', quality: 92 });

      let video = process.argv.includes('--stills-only') ? 'stills only (--stills-only)' : 'no mp4 (install ffmpeg: brew install ffmpeg)';
      if (ffmpeg) {
        const silent = join(outDir, 'video-silent.mp4');
        const err = await encode(page, tl, silent);
        if (err) video = `mp4 FAILED: ${err}`;
        else {
          const wav = join(outDir, 'sfx.wav');
          writeFileSync(wav, sfxWav(tl));
          const mux = spawnSync(
            'ffmpeg',
            ['-y', '-loglevel', 'error', '-i', silent, '-i', wav, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', join(outDir, 'video.mp4')],
            { encoding: 'utf8' },
          );
          unlinkSync(wav);
          video = mux.status === 0 ? `video.mp4 + video-silent.mp4 (${tl.duration.toFixed(1)} s)` : `sound mux FAILED: ${mux.stderr.trim().slice(0, 200)}`;
        }
      }
      writeFileSync(
        join(outDir, 'README.txt'),
        [
          `Draft: reports/funnel/social/drafts/${date}/${file}`,
          `Scenes: ${tl.scenes.length} (hook ${draft.hook ? 'yes' : 'no — add a Hook: "…" line to the draft Copy section; *word* highlights a word'})`,
          `Video: ${video}`,
          'Stills: slide-NN.png (photo mode / carousel) · cover.jpg (cover picker)',
          ready.failed.length ? `IMAGES THAT DID NOT LOAD (re-check before posting):\n${ready.failed.join('\n')}` : 'All images loaded.',
          'Post the caption from the draft. Nothing here has been posted.',
        ].join('\n') + '\n',
      );
      console.log(`[short-video-frames] ${file}: ${video}${ready.failed.length ? ` · ${ready.failed.length} image(s) failed` : ''} → ${outDir}`);
    }
  } finally {
    await browser.close();
  }
  return 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(`[short-video-frames] ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  },
);
