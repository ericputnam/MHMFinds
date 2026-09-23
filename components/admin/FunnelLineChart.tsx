'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

export interface ChartPoint {
  x: string; // YYYY-MM-DD
  y: number | null;
}

export interface ChartSeries {
  id: string;
  label: string;
  color: string;
  points: ChartPoint[];
  dashed?: boolean;
  type?: 'line' | 'bar';
  /** Stroke width for line series (default 2). Threshold lines use a thinner stroke. */
  strokeWidth?: number;
}

export interface ChartEventMarker {
  date: string;
  kind: 'merge' | 'rollback' | 'incident' | 'check' | 'operator';
  label: string;
}

export interface ChartBand {
  start: string; // YYYY-MM-DD, inclusive
  end: string; // YYYY-MM-DD, exclusive edge (one day past the last shaded day)
  color?: string;
  opacity?: number;
}

/** A horizontal reference line (e.g. the 90% / 97% / 100% gates on a %-of-expected chart). */
export interface ChartRefLine {
  y: number;
  label: string;
  color: string;
  dashed?: boolean;
  /** Which end of the line carries the label (default right) — for lines too close to share one. */
  labelSide?: 'left' | 'right';
}

/** A horizontal y-range fill (e.g. "below 90% is red"). Clamped to the visible domain. */
export interface ChartYZone {
  from: number;
  to: number;
  color: string;
  opacity?: number;
}

/** A filled area between two point lists (or down to the axis floor) — used for sloping threshold zones. */
export interface ChartArea {
  upper: ChartPoint[];
  lower: ChartPoint[] | 'floor';
  color: string;
  opacity?: number;
}

interface FunnelLineChartProps {
  series: ChartSeries[];
  events?: ChartEventMarker[];
  bands?: ChartBand[];
  height?: number;
  yFormatter?: (value: number) => string;
  ariaLabel?: string;
  /** Shared hover date — lets several charts on one page move a crosshair together. */
  hoverDate?: string | null;
  onHoverDate?: (date: string | null) => void;
  /** A pinned day (clicked), drawn as a solid hairline. */
  selectedDate?: string | null;
  onSelectDate?: (date: string) => void;
  /** When set, the tooltip adds "% of expected" for this pair of series ids. */
  compare?: { actual: string; expected: string };
  /** Include y = 0 in the scale (default true); false fits the axis to the data. */
  zeroBased?: boolean;
  /** Explicit y domain; overrides zeroBased and the fitted top. */
  yDomain?: [number, number];
  refLines?: ChartRefLine[];
  yZones?: ChartYZone[];
  areas?: ChartArea[];
  /** 'full' = hairline + dot per event; 'ticks' = a small tick on the x axis only; 'none' hides them. */
  markers?: 'full' | 'ticks' | 'none';
  /** Extra tooltip content for the hovered day (e.g. that day's status). */
  tooltipExtra?: (date: string) => React.ReactNode;
  /** Series ids in the order the tooltip lists them (default: draw order). */
  tooltipOrder?: string[];
}

export const EVENT_COLORS: Record<ChartEventMarker['kind'], string> = {
  merge: '#94a3b8', // slate-400
  rollback: '#f87171', // red-400
  incident: '#f87171', // red-400
  check: '#38bdf8', // sky-400
  operator: '#60a5fa', // blue-400
};

function parseDateUTC(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Date.UTC(y, (m || 1) - 1, d || 1);
}

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function weekdayOf(dateStr: string): string {
  return WEEKDAY[new Date(parseDateUTC(dateStr)).getUTCDay()];
}

/** Round a max up to a "nice" axis top so tick labels read as round numbers. */
function niceTop(max: number): number {
  if (max <= 0) return 1;
  const raw = max * 1.08;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((s) => s * mag >= raw) ?? 10;
  return step * mag;
}

/** A 1 / 2 / 2.5 / 5 × 10^n step at least as large as raw. */
function niceStep(raw: number): number {
  if (raw <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * mag >= raw) ?? 10;
  return step * mag;
}

const FALLBACK_WIDTH = 1000; // jsdom / first paint, before ResizeObserver reports
const PAD_LEFT = 56;
const PAD_RIGHT = 16;
const PAD_TOP = 16;
const PAD_BOTTOM = 28;

