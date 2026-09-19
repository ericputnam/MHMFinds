'use client';

import React from 'react';

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
}

export interface ChartEventMarker {
  date: string;
  kind: 'merge' | 'rollback' | 'incident' | 'check' | 'operator';
  label: string;
}

export interface ChartBand {
  start: string; // YYYY-MM-DD, inclusive
  end: string; // YYYY-MM-DD, inclusive
  color?: string;
}

interface FunnelLineChartProps {
  series: ChartSeries[];
  events?: ChartEventMarker[];
  bands?: ChartBand[];
  height?: number;
  yFormatter?: (value: number) => string;
  ariaLabel?: string;
}

const EVENT_COLORS: Record<ChartEventMarker['kind'], string> = {
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

const WIDTH = 1000;
const PAD_LEFT = 56;
const PAD_RIGHT = 16;
const PAD_TOP = 16;
const PAD_BOTTOM = 28;

export default function FunnelLineChart({
  series,
  events = [],
  bands = [],
  height = 260,
  yFormatter = (v: number) => `${v}`,
  ariaLabel,
}: FunnelLineChartProps) {
  const allDates = series.flatMap((s) => s.points.map((p) => p.x));
  if (allDates.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-slate-500" style={{ height }}>
        No data yet
      </div>
    );
  }

  const xMin = Math.min(...allDates.map(parseDateUTC));
  const xMax = Math.max(...allDates.map(parseDateUTC));
  const xSpan = Math.max(xMax - xMin, 1);

  const allYValues = series.flatMap((s) => s.points.map((p) => p.y)).filter((v): v is number => v !== null);
  const yMax = allYValues.length > 0 ? Math.max(...allYValues) : 1;
  const yMin = 0;
  const yTop = yMax <= 0 ? 1 : yMax * 1.1;

  const plotW = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotH = height - PAD_TOP - PAD_BOTTOM;

  const xScale = (dateStr: string) => PAD_LEFT + ((parseDateUTC(dateStr) - xMin) / xSpan) * plotW;
  const yScale = (value: number) => PAD_TOP + plotH - ((value - yMin) / (yTop - yMin)) * plotH;

  const yTicks = 4;
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) => (yTop / yTicks) * i);

  const xTickCount = Math.min(6, allDates.length);
  const sortedUniqueDates = Array.from(new Set(allDates)).sort((a, b) => parseDateUTC(a) - parseDateUTC(b));
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
      const cmd = started ? 'L' : 'M';
      d += `${cmd}${xScale(p.x).toFixed(2)},${yScale(p.y).toFixed(2)} `;
      started = true;
    }
    return d.trim();
  }

  const barSeries = series.filter((s) => s.type === 'bar');
  const barWidth = barSeries.length > 0 && allDates.length > 1 ? Math.max(2, plotW / sortedUniqueDates.length - 2) : 4;

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${height}`}
      width="100%"
      height={height}
      role="img"
      aria-label={ariaLabel}
      style={{ overflow: 'visible' }}
    >
      {/* gridlines + y tick labels */}
      {yTickValues.map((v, i) => (
        <g key={i}>
          <line
            x1={PAD_LEFT}
            x2={WIDTH - PAD_RIGHT}
            y1={yScale(v)}
            y2={yScale(v)}
            stroke="currentColor"
            strokeOpacity={0.08}
          />
          <text x={PAD_LEFT - 8} y={yScale(v)} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="currentColor" opacity={0.6}>
            {yFormatter(v)}
          </text>
        </g>
      ))}

      {/* x axis labels */}
      {xTickDates.map((d, i) => (
        <text
          key={i}
          x={xScale(d)}
          y={height - 8}
          textAnchor="middle"
          fontSize={10}
          fill="currentColor"
          opacity={0.6}
        >
          {d.slice(5)}
        </text>
      ))}

      {/* threshold bands (e.g. actual < 80% of expected) */}
      {bands.map((b, i) => (
        <rect
          key={i}
          x={xScale(b.start)}
          y={PAD_TOP}
          width={Math.max(1, xScale(b.end) - xScale(b.start))}
          height={plotH}
          fill={b.color || '#ef4444'}
          opacity={0.12}
        />
      ))}

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
                height={Math.max(0, yScale(0) - yScale(p.y))}
                fill={s.color}
                opacity={0.85}
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
            strokeWidth={2}
            strokeDasharray={s.dashed ? '6 4' : undefined}
          />
        ))}

      {/* event markers */}
      {events.map((e, i) => {
        if (parseDateUTC(e.date) < xMin || parseDateUTC(e.date) > xMax) return null;
        const x = xScale(e.date);
        const color = EVENT_COLORS[e.kind];
        return (
          <g key={i}>
            <line x1={x} x2={x} y1={PAD_TOP} y2={PAD_TOP + plotH} stroke={color} strokeOpacity={0.5} strokeWidth={1.5}>
              <title>{`${e.date} — ${e.kind}: ${e.label}`}</title>
            </line>
            <circle cx={x} cy={PAD_TOP} r={3} fill={color}>
              <title>{`${e.date} — ${e.kind}: ${e.label}`}</title>
            </circle>
          </g>
        );
      })}
    </svg>
  );
}
