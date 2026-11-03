import { describe, expect, it } from 'vitest';

import { FROZEN_PLATFORMS } from '../../scripts/agents/social-draft-lib';
import { displayDestination, parseDraft } from '../../scripts/agents/short-video-frames-lib';
import {
  buildTimeline,
  compositionHtml,
  encodeArgs,
  frameCount,
  fullResCandidates,
  hookWords,
  sfxEvents,
  sfxWav,
} from '../../scripts/agents/short-video-motion-lib';

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

  it('builds hook → one scene per mod → end card crediting every creator, back to back', () => {
    const tl = buildTimeline(parseDraft(DRAFT));
    expect(tl.scenes.map((s) => s.kind)).toEqual(['hook', 'mod', 'mod', 'end']);
    for (let i = 1; i < tl.scenes.length; i++) expect(tl.scenes[i].t0).toBeCloseTo(tl.scenes[i - 1].t1, 3);
    const end = tl.scenes[3];
    expect(end.kind === 'end' && end.destination).toBe('musthavemods.com/must-have-mods-sims-4');
    expect(end.kind === 'end' && end.creators).toEqual(['andrew', 'Andirz']);
    expect(frameCount(tl)).toBe(Math.ceil(tl.duration * 30));
  });

  it('writes no copy of its own: no hook line means a wordless brand opener, missing Text means no caption', () => {
    const d = parseDraft(DRAFT.replace(/^Hook:.*\n/m, '').replace(/Text: "the computer menu, but readable"/, ''));
    const tl = buildTimeline(d);
    const hook = tl.scenes[0];
    expect(hook.kind === 'hook' && hook.words).toEqual([]);
    const second = tl.scenes[2];
    expect(second.kind === 'mod' && second.caption).toBeNull();
    expect(compositionHtml(tl).match(/class="cap"/g)).toHaveLength(1);
  });

  it('*word* in the hook becomes the highlighted word, punctuation kept', () => {
    expect(hookWords('cc I keep in *every* save, *always*.')).toEqual([
      { text: 'cc', em: false }, { text: 'I', em: false }, { text: 'keep', em: false }, { text: 'in', em: false },
      { text: 'every', em: true }, { text: 'save,', em: false }, { text: 'always.', em: true },
    ]);
  });

  it('every mod scene credits the creator on screen and escapes draft text, including inside the script', () => {
    const d = parseDraft(DRAFT.replace('— by Andirz', '— by <b>Andirz</b>').replace('b.jpg', 'b.jpg</script><x>'));
    const html = compositionHtml(buildTimeline(d));
    expect(html).toContain('by &lt;b&gt;Andirz&lt;/b&gt;');
    expect(html).not.toContain('<b>Andirz');
    expect(html).not.toContain('</script><x>');
  });

  it('tries the original WordPress upload before the resized variant', () => {
    expect(fullResCandidates('https://x/a-1024x576.png')).toEqual(['https://x/a.png', 'https://x/a-1024x576.png']);
    expect(fullResCandidates('https://x/a.png')).toEqual(['https://x/a.png']);
  });

  it('sound design is a deterministic mono WAV as long as the video', () => {
    const tl = buildTimeline(parseDraft(DRAFT));
    const a = sfxWav(tl, 8000);
    expect(a.toString('ascii', 0, 4)).toBe('RIFF');
    expect(a.readUInt32LE(40)).toBe(Math.ceil(tl.duration * 8000) * 2);
    expect(a.equals(sfxWav(tl, 8000))).toBe(true);
    expect(sfxEvents(tl).filter((e) => e.kind === 'pop')).toHaveLength(2);
  });

  it('ffmpeg encode args take piped JPEG frames to 1080×1920-ready H.264, audio optional', () => {
    const silent = encodeArgs({ fps: 30, audio: null, out: '/x/v.mp4' });
    expect(silent.join(' ')).toContain('-f image2pipe -c:v mjpeg -framerate 30 -i -');
    expect(silent).toContain('-an');
    expect(encodeArgs({ fps: 30, audio: '/x/a.wav', out: '/x/v.mp4' })).toContain('aac');
  });

  it('displayDestination strips scheme and trailing slash', () => {
    expect(displayDestination('https://www.musthavemods.com/games/sims-4/hair/')).toBe('musthavemods.com/games/sims-4/hair');
  });

});

describe('social-draft frozen platforms (operator 2026-11-02)', () => {
  it('Tumblr and Reddit are never drafted for', () => {
    expect([...FROZEN_PLATFORMS].sort()).toEqual(['reddit', 'tumblr']);
  });
});