function useContainerWidth(): [React.RefObject<HTMLDivElement>, number] {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(FALLBACK_WIDTH);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const w = Math.round(entries[0].contentRect.width);
      if (w > 0) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

export default function FunnelLineChart({
  series,
  events = [],
  bands = [],
  height = 260,
  yFormatter = (v: number) => `${v}`,
  ariaLabel,
  hoverDate = null,
  onHoverDate,
  selectedDate = null,
  onSelectDate,
  compare,
  zeroBased = true,
  yDomain,
  refLines = [],
  yZones = [],
  areas = [],
  markers = 'full',
  tooltipExtra,
  tooltipOrder,
}: FunnelLineChartProps) {
  const [wrapRef, WIDTH] = useContainerWidth();
  const [pointerInside, setPointerInside] = useState(false);
  const [focused, setFocused] = useState(false);
  // Local hover when the parent doesn't control it.
  const [localHover, setLocalHover] = useState<string | null>(null);
  const activeHover = onHoverDate ? hoverDate : localHover;
  const setHover = (d: string | null) => (onHoverDate ? onHoverDate(d) : setLocalHover(d));

  const sortedUniqueDates = useMemo(
    () =>
      Array.from(new Set(series.flatMap((s) => s.points.map((p) => p.x)))).sort(
        (a, b) => parseDateUTC(a) - parseDateUTC(b)
      ),
    [series]
  );

  const valueAt = useMemo(() => {
    const m = new Map<string, Map<string, number | null>>();
    for (const s of series) {
      const inner = new Map<string, number | null>();
      for (const p of s.points) inner.set(p.x, p.y);
      m.set(s.id, inner);
    }
    return m;
  }, [series]);

  if (sortedUniqueDates.length === 0) {
    return (
      <div ref={wrapRef} className="flex items-center justify-center text-sm text-slate-500" style={{ height }}>
        No data in this range
      </div>
    );
  }

  const xMin = parseDateUTC(sortedUniqueDates[0]);
  const xMax = parseDateUTC(sortedUniqueDates[sortedUniqueDates.length - 1]);
  const xSpan = Math.max(xMax - xMin, 1);

  const allYValues = series
    .flatMap((s) => s.points.map((p) => p.y))
    .concat(refLines.map((r) => r.y))
    .filter((v): v is number => v !== null);
  const dataMax = allYValues.length > 0 ? Math.max(...allYValues) : 1;
  const dataMin = allYValues.length > 0 ? Math.min(...allYValues) : 0;
  const yTicks = 4;
  // Fitted (non-zero) axes snap to a round step so ticks read $5,000 / $5,500, not $5,300 / $6,200.
  const fitStep = niceStep(((dataMax - dataMin) * 1.3 || Math.abs(dataMax) || 1) / yTicks);
  const yTop = yDomain ? yDomain[1] : zeroBased ? niceTop(dataMax) : Math.ceil((dataMax + (dataMax - dataMin) * 0.08) / fitStep) * fitStep;
  const yMin = yDomain
    ? yDomain[0]
    : zeroBased
      ? 0
      : Math.max(0, Math.floor((dataMin - (dataMax - dataMin) * 0.08) / fitStep) * fitStep);

  const hasBars = series.some((s) => s.type === 'bar');
  const plotW = Math.max(WIDTH - PAD_LEFT - PAD_RIGHT, 50);
  const plotH = height - PAD_TOP - PAD_BOTTOM;
  // Bars need half a slot of breathing room at each edge so the first/last bar isn't clipped.
  const slot = sortedUniqueDates.length > 1 ? plotW / sortedUniqueDates.length : plotW;
  const edge = hasBars ? slot / 2 : 0;

  const xScale = (dateStr: string) => PAD_LEFT + edge + ((parseDateUTC(dateStr) - xMin) / xSpan) * (plotW - 2 * edge);
  const yScale = (value: number) => PAD_TOP + plotH - ((value - yMin) / (yTop - yMin || 1)) * plotH;

  // Explicit domains keep their bounds but still tick on round multiples inside them.
  const domainStep = yDomain ? niceStep((yTop - yMin) / yTicks) : 0;
  const yTickValues = yDomain
    ? Array.from(
        { length: Math.floor((yTop - Math.ceil(yMin / domainStep - 1e-9) * domainStep) / domainStep + 1e-9) + 1 },
        (_, i) => Math.ceil(yMin / domainStep - 1e-9) * domainStep + domainStep * i
      )
    : !zeroBased
      ? Array.from({ length: Math.round((yTop - yMin) / fitStep) + 1 }, (_, i) => yMin + fitStep * i)
      : Array.from({ length: yTicks + 1 }, (_, i) => yMin + ((yTop - yMin) / yTicks) * i);

  const xTickCount = Math.max(2, Math.min(WIDTH < 500 ? 4 : 7, sortedUniqueDates.length));
  const xTickDates =
    sortedUniqueDates.length <= xTickCount
      ? sortedUniqueDates
      : Array.from({ length: xTickCount }, (_, i) =>
          sortedUniqueDates[Math.round((i * (sortedUniqueDates.length - 1)) / (xTickCount - 1))]
        );

  function pathFor(points: ChartPoint[]): string {
    let d = '';
    let started = false;
    for (const p of points) {
      if (p.y === null) {
        started = false;
        continue;
      }
      d += `${started ? 'L' : 'M'}${xScale(p.x).toFixed(2)},${yScale(p.y).toFixed(2)} `;
      started = true;
    }
    return d.trim();
  }

  const clampY = (v: number) => Math.min(yTop, Math.max(yMin, v));
  function areaPath(a: ChartArea): string {
    const up = a.upper.filter((p): p is { x: string; y: number } => p.y !== null);
    if (up.length < 2) return '';
    const lowerAt = new Map<string, number | null>();
    if (a.lower !== 'floor') for (const p of a.lower) lowerAt.set(p.x, p.y);
    const pts = up.filter((p) => a.lower === 'floor' || typeof lowerAt.get(p.x) === 'number');
    if (pts.length < 2) return '';
    const top = pts.map((p) => `${xScale(p.x).toFixed(2)},${yScale(clampY(p.y)).toFixed(2)}`);
    const bottom = pts
      .slice()
      .reverse()
      .map((p) => `${xScale(p.x).toFixed(2)},${yScale(a.lower === 'floor' ? yMin : clampY(lowerAt.get(p.x) as number)).toFixed(2)}`);
    return `M${top.join(' L')} L${bottom.join(' L')} Z`;
  }

  const barSeries = series.filter((s) => s.type === 'bar');
  const barWidth = Math.max(2, Math.min(24, slot - 2));

  const nearestDate = (clientX: number, rect: DOMRect): string => {
    const x = ((clientX - rect.left) / rect.width) * WIDTH;
    let best = sortedUniqueDates[0];
    let bestDist = Infinity;
    for (const d of sortedUniqueDates) {
      const dist = Math.abs(xScale(d) - x);
      if (dist < bestDist) {
        bestDist = dist;
        best = d;
      }
    }
    return best;
  };

  const inDomain = (d: string | null) => d !== null && parseDateUTC(d) >= xMin && parseDateUTC(d) <= xMax;
  const eventsInRange = events.filter((e) => inDomain(e.date));
  const hoverEvents = activeHover ? eventsInRange.filter((e) => e.date === activeHover) : [];
  const showTooltip = (pointerInside || focused) && inDomain(activeHover);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const idx = activeHover ? sortedUniqueDates.indexOf(activeHover) : -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const step = e.key === 'ArrowRight' ? 1 : -1;
      const next = idx < 0 ? (step > 0 ? 0 : sortedUniqueDates.length - 1) : Math.min(sortedUniqueDates.length - 1, Math.max(0, idx + step));
      setHover(sortedUniqueDates[next]);
    } else if ((e.key === 'Enter' || e.key === ' ') && activeHover && onSelectDate) {
      e.preventDefault();
      onSelectDate(activeHover);
    } else if (e.key === 'Escape') {
      setHover(null);
    }
  };

  const hoverX = activeHover && inDomain(activeHover) ? xScale(activeHover) : null;
  const selectedX = selectedDate && inDomain(selectedDate) ? xScale(selectedDate) : null;
  const tooltipLeft = hoverX !== null ? hoverX / WIDTH : 0;

  let compareLine: string | null = null;
  if (showTooltip && compare && activeHover) {
    const a = valueAt.get(compare.actual)?.get(activeHover);
    const ex = valueAt.get(compare.expected)?.get(activeHover);
    if (typeof a === 'number' && typeof ex === 'number' && ex > 0) {
      compareLine = `${Math.round((a / ex) * 100)}% of expected`;
    }
  }

  return (
    <div ref={wrapRef} className="relative w-full select-none">
      <svg
        viewBox={`0 0 ${WIDTH} ${height}`}
        width="100%"
        height={height}
        role="img"
        aria-label={ariaLabel}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          if (!pointerInside) setHover(null);
        }}
        className="outline-none focus-visible:ring-2 focus-visible:ring-sims-pink/60 rounded-md text-slate-300"
        style={{ overflow: 'visible', cursor: onSelectDate ? 'pointer' : 'crosshair' }}
      >
        {/* gridlines + y tick labels */}
        {yTickValues.map((v, i) => (
          <g key={i}>
            <line x1={PAD_LEFT} x2={WIDTH - PAD_RIGHT} y1={yScale(v)} y2={yScale(v)} stroke="currentColor" strokeOpacity={0.08} />
            <text x={PAD_LEFT - 8} y={yScale(v)} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="currentColor" opacity={0.6}>
              {yFormatter(v)}
            </text>
          </g>
        ))}

        {/* x axis labels */}
        {xTickDates.map((d, i) => (
          <text key={i} x={xScale(d)} y={height - 8} textAnchor="middle" fontSize={10} fill="currentColor" opacity={0.6}>
            {d.slice(5)}
          </text>
        ))}

        {/* horizontal zones (e.g. below the 90% gate) */}
        {yZones.map((z, i) => {
          const lo = clampY(Math.min(z.from, z.to));
          const hi = clampY(Math.max(z.from, z.to));
          if (hi <= lo) return null;
          return (
            <rect key={`z${i}`} x={PAD_LEFT} y={yScale(hi)} width={plotW} height={yScale(lo) - yScale(hi)} fill={z.color} opacity={z.opacity ?? 0.08} pointerEvents="none" />
          );
        })}

        {/* areas between two lines (sloping threshold zones) */}
        {areas.map((a, i) => {
          const d = areaPath(a);
          return d ? <path key={`a${i}`} d={d} fill={a.color} opacity={a.opacity ?? 0.1} pointerEvents="none" /> : null;
        })}

        {/* x-range bands (e.g. actual < 80% of expected, or "before the commitment") */}
        {bands.map((b, i) => {
          const x0 = Math.max(PAD_LEFT, xScale(b.start) - (hasBars ? slot / 2 : 0));
          const x1 = Math.min(WIDTH - PAD_RIGHT, hasBars ? xScale(b.end) - slot / 2 : xScale(b.end));
          if (x1 <= x0) return null;
          return (
            <rect key={i} x={x0} y={PAD_TOP} width={Math.max(1, x1 - x0)} height={plotH} fill={b.color || '#ef4444'} opacity={b.opacity ?? 0.12} />
          );
        })}

        {/* horizontal reference lines */}
        {refLines.map((r, i) => {
          if (r.y < yMin || r.y > yTop) return null;
          const y = yScale(r.y);
          return (
            <g key={`r${i}`} pointerEvents="none">
              <line x1={PAD_LEFT} x2={WIDTH - PAD_RIGHT} y1={y} y2={y} stroke={r.color} strokeWidth={1.5} strokeDasharray={r.dashed ? '4 4' : undefined} strokeOpacity={0.9} />
              <text
                x={r.labelSide === 'left' ? PAD_LEFT + 4 : WIDTH - PAD_RIGHT - 4}
                y={y - 4}
                textAnchor={r.labelSide === 'left' ? 'start' : 'end'}
                fontSize={10} fill="currentColor" opacity={0.75}>
                {r.label}
              </text>
            </g>
          );
        })}

        {/* bar series */}
        {barSeries.map((s) => (
          <g key={s.id}>
            {s.points.map((p, i) =>
              p.y === null ? null : (
                <rect
                  key={i}
                  x={xScale(p.x) - barWidth / 2}
                  y={yScale(p.y)}
                  width={barWidth}
                  height={Math.max(0, yScale(yMin) - yScale(p.y))}
                  rx={Math.min(2, barWidth / 4)}
                  fill={s.color}
                  opacity={activeHover && activeHover !== p.x ? 0.55 : 0.9}
                />
              )
            )}
          </g>
        ))}

        {/* line series */}
        {series
          .filter((s) => s.type !== 'bar')
          .map((s) => (
            <path
              key={s.id}
              d={pathFor(s.points)}
              fill="none"
              stroke={s.color}
              strokeWidth={s.strokeWidth ?? 2}
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeDasharray={s.dashed ? '6 4' : undefined}
            />
          ))}

        {/* event markers */}
        {markers !== 'none' &&
          eventsInRange.map((e, i) => {
            const x = xScale(e.date);
            const color = EVENT_COLORS[e.kind];
            if (markers === 'ticks') {
              return (
                <line key={i} x1={x} x2={x} y1={PAD_TOP + plotH + 1} y2={PAD_TOP + plotH + 6} stroke={color} strokeWidth={1.5} pointerEvents="none" />
              );
            }
            return (
              <g key={i} pointerEvents="none">
                <line x1={x} x2={x} y1={PAD_TOP} y2={PAD_TOP + plotH} stroke={color} strokeOpacity={0.35} strokeWidth={1} />
                <circle cx={x} cy={PAD_TOP - 4} r={3} fill={color} />
              </g>
            );
          })}

        {/* pinned day */}
        {selectedX !== null && (
          <line x1={selectedX} x2={selectedX} y1={PAD_TOP} y2={PAD_TOP + plotH} stroke="#f472b6" strokeWidth={1.5} pointerEvents="none" />
        )}

        {/* hover crosshair + point dots */}
        {hoverX !== null && activeHover && (
          <g pointerEvents="none">
            <line x1={hoverX} x2={hoverX} y1={PAD_TOP} y2={PAD_TOP + plotH} stroke="currentColor" strokeOpacity={0.5} strokeWidth={1} />
            {series
              .filter((s) => s.type !== 'bar')
              .map((s) => {
                const v = valueAt.get(s.id)?.get(activeHover);
                if (typeof v !== 'number') return null;
                return <circle key={s.id} cx={hoverX} cy={yScale(v)} r={4} fill={s.color} stroke="#0f172a" strokeWidth={2} />;
              })}
          </g>
        )}

        {/* hit layer — the whole plot is the target; the crosshair snaps to the nearest day */}
        <rect
          x={PAD_LEFT}
          y={0}
          width={plotW}
          height={PAD_TOP + plotH}
          fill="transparent"
          onPointerMove={(e) => {
            const svg = (e.currentTarget as SVGRectElement).ownerSVGElement;
            if (!svg) return;
            setHover(nearestDate(e.clientX, svg.getBoundingClientRect()));
          }}
          onPointerEnter={() => setPointerInside(true)}
          onPointerLeave={() => {
            setPointerInside(false);
            setHover(null);
          }}
          onClick={(e) => {
            if (!onSelectDate) return;
            const svg = (e.currentTarget as SVGRectElement).ownerSVGElement;
            if (!svg) return;
            onSelectDate(nearestDate(e.clientX, svg.getBoundingClientRect()));
          }}
        />
      </svg>

      {showTooltip && activeHover && (
        <div
          className="pointer-events-none absolute top-2 z-10 w-max max-w-[18rem] rounded-lg border border-slate-700 bg-slate-950/95 px-3 py-2 text-xs shadow-xl"
          style={
            tooltipLeft > 0.6
              ? { right: `calc(${(1 - tooltipLeft) * 100}% + 12px)` }
              : { left: `calc(${tooltipLeft * 100}% + 12px)` }
          }
          role="status"
        >
          <div className="mb-1 font-medium text-slate-300">
            {weekdayOf(activeHover)} {activeHover}
          </div>
          {(tooltipOrder
            ? tooltipOrder.map((id) => series.find((s) => s.id === id)).filter((s): s is ChartSeries => !!s)
            : series
          ).map((s) => {
            const v = valueAt.get(s.id)?.get(activeHover);
            if (v === undefined) return null; // series doesn't cover this day (e.g. ramp-only dates)
            return (
              <div key={s.id} className="flex items-center gap-2">
                <span
                  className="inline-block h-0.5 w-3"
                  style={{
                    backgroundColor: s.dashed ? 'transparent' : s.color,
                    borderTop: s.dashed ? `2px dashed ${s.color}` : undefined,
                  }}
                />
                <span className="font-semibold text-white tabular-nums">{typeof v === 'number' ? yFormatter(v) : 'settling'}</span>
                <span className="text-slate-400">{s.label}</span>
              </div>
            );
          })}
          {compareLine && <div className="mt-1 text-slate-300">{compareLine}</div>}
          {tooltipExtra && tooltipExtra(activeHover)}
          {hoverEvents.length > 0 && (
            <div className="mt-2 space-y-1 border-t border-slate-800 pt-2">
              {hoverEvents.slice(0, 4).map((e, i) => (
                <div key={i} className="flex gap-1.5 text-slate-300">
                  <span className="mt-1 inline-block h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: EVENT_COLORS[e.kind] }} />
                  <span className="line-clamp-2">{e.label}</span>
                </div>
              ))}
              {hoverEvents.length > 4 && <div className="text-slate-500">+{hoverEvents.length - 4} more</div>}
            </div>
          )}
          {onSelectDate && <div className="mt-1 text-slate-500">Click to pin this day</div>}
        </div>
      )}
    </div>
  );
}
