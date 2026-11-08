import { describe, expect, it } from 'vitest';

import {
  mergeCredits,
  creditsChanged,
  buildCaptions,
  checkVideo,
  isPlaceholderCreator,
  classifyLink,
  creditsFor,
  extractLinks,
  failedImagesFromReadme,
  nextSlots,
  parseCaptionBlock,
  plainHook,
  slotDate,
  type CreatorHandlesFile,
  type SceneInput,
  type VideoMeta,
} from '../../scripts/agents/video-queue-lib';

const HANDLES: CreatorHandlesFile = {
  creators: [
    { creator: 'TBZSimz', tiktok: '@tbzsimz', youtube: '@tbzsimz', confirmed_from: 'flow.page', date: '2026-11-03' },
    { creator: 'redheadsims', tiktok: '@redheadsimscc', youtube: '@RedheadSimsCC', confirmed_from: 'Linktree', date: '2026-11-03' },
  ],
};

const SCENES: SceneInput[] = [
  { mod: 'Lani Set', creator: 'TBZSimz', text: 'the whole fit, one download', mod_url: 'https://musthavemods.com/mods/a1/' },
  { mod: 'Curls Hair', creator: 'redheadsims', text: 'tight curls that hold up', mod_url: 'https://musthavemods.com/mods/a2/' },
  { mod: 'Braids', creator: 'slaughtsims', text: 'long knotless braids', mod_url: 'https://musthavemods.com/mods/a3/' },
  { mod: 'Hoops', creator: 'TBZSimz', text: 'gold hoops in three sizes', mod_url: 'https://musthavemods.com/mods/a4/' },
];

describe('nextSlots', () => {
  it('returns Mon/Wed/Fri 16:00 New York, in UTC without milliseconds', () => {
    // Sat 2026-11-07 12:00 ET (after the DST change, EST = UTC-5)
    expect(nextSlots(new Date('2026-11-07T17:00:00Z'))).toEqual([
      '2026-11-09T21:00:00Z',
      '2026-11-11T21:00:00Z',
      '2026-11-13T21:00:00Z',
    ]);
  });

  it('handles the 2026-11-01 fall-back: EDT slot is 20:00Z, EST slots are 21:00Z', () => {
    // Thu 2026-10-29 08:00 ET → Fri Oct 30 16:00 EDT is 32 h away
    expect(nextSlots(new Date('2026-10-29T12:00:00Z'))).toEqual([
      '2026-10-30T20:00:00Z',
      '2026-11-02T21:00:00Z',
      '2026-11-04T21:00:00Z',
    ]);
  });

  it('handles the spring-forward too (2027-03-14)', () => {
    expect(nextSlots(new Date('2027-03-11T12:00:00Z'), [], 2)).toEqual(['2027-03-12T21:00:00Z', '2027-03-15T20:00:00Z']);
  });

  it('skips slots less than 20 hours away', () => {
    // Sun 2026-11-08 21:00Z → Mon 21:00Z is 24 h away (ok); at Sun 23:00Z it is 22 h (ok); at Mon 02:00Z it is 19 h (skip)
    expect(nextSlots(new Date('2026-11-08T23:00:00Z'), [], 1)).toEqual(['2026-11-09T21:00:00Z']);
    expect(nextSlots(new Date('2026-11-09T02:00:00Z'), [], 1)).toEqual(['2026-11-11T21:00:00Z']);
  });

  it('skips taken slots, whatever their ISO formatting', () => {
    expect(nextSlots(new Date('2026-11-07T17:00:00Z'), ['2026-11-09T21:00:00.000Z', '2026-11-13T21:00:00Z'], 2)).toEqual([
      '2026-11-11T21:00:00Z',
      '2026-11-16T21:00:00Z',
    ]);
  });

  it('slotDate gives the New York calendar date', () => {
    expect(slotDate('2026-11-09T21:00:00Z')).toBe('2026-11-09');
    expect(slotDate('2026-11-10T03:00:00Z')).toBe('2026-11-09');
  });
});

