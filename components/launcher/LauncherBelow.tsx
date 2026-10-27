'use client';

import React from 'react';
import { GAMES, fmtCount } from './games';
import { FacetOption } from './useLauncherData';
import { Icon } from './Icon';
import { groupTypes } from './display';

interface LauncherBelowProps {
  game: string;
  gameCounts: Record<string, number | undefined>;
  collectionsSlot?: React.ReactNode;
  types: FacetOption[] | null;
  contentType: string;
  onContentType: (v: string) => void;
}

/**
 * Below-the-grid discovery: game hubs, the server-rendered collection links
 * (app/HomeCollections.tsx) and every content type, grouped by what it is
 * (components/launcher/display.ts drops mis-tag stragglers). All of it
 * sits under the grid inside .main, so the grid row and the ad sidebar keep
 * the top of the page.
 */
export function LauncherBelow({ game, gameCounts, collectionsSlot, types, contentType, onContentType }: LauncherBelowProps) {
  const groups = groupTypes(types ?? []);
  return (
    <>
      <section className="below-sec is-first" aria-labelledby="lx-games-h">
        <div className="sec-head">
          <h2 id="lx-games-h">Browse by game</h2>
        </div>
        <div className="game-cards">
          {GAMES.filter((g) => g.slug).map((g) => (
            <a
              key={g.id}
              href={`/games/${g.slug}/`}
              className={`game-card${g.value === game ? ' is-active' : ''}`}
              style={{ '--gc-rgb': g.rgb } as React.CSSProperties}
            >
              <div className="gc-top">
                <span className="gc-ic" style={{ backgroundImage: `url(${g.icon})` }} aria-hidden="true" />
                <h3>{g.name}</h3>
              </div>
              <p>{g.tagline}</p>
              <div className="gc-foot">
                <span className="gc-count tabular">
                  {gameCounts[g.value] != null ? `${fmtCount(gameCounts[g.value])} mods` : ' '}
                </span>
                <span className="gc-cta">
                  Explore <Icon name="arrow" />
                </span>
              </div>
            </a>
          ))}
        </div>
      </section>

      {collectionsSlot}

      {groups.length > 0 && (
        <section className="below-sec" aria-labelledby="lx-types-h">
          <div className="sec-head">
            <h2 id="lx-types-h">Every type of mod</h2>
          </div>
          <div className="type-groups">
            {groups.map((g) => (
              <div key={g.key} className="type-group">
                <h3 className="tg-title">{g.title}</h3>
                <div className="type-cloud">
                  {g.types.map((t) => {
                    const active = t.value === contentType;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        className={`chip${active ? ' is-active' : ''}`}
                        aria-pressed={active}
                        onClick={() => {
                          onContentType(active ? '' : t.value);
                          document.getElementById('lx-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                      >
                        {t.displayName}
                        <span className="cnt tabular">{fmtCount(t.count)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
