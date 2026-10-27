'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { GAMES, fmtCount } from './games';

// useLayoutEffect warns during SSR; the thumb only matters after hydration.
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

interface GameSwitchProps {
  value: string;
  counts: Record<string, number | undefined>;
  onChange: (value: string) => void;
  /** Distinguishes the header and band instances for aria-label. */
  label: string;
}

/**
 * Segmented game switcher. One accent-tinted "thumb" slides under the active
 * game; icons are small squircle tiles that desaturate when inactive.
 * Rendered twice by the homepage (header at ≥1280px, band below it under
 * that) — CSS decides which one is visible, nothing is moved at runtime.
 */
export function GameSwitch({ value, counts, onChange, label }: GameSwitchProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLSpanElement>(null);
  const [live, setLive] = useState(false);
  const [anim, setAnim] = useState(false);

  const syncThumb = useCallback(() => {
    const root = rootRef.current;
    const thumb = thumbRef.current;
    if (!root || !thumb) return;
    const on = root.querySelector<HTMLButtonElement>('.gsw-btn.is-on');
    if (!on || root.offsetParent === null) return; // instance not displayed
    const rb = root.getBoundingClientRect();
    const bb = on.getBoundingClientRect();
    const x = bb.left - rb.left - root.clientLeft;
    thumb.style.transform = `translateX(${x}px)`;
    thumb.style.width = `${bb.width}px`;
    setLive(true);
  }, []);

  // Re-seat on every value change (animated once the first paint is done).
  useIsoLayoutEffect(() => {
    syncThumb();
  }, [value, counts, syncThumb]);

  // Re-seat without animation on resize and once web fonts have swapped in.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reseat = () => {
      setAnim(false);
      syncThumb();
      requestAnimationFrame(() => requestAnimationFrame(() => setAnim(true)));
    };
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(reseat) : null;
    ro?.observe(root);
    document.fonts?.ready.then(reseat).catch(() => {});
    reseat();
    return () => ro?.disconnect();
  }, [syncThumb]);

  const select = (next: string) => {
    if (next === value) return;
    onChange(next);
    // Bring the results back into view if the visitor has scrolled past them.
    const toolbar = document.getElementById('lx-results');
    const hdr = document.querySelector('.lx .hdr');
    if (toolbar && hdr) {
      const top = toolbar.getBoundingClientRect().top;
      const hb = hdr.getBoundingClientRect().bottom;
      if (top < hb) {
        window.scrollTo({ top: window.scrollY + top - hb - 12, behavior: 'smooth' });
      }
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const btns = Array.from(rootRef.current?.querySelectorAll<HTMLButtonElement>('.gsw-btn') ?? []);
    const i = btns.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    let n = -1;
    if (e.key === 'ArrowRight') n = (i + 1) % btns.length;
    else if (e.key === 'ArrowLeft') n = (i - 1 + btns.length) % btns.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = btns.length - 1;
    if (n >= 0) {
      e.preventDefault();
      btns[n].focus();
    }
  };

  const icons = GAMES.filter((g) => g.icon);

  return (
    <div
      ref={rootRef}
      className={`gsw${live ? ' is-live' : ''}${anim ? ' is-anim' : ''}`}
      role="toolbar"
      aria-label={label}
      onKeyDown={onKeyDown}
    >
      <span ref={thumbRef} className="gsw-thumb" aria-hidden="true" />
      {GAMES.map((g) => {
        const on = g.value === value;
        const count = g.id === 'all' ? undefined : counts[g.value];
        const style = { '--g-rgb': g.rgb } as React.CSSProperties;
        return (
          <button
            key={g.id}
            type="button"
            className={`gsw-btn${on ? ' is-on' : ''}`}
            aria-pressed={on}
            aria-label={count != null ? `${g.name}, ${count.toLocaleString()} mods` : g.name}
            tabIndex={on ? 0 : -1}
            onClick={() => select(g.value)}
            style={style}
          >
            {g.icon ? (
              <span className="gsw-ic" style={{ backgroundImage: `url(${g.icon})` }} aria-hidden="true" />
            ) : (
              <span className="gsw-ic is-all" aria-hidden="true">
                {icons.map((ic) => (
                  <i key={ic.id} style={{ backgroundImage: `url(${ic.icon})` }} />
                ))}
              </span>
            )}
            <span className="gsw-name">{g.short}</span>
            {count != null && <span className="gsw-cnt tabular">{fmtCount(count)}</span>}
          </button>
        );
      })}
    </div>
  );
}