describe('classifyLink', () => {
  it('accepts mod and /go/ links on our domains', () => {
    expect(classifyLink('https://musthavemods.com/mods/abc123/')).toMatchObject({ ok: true, kind: 'mod', id: 'abc123' });
    expect(classifyLink('www.musthavemods.com/go/xyz?x=1')).toMatchObject({ ok: true, kind: 'go', id: 'xyz' });
  });

  it('accepts pages, including blog subdomain articles', () => {
    expect(classifyLink('https://musthavemods.com/black-sims-4-cc/')).toMatchObject({ ok: true, kind: 'page', path: '/black-sims-4-cc/' });
    expect(classifyLink('https://blog.musthavemods.com/sims-4-cc-finds/')).toMatchObject({ ok: true, kind: 'page' });
  });

  it('rejects other hosts, look-alikes and adult pages', () => {
    expect(classifyLink('https://www.thesimsresource.com/downloads/123')).toMatchObject({ ok: false });
    expect(classifyLink('https://musthavemods.com.evil.example/mods/a/')).toMatchObject({ ok: false });
    expect(classifyLink('https://evilmusthavemods.com/mods/a/')).toMatchObject({ ok: false });
    expect(classifyLink('https://musthavemods.com/sims-4-woohoo-mods/')).toMatchObject({ ok: false });
    expect(classifyLink('javascript:alert(1)')).toMatchObject({ ok: false });
    expect(classifyLink('')).toMatchObject({ ok: false });
  });

  it('extractLinks finds bare and full URLs in writer notes', () => {
    const found = extractLinks('try https://musthavemods.com/mods/a/ and musthavemods.com/black-sims-4-cc/ please');
    expect(found.some((l) => l.indexOf('/mods/a/') >= 0)).toBe(true);
    expect(found.some((l) => l.indexOf('black-sims-4-cc') >= 0)).toBe(true);
  });
});

describe('creditsFor', () => {
  it('one credit per creator, handles only when confirmed', () => {
    expect(creditsFor(SCENES, HANDLES, new Set())).toEqual([
      { creator: 'TBZSimz', tiktok: '@tbzsimz', youtube: '@tbzsimz' },
      { creator: 'redheadsims', tiktok: '@redheadsimscc', youtube: '@RedheadSimsCC' },
      { creator: 'slaughtsims', tiktok: null, youtube: null },
    ]);
  });

  it('never tags an opted-out creator and survives a missing handles file', () => {
    const c = creditsFor(SCENES, HANDLES, new Set(['tbzsimz']));
    expect(c[0]).toEqual({ creator: 'TBZSimz', tiktok: null, youtube: null });
    expect(creditsFor(SCENES, null, new Set()).every((x) => x.tiktok === null && x.youtube === null)).toBe(true);
  });

  it('drops malformed handles', () => {
    const bad: CreatorHandlesFile = { creators: [{ creator: 'TBZSimz', tiktok: 'tbzsimz', youtube: '@a b', confirmed_from: '', date: '' }] };
    expect(creditsFor(SCENES.slice(0, 1), bad, new Set())[0]).toEqual({ creator: 'TBZSimz', tiktok: null, youtube: null });
  });
});

