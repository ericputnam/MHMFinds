import React from 'react';
import type { LauncherGame } from './games';

/** What the visitor is hunting for, per game. "All" leads with Sims 4, the bulk of the catalogue. */
const HUNT: Record<LauncherGame['id'], string> = {
  all: 'Sims 4 CC',
  sims4: 'Sims 4 CC',
  stardew: 'Stardew mods',
  minecraft: 'Minecraft mods',
};

/**
 * Homepage hero: the page h1, a catalogue-size line and the capture block
 * (passed in as children so HomeCapture keeps its own attribution guards).
 * The highlighted phrase follows the game switcher; SSR renders the URL's game.
 *
 * Ad-safety: a sibling above the grid/sidebar row, in normal flow, never
 * sticky, and outside .mv-ads and aside#secondary. It replaces the old email
 * strip + toolbar h1; on phones it collapses to h1 + form so the grid top
 * stays close to where it was.
 */
export function LauncherHero({
  total,
  game = 'all',
  collections,
  children,
}: {
  total?: number;
  game?: LauncherGame['id'];
  /** Sims 4 collection shortcuts; hidden while another game is selected. */
  collections?: React.ReactNode;
  children?: React.ReactNode;
}) {
  // Rounded down to the thousand so the number doesn't jitter between loads;
  // the SSR value matches the <title> ("15,000+ Verified Finds").
  const finds = total && total >= 1000 ? `${Math.floor(total / 1000).toLocaleString()},000+` : '15,000+';

  return (
    <section className="hero" aria-labelledby="lx-h1">
      <div className="wrap hero-in">
        <div className="hero-copy">
          <p className="hero-kicker">
            <span className="pulse" aria-hidden="true" />
            Fresh finds every week
          </p>
          <h1 id="lx-h1" className="hero-h1">
            <span className="h1-a">
              Stop hunting for <span className="hl">{HUNT[game]}</span>.
            </span>{' '}
            <span className="h1-b">Start playing.</span>
          </h1>
          <p className="hero-sub">
            <b className="tabular">{finds}</b> hand-picked mods for Sims&nbsp;4, Stardew Valley and Minecraft.
            Every download link is checked, so you never land on a dead page.
          </p>
          {(game === 'all' || game === 'sims4') && collections}
        </div>
        {children}
      </div>
    </section>
  );
}
