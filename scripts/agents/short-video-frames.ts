#!/usr/bin/env npx tsx
/**
 * short-video-frames.ts — render a short-video draft into postable slides (Pip, Traffic).
 *
 * WHAT IT DOES
 *   For each short-video draft in reports/funnel/social/drafts/<date>/ (or one --file),
 *   renders 1080×1920 PNG slides in headless Chromium: optional hook slide, one slide per
 *   credited mod (creator's preview image, mod name, "by <creator>"), end card. When a
 *   system `ffmpeg` is on PATH it also stitches slideshow.mp4 (2.5 s per slide, H.264).
 *   PNGs post as TikTok photo mode / an Instagram carousel; the mp4 posts as a Short or
 *   Reel. Output: reports/funnel/social/assets/<date>/<draft>/ (gitignored).
 *
 * WHAT IT NEVER DOES
 *   Post, or write copy. Every word comes from the draft (see short-video-frames-lib.ts).
 *   Posting stays the operator's until the channel's approval window ends (growth-plan.md).
 *
 * USAGE
 *   npx tsx scripts/agents/short-video-frames.ts --date YYYY-MM-DD [--file NN-short-video-x.md]
 *
 * Exit codes: 0 ok · 1 error · 2 nothing to render.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

import { chromium } from 'playwright';

import {
  FRAME_HEIGHT,
  FRAME_WIDTH,
  buildSlides,
  ffmpegArgs,
  parseDraft,
  slideHtml,
  slideImages,
} from './short-video-frames-lib';

const ROOT = resolve(__dirname, '..', '..');

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}

function hasFfmpeg(): boolean {
  return spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;
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

  const ffmpeg = hasFfmpeg();
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
      const slides = buildSlides(draft);
      const failed: string[] = [];
      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        await page.setContent(slideHtml(slide), { waitUntil: 'networkidle', timeout: 30_000 });
        for (const url of slideImages(slide)) {
          const ok = await page.evaluate(
            (u) => new Promise<boolean>((done) => { const im = new Image(); im.onload = () => done(true); im.onerror = () => done(false); im.src = u; }),
            url,
          );
          if (!ok) failed.push(url);
        }
        await page.screenshot({ path: join(outDir, `slide-${String(i + 1).padStart(2, '0')}.png`) });
      }
      let video = 'no mp4 (install ffmpeg: brew install ffmpeg)';
      if (ffmpeg) {
        const r = spawnSync('ffmpeg', ffmpegArgs(outDir, join(outDir, 'slideshow.mp4')), { encoding: 'utf8' });
        video = r.status === 0 ? 'slideshow.mp4' : `mp4 FAILED: ${r.stderr.trim().slice(0, 200)}`;
      }
      writeFileSync(
        join(outDir, 'README.txt'),
        [
          `Draft: reports/funnel/social/drafts/${date}/${file}`,
          `Slides: ${slides.length} (hook ${draft.hook ? 'yes' : 'no — add a Hook: "…" line to the draft Copy section'})`,
          `Video: ${video}`,
          failed.length ? `IMAGES THAT DID NOT LOAD (re-check before posting):\n${failed.join('\n')}` : 'All images loaded.',
          'Post the caption from the draft. Nothing here has been posted.',
        ].join('\n') + '\n',
      );
      console.log(`[short-video-frames] ${file}: ${slides.length} slides · ${video}${failed.length ? ` · ${failed.length} image(s) failed` : ''} → ${outDir}`);
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