describe('buildCaptions', () => {
  const r = buildCaptions({
    hook: 'black sims cc I keep in *every* save',
    captionSentences: 'TBZSimz made the Lani Set and it goes with everything. #sims4 #sims4cc #ts4cc',
    targetUrl: 'https://musthavemods.com/black-sims-4-cc/',
    date: '2026-11-09',
    scenes: SCENES,
    handles: HANDLES,
  });

  it('youtube title is the plain hook + #shorts', () => {
    expect(r.captions.youtube_title).toBe('black sims cc I keep in every save #shorts');
  });

  it('youtube description matches the runbook format exactly', () => {
    expect(r.captions.youtube_description).toBe(
      [
        'TBZSimz made the Lani Set and it goes with everything.',
        '',
        'Full list + downloads: https://musthavemods.com/black-sims-4-cc/?utm_source=youtube&utm_medium=social&utm_campaign=short-2026-11-09',
        '',
        'Credits:',
        'Lani Set by TBZSimz (@tbzsimz)',
        'Curls Hair by redheadsims (@RedheadSimsCC)',
        'Braids by slaughtsims',
        'Hoops by TBZSimz (@tbzsimz)',
        '',
        '#sims4 #sims4cc #ts4cc',
      ].join('\n'),
    );
  });

  it('tiktok caption matches the runbook format exactly', () => {
    expect(r.captions.tiktok).toBe(
      [
        'TBZSimz made the Lani Set and it goes with everything.',
        '',
        'Full list + downloads: musthavemods.com/black-sims-4-cc',
        '',
        'Credits: @tbzsimz, @redheadsimscc, slaughtsims',
        '',
        '#sims4 #sims4cc #ts4cc',
      ].join('\n'),
    );
    expect(r.lint).toEqual([]);
  });

  it('defaults the hashtags and caps them at 3', () => {
    const none = buildCaptions({ hook: 'x y', captionSentences: 'plain line.', targetUrl: 'https://musthavemods.com/a/', date: '2026-11-09', scenes: SCENES, handles: null });
    expect(none.captions.tiktok.split('\n').pop()).toBe('#sims4 #sims4cc #ts4cc');
    const many = buildCaptions({ hook: 'x y', captionSentences: 'line. #a #b #c #d #e', targetUrl: 'https://musthavemods.com/a/', date: '2026-11-09', scenes: SCENES, handles: null });
    expect(many.captions.tiktok.split('\n').pop()).toBe('#a #b #c');
  });

  it('flags banned phrases in the caption', () => {
    const bad = buildCaptions({ hook: 'x y', captionSentences: 'Dive in to the ultimate cc.', targetUrl: 'https://musthavemods.com/a/', date: '2026-11-09', scenes: SCENES, handles: null });
    expect(bad.lint.some((l) => l.rule === 'banned-phrase')).toBe(true);
  });

  it('plainHook strips emphasis markers', () => {
    expect(plainHook('  cozy *fall*  kitchen ')).toBe('cozy fall kitchen');
  });
});

describe('parseCaptionBlock', () => {
  it('reads the Caption: block up to the next section, quotes optional', () => {
    const md = '## Copy\nHook: "h"\nText: "t"\nCaption: "one line.\nsecond line. #sims4"\n\n## Asset\nx\n';
    expect(parseCaptionBlock(md)).toBe('one line.\nsecond line. #sims4');
    expect(parseCaptionBlock('## Copy\nCaption: plain #ts4cc\n')).toBe('plain #ts4cc');
    expect(parseCaptionBlock('## Copy\nHook: "h"\n')).toBe('');
  });
});

describe('failedImagesFromReadme', () => {
  it('lists the URLs under the renderer warning only', () => {
    const readme = 'video.mp4\n\nIMAGES THAT DID NOT LOAD (re-check before posting):\nhttps://a.example/1.png\nhttps://a.example/2.png\n\nnotes\n';
    expect(failedImagesFromReadme(readme)).toEqual(['https://a.example/1.png', 'https://a.example/2.png']);
    expect(failedImagesFromReadme('all good\n')).toEqual([]);
  });
});

describe('checkVideo', () => {
  const good: VideoMeta = {
    durationS: 17.6,
    width: 1080,
    height: 1920,
    hook: 'black sims cc I keep in *every* save',
    targetUrl: 'https://musthavemods.com/black-sims-4-cc/',
    scenes: SCENES,
    captions: { youtube_title: 'a #shorts', youtube_description: 'b', tiktok: 'c' },
  };

  it('passes a good video', () => {
    expect(checkVideo(good)).toEqual([]);
  });

  it('catches duration, frame, hook and scene problems', () => {
    const p = checkVideo({ ...good, durationS: 5, width: 1920, height: 1080, hook: '', scenes: SCENES.slice(0, 2) });
    expect(p.join('\n')).toMatch(/duration 5\.0 s/);
    expect(p.join('\n')).toMatch(/not 1080×1920/);
    expect(p).toContain('no hook');
    expect(p.join('\n')).toMatch(/2 mod scenes/);
  });

  it('catches missing credit/text, NSFW and opted-out creators', () => {
    const scenes: SceneInput[] = [
      { ...SCENES[0], creator: '' },
      { ...SCENES[1], text: '' },
      { ...SCENES[2], nsfw: true },
      { ...SCENES[3], mod: 'Woohoo Bed' },
    ];
    const p = checkVideo({ ...good, scenes, optout: new Set(['redheadsims']) }).join('\n');
    expect(p).toMatch(/scene 1 .* no creator credit/);
    expect(p).toMatch(/scene 2 .* no on-screen text/);
    expect(p).toMatch(/scene 3 .* NSFW mod/);
    expect(p).toMatch(/scene 4 .* adult\/NSFW/);
    expect(p).toMatch(/redheadsims opted out/);
  });

  it('catches a foreign target, failed images, banned on-screen copy and empty captions', () => {
    const p = checkVideo({
      ...good,
      targetUrl: 'https://example.com/x/',
      hook: 'dive in to cc',
      failedImages: ['https://a.example/1.png'],
      captions: { youtube_title: '', youtube_description: 'b', tiktok: 'c' },
    }).join('\n');
    expect(p).toMatch(/not a musthavemods\.com page/);
    expect(p).toMatch(/image did not load/);
    expect(p).toMatch(/on-screen copy: banned-phrase/);
    expect(p).toMatch(/youtube_title is empty/);
    expect(checkVideo({ ...good, captions: null })).toContain('no captions');
    expect(checkVideo({ ...good, durationS: null }).join('\n')).toMatch(/no video duration/);
  });
});

