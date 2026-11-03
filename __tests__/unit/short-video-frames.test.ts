import { describe, expect, it } from 'vitest';

import { FROZEN_PLATFORMS } from '../../scripts/agents/social-draft-lib';
import {
  buildSlides,
  displayDestination,
  ffmpegArgs,
  parseDraft,
  slideHtml,
} from '../../scripts/agents/short-video-frames-lib';

const DRAFT = `---
status: DRAFT
platform: short-video
target_url: https://musthavemods.com/must-have-mods-sims-4/
batch: 2026-10-31
---

## Copy
Hook: "two mods I reinstall after every patch"

On-screen sequence:
1. Playable Pets by andrew. Text: "you can finally play as the dog"
2. Better Computer Menus by Andirz. Text: "the computer menu, but readable"

## Asset
whatever

## Mods and creators to credit
- Sims 4 Playable Pets Mod — by andrew · https://musthavemods.com/mods/a/ · img: https://blog.musthavemods.com/a.png
- Better Sims 4 Computer Menus — by Andirz · https://musthavemods.com/mods/b/ · img: https://blog.musthavemods.com/b.jpg
- Sims 4 Playable Pets Mod — by andrew · https://musthavemods.com/mods/a/ · img: https://blog.musthavemods.com/a.png

## Rules this draft was checked against
- stuff
`;

describe('short-video-frames-lib', () => {
  it('parses the draft: front matter, hook, overlay texts, deduped mods', () => {
    const d = parseDraft(DRAFT);
    expect(d.platform).toBe('short-video');
    expect(d.targetUrl).toBe('https://musthavemods.com/must-have-mods-sims-4/');
    expect(d.hook).toBe('two mods I reinstall after every patch');
    expect(d.texts).toEqual(['you can finally play as the dog', 'the computer menu, but readable']);
    expect(d.mods.map((m) => m.creator)).toEqual(['andrew', 'Andirz']);
    expect(d.mods[1].img).toBe('https://blog.musthavemods.com/b.jpg');
  });

  it('builds hook → one slide per mod → end card crediting every creator', () => {
    const slides = buildSlides(parseDraft(DRAFT));
    expect(slides.map((s) => s.kind)).toEqual(['hook', 'mod', 'mod', 'end']);
    const end = slides[3];
    expect(end.kind === 'end' && end.destination).toBe('musthavemods.com/must-have-mods-sims-4');
    expect(end.kind === 'end' && end.creators).toEqual(['andrew', 'Andirz']);
  });

  it('writes no copy of its own: no hook line means no hook slide, missing Text means no overlay', () => {
    const d = parseDraft(DRAFT.replace(/^Hook:.*\n/m, '').replace(/Text: "the computer menu, but readable"/, ''));
    const slides = buildSlides(d);
    expect(slides[0].kind).toBe('mod');
    const second = slides[1];
    expect(second.kind === 'mod' && second.text).toBeNull();
  });

  it('every slide credits the creator on screen and escapes draft text', () => {
    const d = parseDraft(DRAFT.replace('— by Andirz', '— by <b>Andirz</b>'));
    const html = slideHtml(buildSlides(d)[2]);
    expect(html).toContain('by &lt;b&gt;Andirz&lt;/b&gt;');
    expect(html).not.toContain('<b>Andirz');
  });

  it('displayDestination strips scheme and trailing slash', () => {
    expect(displayDestination('https://www.musthavemods.com/games/sims-4/hair/')).toBe('musthavemods.com/games/sims-4/hair');
  });

  it('ffmpeg args make a 1080×1920 H.264 mp4 from the numbered slides', () => {
    const a = ffmpegArgs('/x', '/x/out.mp4');
    expect(a).toContain('/x/slide-%02d.png');
    expect(a).toContain('libx264');
    expect(a.join(' ')).toContain('scale=1080:1920');
  });
});

describe('social-draft frozen platforms (operator 2026-11-02)', () => {
  it('Tumblr and Reddit are never drafted for', () => {
    expect([...FROZEN_PLATFORMS].sort()).toEqual(['reddit', 'tumblr']);
  });
});
