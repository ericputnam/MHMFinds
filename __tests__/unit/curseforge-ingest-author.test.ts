import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import {
  candidateKeys,
  lookupCurseForgeAuthor,
  resolveCurseForgeIngestAuthor,
  type IngestAuthorDeps,
  type SpellingRow,
} from '../../lib/services/curseforgeIngestAuthor';
import type { AuthorLookup } from '../../scripts/agents/curseforge-author-backfill-lib';

const CF = 'https://www.curseforge.com/sims4/build-buy/kaziecc-feel-skincare-clutter';

function deps(lookup: AuthorLookup, spellings: SpellingRow[] = [], opts: { noKey?: boolean } = {}): IngestAuthorDeps & {
  lookupSpy: ReturnType<typeof vi.fn>;
} {
  const lookupSpy = vi.fn(async () => lookup);
  return { apiKey: opts.noKey ? undefined : 'k', lookup: lookupSpy, lookupSpy, spellings: async () => spellings };
}

const found = (authors: string[]): AuthorLookup => ({ kind: 'found', projectId: 1, authors });

describe('resolveCurseForgeIngestAuthor (E390)', () => {
  it('sets the single CurseForge author on a NULL-author CurseForge row', async () => {
    const r = await resolveCurseForgeIngestAuthor({ title: 'Feel Skincare', author: null, downloadUrl: CF }, deps(found(['Kaziecc'])));
    expect(r).toEqual({ kind: 'set', author: 'Kaziecc', slug: 'kaziecc-feel-skincare-clutter', folded: false });
  });

  it('never looks up a row that already has a usable author', async () => {
    const d = deps(found(['Someone']));
    const r = await resolveCurseForgeIngestAuthor({ title: 't', author: 'Atino00', downloadUrl: CF }, d);
    expect(r).toEqual({ kind: 'skip', reason: 'has-author' });
    expect(d.lookupSpy).not.toHaveBeenCalled();
  });

  it('treats junk and platform placeholders as unusable', async () => {
    for (const junk of ['Title 12345678', 'CurseForge Creator', '', '   ']) {
      const r = await resolveCurseForgeIngestAuthor({ title: 't', author: junk, downloadUrl: CF }, deps(found(['Kaziecc'])));
      expect(r.kind).toBe('set');
    }
  });

  it('skips non-CurseForge and look-alike hosts without a lookup', async () => {
    for (const url of ['https://www.patreon.com/posts/x-123456', 'https://www.curseforge.com.evil.example/sims4/cas/x', null]) {
      const d = deps(found(['Kaziecc']));
      const r = await resolveCurseForgeIngestAuthor({ title: 't', author: null, downloadUrl: url }, d);
      expect(r).toEqual({ kind: 'skip', reason: 'no-curseforge-slug' });
      expect(d.lookupSpy).not.toHaveBeenCalled();
    }
  });

  it('does nothing when the API key is unset', async () => {
    const d = deps(found(['Kaziecc']), [], { noKey: true });
    expect(await resolveCurseForgeIngestAuthor({ title: 't', author: null, downloadUrl: CF }, d)).toEqual({ kind: 'skip', reason: 'no-api-key' });
    expect(d.lookupSpy).not.toHaveBeenCalled();
  });

  it('prefers NULL to a guess: multi-author, not-found, unreachable, unusable name', async () => {
    const cases: Array<[AuthorLookup, string]> = [
      [found(['A1', 'B2']), 'multi-author'],
      [{ kind: 'not-found' }, 'not-found'],
      [{ kind: 'unreachable', detail: 'HTTP 503' }, 'unreachable'],
      [found(['CurseForge']), 'author-unusable'],
      [found([]), 'no-author'],
    ];
    for (const [lookup, reason] of cases) {
      expect(await resolveCurseForgeIngestAuthor({ title: 't', author: null, downloadUrl: CF }, deps(lookup))).toEqual({ kind: 'skip', reason });
    }
  });

  it('folds a suffix spelling onto the creator page that already exists (E293 class)', async () => {
    const r = await resolveCurseForgeIngestAuthor(
      { title: 't', author: null, downloadUrl: CF },
      deps(found(['Boschiana']), [
        { ckey: 'boschianacc', author: 'BoschianaCC', n: 15 },
        { ckey: 'boschiana', author: 'Boschiana', n: 2 },
      ]),
    );
    expect(r).toEqual({ kind: 'set', author: 'BoschianaCC', slug: 'kaziecc-feel-skincare-clutter', folded: true });
  });

  it('keeps the CurseForge spelling when the spelling read throws', async () => {
    const d = deps(found(['Kaziecc']));
    d.spellings = async () => {
      throw new Error('db down');
    };
    expect(await resolveCurseForgeIngestAuthor({ title: 't', author: null, downloadUrl: CF }, d)).toMatchObject({ kind: 'set', author: 'Kaziecc' });
  });
});

describe('candidateKeys', () => {
  it('covers the key and every suffix variant preferExistingPage can consult', () => {
    const keys = candidateKeys('BoschianaCC');
    expect(keys).toContain('boschianacc');
    expect(keys).toContain('boschiana');
    expect(keys).toContain('boschianaccsims');
    expect(keys).not.toContain('');
  });
});

describe('lookupCurseForgeAuthor', () => {
  it('matches the exact slug only and never throws', async () => {
    const ok = vi.fn(async () => new Response(JSON.stringify({ data: [{ id: 9, slug: 'other', authors: [{ name: 'X' }] }, { id: 7, slug: 's', authors: [{ name: 'Y' }] }] })));
    expect(await lookupCurseForgeAuthor('s', 'k', ok as unknown as typeof fetch)).toEqual({ kind: 'found', projectId: 7, authors: ['Y'] });
    const miss = vi.fn(async () => new Response(JSON.stringify({ data: [{ id: 9, slug: 'other' }] })));
    expect(await lookupCurseForgeAuthor('s', 'k', miss as unknown as typeof fetch)).toEqual({ kind: 'not-found' });
    const bad = vi.fn(async () => new Response('', { status: 403 }));
    expect(await lookupCurseForgeAuthor('s', 'k', bad as unknown as typeof fetch)).toEqual({ kind: 'unreachable', detail: 'HTTP 403' });
    const boom = vi.fn(async () => {
      throw new Error('ECONNRESET');
    });
    expect((await lookupCurseForgeAuthor('s', 'k', boom as unknown as typeof fetch)).kind).toBe('unreachable');
  });
});

describe('mhmScraper create path (source guard)', () => {
  const src = readFileSync(resolve(__dirname, '../../lib/services/mhmScraper.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  const createBlock = src.slice(src.indexOf('prisma.mod.create({'), src.indexOf('savedCount++;', src.indexOf('prisma.mod.create({')));

  it('writes the resolved author, not the raw scraped one', () => {
    expect(createBlock.length).toBeGreaterThan(100);
    expect(createBlock).toMatch(/^\s*author,\s*$/m);
    expect(createBlock).not.toMatch(/author:\s*mod\.author/);
  });

  it('resolves the CurseForge author before the create', () => {
    const at = src.indexOf('resolveCurseForgeIngestAuthor(mod');
    expect(at).toBeGreaterThan(0);
    expect(at).toBeLessThan(src.indexOf('prisma.mod.create({'));
  });
});