describe('isPlaceholderCreator', () => {
  it('rejects hosts and scraper debris', () => {
    for (const n of ['Simfileshare', 'Updated File', 'Title', 'ShRef', 'patreon', '', 'https://x.com/a'])
      expect(isPlaceholderCreator(n)).toBe(true);
  });
  it('keeps real creator names', () => {
    for (const n of ['TBZSimz', 'redheadsims', 'NoNvme Sims', 'xxblacksims', 'SayaSims'])
      expect(isPlaceholderCreator(n)).toBe(false);
  });
});

describe('mergeCredits', () => {
  const kept = {
    youtube_title: 'her title #shorts',
    youtube_description: 'her own sentence\n\nFull list + downloads: https://x\n\nCredits:\nKids Alpha Hair by Rebellesims420\nKayla Hair by Kie Gross\n\n#sims4 #ts4cc',
    tiktok: 'her own sentence\n\nFull list + downloads: musthavemods.com/x\n\nCredits: Rebellesims420, Kie Gross\n\n#sims4',
  };
  const fresh = {
    youtube_title: 'bot title #shorts',
    youtube_description: 'bot sentence\n\nFull list + downloads: https://x\n\nCredits:\nBohemian Knotless Braids by brandysims\nKayla Hair by Kie Gross\n\n#sims4',
    tiktok: 'bot sentence\n\nFull list + downloads: musthavemods.com/x\n\nCredits: brandysims, Kie Gross\n\n#sims4',
  };
  it('swaps only the credits and keeps her wording', () => {
    const m = mergeCredits(kept, fresh);
    expect(m.youtube_title).toBe('her title #shorts');
    expect(m.youtube_description).toContain('her own sentence');
    expect(m.youtube_description).toContain('Bohemian Knotless Braids by brandysims');
    expect(m.youtube_description).not.toContain('Kids Alpha Hair');
    expect(m.youtube_description.endsWith('#sims4 #ts4cc')).toBe(true);
    expect(m.tiktok).toContain('her own sentence');
    expect(m.tiktok).toContain('Credits: brandysims, Kie Gross');
    expect(m.tiktok).not.toContain('Rebellesims420');
  });
  it('appends credits when she deleted them', () => {
    const m = mergeCredits({ ...kept, youtube_description: 'just mine', tiktok: 'just mine' }, fresh);
    expect(m.youtube_description).toContain('Credits:\nBohemian Knotless Braids by brandysims');
    expect(m.tiktok).toContain('Credits: brandysims, Kie Gross');
  });
});

describe('creditsChanged', () => {
  it('ignores order and case, catches a swap', () => {
    const a = [{ mod: 'A', creator: 'x' }, { mod: 'B', creator: 'y' }];
    expect(creditsChanged(a, [{ mod: 'b', creator: 'Y' }, { mod: 'a', creator: 'X' }])).toBe(false);
    expect(creditsChanged(a, [{ mod: 'A', creator: 'x' }, { mod: 'C', creator: 'z' }])).toBe(true);
  });
});
