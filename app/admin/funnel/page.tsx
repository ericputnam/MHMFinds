'use client';

import React, { useEffect, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, GitCommit, RotateCcw, Siren, User } from 'lucide-react';
import FunnelLineChart, { ChartBand, ChartEventMarker, ChartPoint } from '@/components/admin/FunnelLineChart';
import {
  FunnelHistory,
  addDaysUTC,
  computeRolling28d,
  formatCurrency,
  formatCompactNumber,
  formatPercent,
  gradeVerdict,
  isBelowThreshold,
  latestFinalizedRolling28d,
  Verdict,
} from '@/lib/funnel/dashboardMath';

const EVENT_ICONS: Record<ChartEventMarker['kind'], React.ComponentType<{ className?: string }>> = {
  merge: GitCommit,
  rollback: RotateCcw,
  incident: Siren,
  check: CheckCircle2,
  operator: User,
};

const EVENT_LABEL_COLOR: Record<ChartEventMarker['kind'], string> = {
  merge: 'text-slate-400',
  rollback: 'text-red-400',
  incident: 'text-red-400',
  check: 'text-sky-400',
  operator: 'text-blue-400',
};

const VERDICT_STYLES: Record<Verdict['color'], { bg: string; border: string; text: string; label: string }> = {
  green: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', label: 'On track' },
  yellow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', label: 'Behind pace' },
  red: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', label: 'Off track' },
};

export default function FunnelDashboardPage() {
  const [history, setHistory] = useState<FunnelHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/admin/funnel/history');
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setErrorMessage(body?.error || `Failed to load funnel history (${response.status})`);
        setHistory(null);
        return;
      }
      const data = (await response.json()) as FunnelHistory;
      setHistory(data);
    } catch (error) {
      console.error('Failed to fetch funnel history:', error);
      setErrorMessage('Failed to load funnel history');
      setHistory(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-400">Loading funnel scoreboard...</div>
      </div>
    );
  }

  if (!history) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="text-red-400 text-lg">Couldn&apos;t load the funnel scoreboard</div>
        <div className="text-slate-400 text-sm">{errorMessage || 'Unknown error'}</div>
        {errorMessage === 'history not generated yet' && (
          <div className="text-slate-500 text-sm max-w-md text-center">
            The daily funnel runner hasn&apos;t committed <code className="text-slate-400">reports/funnel/history.json</code> yet.
            This page will populate after its first run.
          </div>
        )}
        <button
          onClick={fetchHistory}
          className="bg-sims-pink hover:bg-sims-pink/90 text-white px-6 py-2 rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return <FunnelDashboard history={history} />;
}

