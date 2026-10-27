'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FacetOption } from './useLauncherData';
import { fmtCount } from './games';
import { Icon } from './Icon';
import { labelCase } from './display';

const VISIBLE_TYPES = 7;
const VISIBLE_STYLES = 4;
const POP_W = 264;
const SORT_HEADINGS: Record<string, string> = {
  downloads: 'Most downloaded',
  newest: 'Newest finds',
  rating: 'Top rated',
  relevance: 'Best matches',
};

interface LauncherToolbarProps {
  total: number | null;
  loading: boolean;
  search: string;
  sort: string;
  onSort: (sort: string) => void;
  types: FacetOption[] | null;
  styles: FacetOption[] | null;
  contentType: string;
  visualStyle: string;
  onContentType: (v: string) => void;
  onVisualStyle: (v: string) => void;
  /** Facet counts are catalogue-wide, so they only show when nothing narrows the grid. */
  showCounts: boolean;
  onClearAll: () => void;
}

/**
 * Results header: what the grid shows + live count, sort, and one scrolling row of
 * type + style chips (top types inline, the rest behind "More").
 */
export function LauncherToolbar({
  total,
  loading,
  search,
  sort,
  onSort,
  types,
  styles,
  contentType,
  visualStyle,
  onContentType,
  onVisualStyle,
  showCounts,
  onClearAll,
}: LauncherToolbarProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [atEnd, setAtEnd] = useState(false);
  const [pop, setPop] = useState<{ left: number; top: number } | null>(null);

  const checkEnd = useCallback(() => {
    const el = rowRef.current;
    if (!el) return;
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    checkEnd();
    window.addEventListener('resize', checkEnd);
    return () => window.removeEventListener('resize', checkEnd);
  }, [checkEnd, types, styles]);

  // A type picked from "More" (or from the type cloud below the grid) renders
  // near the start of the row, which may be scrolled away. Bring the active
  // chip into view by scrolling the row only, never the page.
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const active = Array.from(row.querySelectorAll<HTMLElement>('.chip.is-active')).pop();
    if (!active) return;
    const r = row.getBoundingClientRect();
    const a = active.getBoundingClientRect();
    if (a.left < r.left || a.right > r.right) {
      row.scrollTo({ left: row.scrollLeft + a.left - r.left - 12, behavior: 'smooth' });
    }
  }, [contentType, visualStyle, types, styles]);

  // Close the popover on outside click, Escape, scroll or resize.
  useEffect(() => {
    if (!pop) return;
    const close = () => setPop(null);
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (popRef.current?.contains(t) || moreRef.current?.contains(t)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        moreRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, { passive: true });
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close);
      window.removeEventListener('resize', close);
    };
  }, [pop]);

  const openMore = () => {
    if (pop) {
      setPop(null);
      return;
    }
    const r = moreRef.current?.getBoundingClientRect();
    if (!r) return;
    setPop({
      left: Math.max(12, Math.min(r.left, window.innerWidth - POP_W - 12)),
      top: Math.min(r.bottom + 6, window.innerHeight - 60),
    });
  };

  // Keep an active type chip visible inline even when it lives in "More".
  const inlineTypes = (types ?? []).slice(0, VISIBLE_TYPES);
  const activeOverflow = contentType && !inlineTypes.some((t) => t.value === contentType)
    ? (types ?? []).find((t) => t.value === contentType)
    : undefined;
  const moreCount = Math.max(0, (types?.length ?? 0) - VISIBLE_TYPES);
  const inlineStyles = (styles ?? []).slice(0, VISIBLE_STYLES);

  const chip = (f: FacetOption, active: boolean, onClick: () => void) => (
    <button
      key={f.value}
      type="button"
      className={`chip${active ? ' is-active' : ''}`}
      aria-pressed={active}
      onClick={onClick}
    >
      {labelCase(f.displayName)}
      {showCounts && <span className="cnt tabular">{fmtCount(f.count)}</span>}
    </button>
  );

  const filtered = !!(search || contentType || visualStyle);
  // The page h1 lives in the hero; this names what the grid is showing.
  const heading = search ? (
    <>Results for &ldquo;{search}&rdquo;</>
  ) : (
    SORT_HEADINGS[sort] ?? 'Most downloaded'
  );

  return (
    <div className="toolbar" id="lx-results">
      <div className="tb-head">
        <h2 className="tb-title">{heading}</h2>
        <div className="tb-meta" aria-live="polite">
          {loading && total == null ? (
            <span>Loading mods…</span>
          ) : (
            <span>
              <span className="cnt tabular">{(total ?? 0).toLocaleString()}</span> mods
            </span>
          )}
          {filtered && (
            <button type="button" className="tb-clear" onClick={onClearAll}>
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="tb-controls">
        <div className="sortsel-wrap">
          <select
            className="sortsel"
            value={sort}
            onChange={(e) => onSort(e.target.value)}
            aria-label="Sort mods"
          >
            <option value="downloads">Most downloaded</option>
            <option value="newest">Newest</option>
            <option value="rating">Top rated</option>
            <option value="relevance">Relevance</option>
          </select>
          <Icon name="chevron" />
        </div>

        <div
          ref={rowRef}
          className={`chiprow${atEnd ? ' at-end' : ''}`}
          onScroll={checkEnd}
          role="group"
          aria-label="Filter by type and style"
        >
          {types === null ? (
            Array.from({ length: 6 }, (_, i) => <span key={i} className="chip chip-skel" aria-hidden="true" />)
          ) : (
            <>
              <button
                type="button"
                className={`chip${!contentType ? ' is-active' : ''}`}
                aria-pressed={!contentType}
                onClick={() => onContentType('')}
              >
                All types
              </button>
              {activeOverflow && chip(activeOverflow, true, () => onContentType(''))}
              {inlineTypes.map((t) =>
                chip(t, t.value === contentType, () => onContentType(t.value === contentType ? '' : t.value))
              )}
              {moreCount > 0 && (
                <button
                  ref={moreRef}
                  type="button"
                  className="chip chip-more"
                  aria-haspopup="true"
                  aria-expanded={!!pop}
                  onClick={openMore}
                >
                  More +{moreCount}
                </button>
              )}
              {inlineStyles.length > 0 && <span className="chip divider" aria-hidden="true" />}
              {inlineStyles.map((s) =>
                chip(s, s.value === visualStyle, () => onVisualStyle(s.value === visualStyle ? '' : s.value))
              )}
            </>
          )}
        </div>
      </div>

      {pop && (
        <div ref={popRef} className="popover" style={{ left: pop.left, top: pop.top }} role="menu" aria-label="All types">
          <div className="pop-h">All types</div>
          {(types ?? []).map((t) => (
            <button
              key={t.value}
              type="button"
              role="menuitemradio"
              aria-checked={t.value === contentType}
              className={`pop-row${t.value === contentType ? ' is-active' : ''}`}
              onClick={() => {
                onContentType(t.value === contentType ? '' : t.value);
                setPop(null);
              }}
            >
              <span>{labelCase(t.displayName)}</span>
              {showCounts && <span className="cnt tabular">{fmtCount(t.count)}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
