/**
 * /go's "How to install this mod" box follows the game and the hosted file
 * type. It used to be hard-coded to Sims 4, so a Minecraft .jar got
 * "copy the .package files to The Sims 4/Mods".
 */
import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { INSTALL_STEP_COUNT, downloadedHintFor, installStepsFor, stepSegments } from '../../lib/installSteps';
import { MOD_FILE_KINDS, fileGameOf } from '../../lib/modFiles/constants';

const GAMES = ['Sims 4', 'Minecraft', 'Stardew Valley', 'Animal Crossing', 'Other', null] as const;
const KINDS = [...MOD_FILE_KINDS, null] as const;
const text = (steps: string[]) => steps.join(' ').toLowerCase();

describe('installStepsFor', () => {
  it('always returns the same number of steps, with balanced code marks (the box sits inside .mv-ads)', () => {
    let checked = 0;
    for (const game of GAMES) {
      for (const kind of KINDS) {
        const steps = installStepsFor(game, kind);
        expect(steps).toHaveLength(INSTALL_STEP_COUNT);
        for (const s of steps) expect(s.split('`').length % 2).toBe(1);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(40);
  });

  it('never gives Sims steps for a Minecraft file, or Minecraft steps for a Sims file', () => {
    for (const kind of MOD_FILE_KINDS) {
      // A .zip is either game, so it is checked with the game that matches.
      const game = kind === 'zip' ? null : fileGameOf(kind);
      const gameVersions = kind === 'zip' ? (['Sims 4', 'Minecraft'] as const) : [game === 'sims4' ? 'Sims 4' : 'Minecraft'];
      for (const gv of gameVersions) {
        const t = text(installStepsFor(gv, kind));
        if (gv === 'Minecraft') {
          expect(t, `${kind} on ${gv}`).not.toMatch(/sims|\.package/);
        } else {
          expect(t, `${kind} on ${gv}`).not.toMatch(/minecraft/);
        }
      }
    }
  });

  it('a Java .jar goes in the mods folder with a loader', () => {
    const t = text(installStepsFor('Minecraft', 'jar'));
    expect(t).toContain('.minecraft/mods');
    expect(t).toContain('fabric');
  });

  it('Bedrock files import by opening them', () => {
    for (const kind of ['mcpack', 'mcaddon', 'mcworld', 'mctemplate']) {
      expect(text(installStepsFor('Minecraft', kind))).toContain('imported');
    }
  });

  it('a Minecraft .zip is a pack and must not be unzipped', () => {
    const t = text(installStepsFor('Minecraft', 'zip'));
    expect(t).toContain('resourcepacks');
    expect(t).toContain('do not unzip');
  });

  it('a single Sims .package or .ts4script needs no unzipping; a link or .zip keeps the old steps', () => {
    expect(text(installStepsFor('Sims 4', 'package'))).toContain('no unzipping');
    expect(text(installStepsFor('Sims 4', 'ts4script'))).toContain('script mods');
    expect(installStepsFor('Sims 4', null)[0]).toBe('Extract the downloaded .zip file');
    expect(installStepsFor('Sims 4', 'zip')).toEqual(installStepsFor('Sims 4', null));
    // Older catalog rows have no gameVersion; they are all Sims 4.
    expect(installStepsFor(null, null)).toEqual(installStepsFor('Sims 4', null));
  });

  it('other games get their own or generic steps, never Sims ones', () => {
    expect(text(installStepsFor('Stardew Valley', null))).toContain('smapi');
    for (const g of ['Animal Crossing', 'Other']) expect(text(installStepsFor(g, null))).not.toMatch(/sims/);
    expect(text(installStepsFor('Minecraft', null))).toContain('java or bedrock');
  });
});

describe('downloadedHintFor', () => {
  it('names the right folder for each game and file type', () => {
    expect(downloadedHintFor('Minecraft', 'jar')).toContain('.minecraft/mods');
    for (const kind of ['mcpack', 'mcaddon', 'mcworld', 'mctemplate']) {
      expect(downloadedHintFor('Minecraft', kind)).toContain('import it into Minecraft');
    }
    expect(downloadedHintFor('Minecraft', 'zip')).toContain('resourcepacks');
    expect(downloadedHintFor('Sims 4', 'package')).toContain('The Sims 4/Mods');
    expect(downloadedHintFor('Sims 4', 'zip')).toContain('The Sims 4/Mods');
    expect(downloadedHintFor(null, null)).toContain('The Sims 4/Mods');
    expect(downloadedHintFor('Stardew Valley', null)).not.toMatch(/sims/i);
  });

  it('never sends a Minecraft file to the Sims folder, or a Sims file to Minecraft', () => {
    for (const kind of MOD_FILE_KINDS) {
      if (kind !== 'zip' && fileGameOf(kind) === 'minecraft') {
        expect(downloadedHintFor('Minecraft', kind), kind).not.toMatch(/sims/i);
      }
      if (kind !== 'zip' && fileGameOf(kind) === 'sims4') {
        expect(downloadedHintFor('Sims 4', kind), kind).not.toMatch(/minecraft/i);
      }
    }
    expect(downloadedHintFor('Minecraft', 'zip')).not.toMatch(/sims/i);
  });
});

describe('stepSegments', () => {
  it('splits backticked code from text', () => {
    expect(stepSegments('Put the `.jar` in `mods`')).toEqual([
      { text: 'Put the ', code: false },
      { text: '.jar', code: true },
      { text: ' in ', code: false },
      { text: 'mods', code: true },
    ]);
  });
});

describe('GoClient', () => {
  it('takes its install steps from installStepsFor, not a hard-coded Sims list', () => {
    const src = readFileSync(path.join(__dirname, '../../app/go/[modId]/GoClient.tsx'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(src).toContain('installStepsFor(');
    expect(src).toContain('downloadedHintFor(');
    expect(src).not.toContain('The Sims 4/Mods');
    expect(src).not.toContain('Extract the downloaded .zip file');
  });
});