function FunnelDashboard({ history }: { history: FunnelHistory }) {
  const { expectation, days, events } = history;

  const rolling = computeRolling28d(days);
  const latest = latestFinalizedRolling28d(rolling);
  const verdict = latest ? gradeVerdict(expectation, latest) : null;

  // Chart 1 & 2: 28d rolling actual vs expectation ramp, from team start to expectation end.
  const rollingInWindow = rolling.filter(
    (p) => p.date >= expectation.startDate && p.date <= expectation.endDate
  );
  const revenueActualPoints: ChartPoint[] = rollingInWindow.map((p) => ({ x: p.date, y: p.actualRevenue28d }));
  const sessionsActualPoints: ChartPoint[] = rollingInWindow.map((p) => ({ x: p.date, y: p.actualSessions28d }));
  const revenueExpectedPoints: ChartPoint[] = [
    { x: expectation.startDate, y: expectation.revenue28dStart },
    { x: expectation.endDate, y: expectation.revenue28dEnd },
  ];
  const sessionsExpectedPoints: ChartPoint[] = [
    { x: expectation.startDate, y: expectation.sessions28dStart },
    { x: expectation.endDate, y: expectation.sessions28dEnd },
  ];

  // Chart 3: last 60 days daily revenue vs same-weekday expectation, with a red band where actual < 80% of expected.
  const last60 = days.slice(-60);
  const dailyRevenuePoints: ChartPoint[] = last60.map((d) => ({ x: d.date, y: d.revenue }));
  const dailyExpectedPoints: ChartPoint[] = last60.map((d) => ({ x: d.date, y: d.expectedRevenue }));
  const dailyBands = buildBelowThresholdBands(last60.map((d) => ({ date: d.date, actual: d.revenue, expected: d.expectedRevenue })));

  const chartEvents: ChartEventMarker[] = events.map((e) => ({ date: e.date, kind: e.kind, label: e.label }));
  const recentEvents = [...events].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 30);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Funnel team scoreboard</h1>
        <p className="text-slate-400">
          Grading the automated funnel team against the expectation it committed to on {expectation.startDate}.
        </p>
      </div>

      <VerdictBanner verdict={verdict} />

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-bold text-white mb-2">How to read this</h2>
        <ul className="text-sm text-slate-400 space-y-1 list-disc list-inside">
          <li>Solid lines are what actually happened (finalized Mediavine days only); dashed lines are the ramp the team committed to.</li>
          <li>A metric only counts as &quot;on track&quot; once both revenue AND sessions clear the bar — rising RPM on falling traffic is graded behind pace, not ahead.</li>
          <li>Vertical ticks mark merges, rollbacks, incidents, checks, and operator notes — hover one to see what happened that day.</li>
        </ul>
      </div>

      <ChartCard
        title="28-day rolling revenue"
        subtitle="Actual (Mediavine + pro-rated non-ad monthly) vs the committed ramp"
      >
        <FunnelLineChart
          ariaLabel="28 day rolling revenue, actual versus expectation"
          height={260}
          yFormatter={(v) => formatCurrency(v)}
          events={chartEvents}
          series={[
            { id: 'actual', label: 'Actual', color: '#22c55e', points: revenueActualPoints },
            { id: 'expected', label: 'Expected', color: '#94a3b8', points: revenueExpectedPoints, dashed: true },
          ]}
        />
        <ChartLegend
          items={[
            { color: '#22c55e', label: 'Actual (finalized 28d rolling total)' },
            { color: '#94a3b8', label: 'Expectation ramp', dashed: true },
          ]}
        />
      </ChartCard>

      <ChartCard
        title="28-day rolling sessions"
        subtitle="Actual GA4 sessions vs the committed ramp"
      >
        <FunnelLineChart
          ariaLabel="28 day rolling sessions, actual versus expectation"
          height={260}
          yFormatter={(v) => formatCompactNumber(v)}
          events={chartEvents}
          series={[
            { id: 'actual', label: 'Actual', color: '#38bdf8', points: sessionsActualPoints },
            { id: 'expected', label: 'Expected', color: '#94a3b8', points: sessionsExpectedPoints, dashed: true },
          ]}
        />
        <ChartLegend
          items={[
            { color: '#38bdf8', label: 'Actual (finalized 28d rolling total)' },
            { color: '#94a3b8', label: 'Expectation ramp', dashed: true },
          ]}
        />
      </ChartCard>

      <ChartCard
        title="Daily Mediavine revenue"
        subtitle="Last 60 days vs same-weekday prior-4-week mean, shaded red where actual fell below 80% of expected"
      >
        <FunnelLineChart
          ariaLabel="Daily Mediavine revenue, last 60 days, actual versus same weekday expectation"
          height={260}
          yFormatter={(v) => formatCurrency(v)}
          events={chartEvents}
          bands={dailyBands}
          series={[
            { id: 'actual', label: 'Actual', color: '#ec4899', points: dailyRevenuePoints, type: 'bar' },
            { id: 'expected', label: 'Expected', color: '#94a3b8', points: dailyExpectedPoints, dashed: true },
          ]}
        />
        <ChartLegend
          items={[
            { color: '#ec4899', label: 'Actual daily revenue' },
            { color: '#94a3b8', label: 'Expected (same weekday, prior 4 weeks)', dashed: true },
            { color: '#ef4444', label: 'Actual < 80% of expected', swatch: true },
          ]}
        />
      </ChartCard>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-sims-pink" />
          Recent events
        </h2>
        {recentEvents.length === 0 ? (
          <p className="text-slate-500 text-sm">No events recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-800">
                  <th className="py-2 pr-4 font-medium">Date</th>
                  <th className="py-2 pr-4 font-medium">Kind</th>
                  <th className="py-2 pr-4 font-medium">Label</th>
                  <th className="py-2 pr-4 font-medium">Result</th>
                </tr>
              </thead>
              <tbody>
                {recentEvents.map((e, i) => {
                  const Icon = EVENT_ICONS[e.kind];
                  return (
                    <tr key={`${e.date}-${i}`} className="border-b border-slate-800/60">
                      <td className="py-2 pr-4 text-slate-400 whitespace-nowrap">{e.date}</td>
                      <td className={`py-2 pr-4 whitespace-nowrap ${EVENT_LABEL_COLOR[e.kind]}`}>
                        <span className="inline-flex items-center gap-1.5">
                          <Icon className="h-3.5 w-3.5" />
                          {e.kind}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-slate-300">
                        {e.label}
                        {e.commit && <span className="text-slate-500"> ({e.commit})</span>}
                      </td>
                      <td className="py-2 pr-4 text-slate-500">{e.result || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="text-xs text-slate-500 space-y-1">
        <p>Generated {new Date(history.generatedAt).toLocaleString()}</p>
        <p>{expectation.basis}</p>
        <p>
          Data is Mediavine finalized days only (recent days can be null while they settle); this page is regenerated
          by the daily funnel runner and committed to <code className="text-slate-400">reports/funnel/history.json</code>.
        </p>
      </div>
    </div>
  );
}

function VerdictBanner({ verdict }: { verdict: Verdict | null }) {
  if (!verdict) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-slate-500 flex-shrink-0" />
        <p className="text-slate-400 text-sm">
          Not enough finalized history yet for a 28-day rolling verdict.
        </p>
      </div>
    );
  }

  const style = VERDICT_STYLES[verdict.color];
  const Icon = verdict.color === 'green' ? CheckCircle2 : verdict.color === 'yellow' ? AlertTriangle : Siren;

  return (
    <div className={`rounded-xl p-6 border ${style.bg} ${style.border}`}>
      <div className="flex items-start gap-3">
        <Icon className={`h-6 w-6 flex-shrink-0 ${style.text}`} />
        <div className="space-y-2">
          <h2 className={`text-xl font-bold ${style.text}`}>{style.label}</h2>
          <p className="text-slate-200">
            Revenue: {formatCurrency(verdict.actualRevenue28d)} vs {formatCurrency(verdict.expectedRevenue28d)} expected (
            {formatSignedPercent(verdict.revenuePct)})
          </p>
          <p className="text-slate-200">
            Sessions: {formatCompactNumber(verdict.actualSessions28d)} vs {formatCompactNumber(verdict.expectedSessions28d)} expected (
            {formatSignedPercent(verdict.sessionsPct)})
          </p>
          <p className="text-sm text-slate-400">
            as of {verdict.date} · Grade requires both revenue and sessions — RPM gains with falling sessions do not count.
          </p>
        </div>
      </div>
    </div>
  );
}

function formatSignedPercent(pctOfExpected: number): string {
  const delta = pctOfExpected - 1;
  const sign = delta >= 0 ? '+' : '−';
  return `${sign}${formatPercent(Math.abs(delta))}`;
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-white">{title}</h2>
        <p className="text-sm text-slate-400">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function ChartLegend({
  items,
}: {
  items: Array<{ color: string; label: string; dashed?: boolean; swatch?: boolean }>;
}) {
  return (
    <div className="flex flex-wrap gap-4 mt-4 text-xs text-slate-400">
      {items.map((item, i) => (
        <span key={i} className="inline-flex items-center gap-2">
          {item.swatch ? (
            <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: item.color, opacity: 0.3 }} />
          ) : (
            <span
              className="inline-block w-4 h-0.5"
              style={{
                backgroundColor: item.color,
                backgroundImage: item.dashed
                  ? `repeating-linear-gradient(to right, ${item.color} 0, ${item.color} 3px, transparent 3px, transparent 6px)`
                  : undefined,
              }}
            />
          )}
          {item.label}
        </span>
      ))}
    </div>
  );
}

/** Merge consecutive below-80%-of-expected days into single-day-wide bands for shading. */
function buildBelowThresholdBands(
  points: Array<{ date: string; actual: number | null; expected: number | null }>
): ChartBand[] {
  const bands: ChartBand[] = [];
  let runStart: string | null = null;
  let runEnd: string | null = null;

  for (const p of points) {
    const below = isBelowThreshold(p.actual, p.expected, 0.8);
    if (below) {
      if (runStart === null) runStart = p.date;
      runEnd = p.date;
    } else if (runStart !== null && runEnd !== null) {
      bands.push({ start: runStart, end: addDaysUTC(runEnd, 1) });
      runStart = null;
      runEnd = null;
    }
  }
  if (runStart !== null && runEnd !== null) {
    bands.push({ start: runStart, end: addDaysUTC(runEnd, 1) });
  }
  return bands;
}
