'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  GitCommit,
  Info,
  RefreshCw,
  RotateCcw,
  Search,
  Siren,
  User,
  X,
} from 'lucide-react';
import FunnelLineChart, { ChartArea, ChartBand, ChartEventMarker, ChartPoint, EVENT_COLORS } from '@/components/admin/FunnelLineChart';
import {
  FunnelDayRecord,
  FunnelEvent,
  FunnelHistory,
  addDaysUTC,
  computeRolling28d,
  counterChange,
  eventActor,
  expectedRevenueAt,
  expectedSessionsAt,
  formatCurrency,
  formatCompactNumber,
  formatPercent,
  gradeVerdict,
  isBelowThreshold,
  lastFinalizedDay,
  latestFinalizedRolling28d,
  pctChange,
  resultTone,
  Rolling28dPoint,
  sliceLastNDays,
  StatusPoint,
  StatusScorecard,
  statusScorecard,
  statusSeries,
  summarizeRange,
  summarizeWindow,
  Verdict,
  VERDICT_GATES,
  VerdictColor,
  weeklySummary,
} from '@/lib/funnel/dashboardMath';

/*
 * /admin/funnel — the operator's scoreboard for the automated funnel team.
 *
 * Read-only view over reports/funnel/history.json, which the daily runner
 * (scripts/agents/funnel-history.ts) owns. Everything interactive here is
 * derived client-side from that file; the page never writes anything and the
 * JSON schema is a contract we do not change from this side.
 */

type EventKind = FunnelEvent['kind'];
const EVENT_KINDS: EventKind[] = ['merge', 'rollback', 'incident', 'check', 'operator'];

const EVENT_ICONS: Record<EventKind, React.ComponentType<{ className?: string }>> = {
  merge: GitCommit,
  rollback: RotateCcw,
  incident: Siren,
  check: CheckCircle2,
  operator: User,
};

const EVENT_LABEL_COLOR: Record<EventKind, string> = {
  merge: 'text-slate-300',
  rollback: 'text-red-400',
  incident: 'text-red-400',
  check: 'text-sky-400',
  operator: 'text-blue-400',
};

const VERDICT_STYLES: Record<Verdict['color'], { bg: string; border: string; text: string; bar: string; label: string }> = {
  green: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', bar: 'bg-emerald-400', label: 'On track' },
  yellow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', bar: 'bg-yellow-400', label: 'Behind pace' },
  red: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', bar: 'bg-red-400', label: 'Off track' },
};

const RANGES: Array<{ days: number; label: string }> = [
  { days: 14, label: '14d' },
  { days: 30, label: '30d' },
  { days: 60, label: '60d' },
  { days: 90, label: '90d' },
  { days: 0, label: 'All' },
];

type MetricKey = 'revenue' | 'sessions' | 'rpm' | 'ownedAdds7d' | 'pinterestSessions7d' | 'nonAdMonthly';

interface MetricDef {
  tab: string;
  title: string;
  subtitle: string;
  color: string;
  type: 'bar' | 'line';
  get: (d: FunnelDayRecord) => number | null;
  expected?: (d: FunnelDayRecord) => number | null;
  fmt: (v: number) => string;
  zeroBased?: boolean;
}

const formatCurrency2 = (v: number) => `$${v.toFixed(2)}`;
const formatInt = (v: number) => Math.round(v).toLocaleString('en-US');

const METRICS: Record<MetricKey, MetricDef> = {
  revenue: {
    tab: 'Revenue',
    title: 'Daily Mediavine revenue',
    subtitle: 'Bars are finalized days; dashed line is the same-weekday prior-4-week mean. Red shading = below 80% of expected.',
    color: '#ec4899',
    type: 'bar',
    get: (d) => d.revenue,
    expected: (d) => d.expectedRevenue,
    fmt: formatCurrency,
  },
  sessions: {
    tab: 'Sessions',
    title: 'Daily sessions',
    subtitle: 'GA4 sessions vs the same-weekday prior-4-week mean. Red shading = below 80% of expected.',
    color: '#38bdf8',
    type: 'bar',
    get: (d) => d.sessions,
    expected: (d) => d.expectedSessions,
    fmt: formatCompactNumber,
  },
  rpm: {
    tab: 'RPM',
    title: 'Session RPM',
    subtitle: 'Mediavine revenue per 1,000 sessions. Axis is fitted to the data, not zero-based.',
    color: '#a78bfa',
    type: 'line',
    get: (d) => d.rpm,
    fmt: formatCurrency2,
    zeroBased: false,
  },
  ownedAdds7d: {
    tab: 'Owned adds',
    title: 'Owned-audience net adds (trailing 7d)',
    subtitle: 'Email + Patreon free + accounts, from the daily scoreboard. Headline metric #1.',
    color: '#22c55e',
    type: 'line',
    get: (d) => d.ownedAdds7d,
    fmt: formatInt,
  },
  pinterestSessions7d: {
    tab: 'Pinterest',
    title: 'Pinterest sessions (trailing 7d)',
    subtitle: 'GA4 sessions from Pinterest over the trailing week, from the daily scoreboard.',
    color: '#f59e0b',
    type: 'line',
    get: (d) => d.pinterestSessions7d,
    fmt: formatCompactNumber,
  },
  nonAdMonthly: {
    tab: 'Non-ad',
    title: 'Non-ad revenue (monthly run-rate)',
    subtitle: 'Patreon, affiliates, first-party — the run-rate the scoreboard records each day. Headline metric #2.',
    color: '#34d399',
    type: 'line',
    get: (d) => d.nonAdMonthly,
    fmt: formatCurrency,
  },
};

export default function FunnelDashboardPage() {
  const [history, setHistory] = useState<FunnelHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchHistory = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/admin/funnel/history', { cache: 'no-store' });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setErrorMessage(body?.error || `Failed to load funnel history (${response.status})`);
        // A failed refresh keeps the last good render instead of blanking the page.
        if (!isRefresh) setHistory(null);
        return;
      }
      const data = (await response.json()) as FunnelHistory;
      setHistory(data);
    } catch (error) {
      console.error('Failed to fetch funnel history:', error);
      setErrorMessage('Failed to load funnel history');
      if (!isRefresh) setHistory(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

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
          onClick={() => fetchHistory()}
          className="bg-sims-pink hover:bg-sims-pink/90 text-white px-6 py-2 rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <FunnelDashboard
      history={history}
      refreshing={refreshing}
      refreshError={errorMessage}
      onRefresh={() => fetchHistory(true)}
    />
  );
}

function FunnelDashboard({
  history,
  refreshing,
  refreshError,
  onRefresh,
}: {
  history: FunnelHistory;
  refreshing: boolean;
  refreshError: string | null;
  onRefresh: () => void;
}) {
  const { expectation, days, events } = history;

  const [rangeDays, setRangeDays] = useState(60);
  const [metric, setMetric] = useState<MetricKey>('revenue');
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [kinds, setKinds] = useState<Set<EventKind>>(() => new Set(EVENT_KINDS));

  const toggleKind = (k: EventKind) =>
    setKinds((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  // ---- derived data ----------------------------------------------------------
  const rolling = useMemo(() => computeRolling28d(days), [days]);
  const latest = latestFinalizedRolling28d(rolling);
  const verdict = latest ? gradeVerdict(expectation, latest) : null;
  const lastDay = lastFinalizedDay(days);
  const lastDate = days.length > 0 ? days[days.length - 1].date : null;
  const settlingDays = lastDay ? days.filter((d) => d.date > lastDay.date).length : days.length;

  const rangeDaysRows = useMemo(() => sliceLastNDays(days, rangeDays), [days, rangeDays]);
  const rangeStart = rangeDaysRows.length > 0 ? rangeDaysRows[0].date : null;

  const kindCounts = useMemo(() => {
    const c: Record<EventKind, number> = { merge: 0, rollback: 0, incident: 0, check: 0, operator: 0 };
    for (const e of events) if (!rangeStart || e.date >= rangeStart) c[e.kind]++;
    return c;
  }, [events, rangeStart]);

  const chartEvents: ChartEventMarker[] = useMemo(
    () => events.filter((e) => kinds.has(e.kind)).map((e) => ({ date: e.date, kind: e.kind, label: e.label })),
    [events, kinds]
  );

  // Every finalized day re-graded against the ramp — the history behind the verdict.
  const status = useMemo(() => statusSeries(expectation, rolling), [expectation, rolling]);
  const scorecard = useMemo(() => statusScorecard(status, expectation.startDate), [status, expectation.startDate]);

  // 28d rolling vs ramp — follows the range; optionally extends the ramp to the end date.
  const [showFullRamp, setShowFullRamp] = useState(false);
  const rollingInRange = useMemo(() => {
    const firstFull = rolling.find((p) => p.actualRevenue28d !== null)?.date ?? null;
    return rolling.filter((p) => (!rangeStart || p.date >= rangeStart) && (!firstFull || p.date >= firstFull));
  }, [rolling, rangeStart]);
  const rampDates = useMemo(() => {
    const out = rollingInRange.map((p) => p.date);
    if (showFullRamp && lastDate) {
      for (let d = addDaysUTC(lastDate, 1); d <= expectation.endDate; d = addDaysUTC(d, 1)) out.push(d);
    }
    return out;
  }, [rollingInRange, showFullRamp, lastDate, expectation.endDate]);
  const preCommitmentBands: ChartBand[] =
    rampDates.length > 0 && rampDates[0] < expectation.startDate
      ? [{ start: rampDates[0], end: expectation.startDate, color: '#64748b', opacity: 0.08 }]
      : [];

  // Explorer chart for the selected metric over the selected range.
  const m = METRICS[metric];
  const explorerSeries = [
    { id: 'actual', label: 'Actual', color: m.color, type: m.type, points: rangeDaysRows.map((d) => ({ x: d.date, y: m.get(d) })) },
    ...(m.expected
      ? [{ id: 'expected', label: 'Expected', color: '#94a3b8', dashed: true, points: rangeDaysRows.map((d) => ({ x: d.date, y: m.expected!(d) })) }]
      : []),
  ];
  const explorerBands = m.expected
    ? buildBelowThresholdBands(rangeDaysRows.map((d) => ({ date: d.date, actual: m.get(d), expected: m.expected!(d) })))
    : [];

  const weeks = useMemo(() => weeklySummary(rangeDaysRows, events), [rangeDaysRows, events]);

  const selectDate = (d: string) => setSelectedDate((cur) => (cur === d ? null : d));

  return (
    <div className={`space-y-6 transition-opacity ${refreshing ? 'opacity-60' : ''}`}>
      {/* ---- header ---- */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Funnel team scoreboard</h1>
          <p className="text-slate-400 text-sm">
            Grading the automated funnel team against the expectation it committed to on {expectation.startDate}.
          </p>
          <p className="text-slate-500 text-xs mt-1">
            Finalized through <span className="text-slate-300">{lastDay?.date ?? '—'}</span>
            {settlingDays > 0 && <> · {settlingDays} day{settlingDays === 1 ? '' : 's'} still settling</>}
            {' '}· generated {new Date(history.generatedAt).toLocaleString()}
            {refreshError && <span className="text-red-400"> · refresh failed: {refreshError}</span>}
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 self-start rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50 md:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ---- filter row: scopes every chart, tile and table below ---- */}
      <div className="sticky top-0 z-20 -mx-2 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-slate-800 bg-slate-950/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-slate-500">Range</span>
          <div className="inline-flex rounded-lg border border-slate-700 p-0.5" role="group" aria-label="Date range">
            {RANGES.map((r) => (
              <button
                key={r.days}
                onClick={() => setRangeDays(r.days)}
                aria-pressed={rangeDays === r.days}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  rangeDays === r.days ? 'bg-sims-pink text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-slate-500">Events</span>
          {EVENT_KINDS.map((k) => {
            const Icon = EVENT_ICONS[k];
            const on = kinds.has(k);
            return (
              <button
                key={k}
                onClick={() => toggleKind(k)}
                aria-pressed={on}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                  on ? 'border-slate-600 bg-slate-800 text-slate-200' : 'border-slate-800 text-slate-500 line-through'
                }`}
              >
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: EVENT_COLORS[k], opacity: on ? 1 : 0.3 }} />
                <Icon className="h-3 w-3" />
                {k}
                <span className="tabular-nums text-slate-500">{kindCounts[k]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <VerdictBanner verdict={verdict} expectation={expectation} days={days} lastDate={lastDay?.date ?? null} />

      <OnTrackSection
        expectation={expectation}
        status={status}
        scorecard={scorecard}
        rangeDates={rangeDaysRows.map((d) => d.date)}
        hoverDate={hoverDate}
        onHoverDate={setHoverDate}
        selectedDate={selectedDate}
        onSelectDate={selectDate}
      />

      {/* ---- KPI tiles — click one to open it in the explorer ---- */}
      <KpiTiles
        days={days}
        rangeDays={rangeDays}
        rangeRows={rangeDaysRows}
        lastDay={lastDay}
        verdict={verdict}
        active={metric}
        onPick={(k) => {
          setMetric(k);
          document.getElementById('funnel-explorer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}
      />

      {/* ---- metric explorer ---- */}
      <div id="funnel-explorer" className="scroll-mt-20 bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">{m.title}</h2>
            <p className="text-sm text-slate-400">{m.subtitle}</p>
          </div>
          <div className="flex flex-wrap gap-1" role="tablist" aria-label="Metric">
            {(Object.keys(METRICS) as MetricKey[]).map((k) => (
              <button
                key={k}
                role="tab"
                aria-selected={metric === k}
                onClick={() => setMetric(k)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  metric === k ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {METRICS[k].tab}
              </button>
            ))}
          </div>
        </div>
        <FunnelLineChart
          ariaLabel={`${m.title}, ${rangeDays ? `last ${rangeDays} days` : 'all days'}. Use arrow keys to step through days and Enter to pin one.`}
          height={280}
          yFormatter={m.fmt}
          events={chartEvents}
          bands={explorerBands}
          series={explorerSeries}
          hoverDate={hoverDate}
          onHoverDate={setHoverDate}
          selectedDate={selectedDate}
          onSelectDate={selectDate}
          compare={m.expected ? { actual: 'actual', expected: 'expected' } : undefined}
          zeroBased={m.zeroBased ?? true}
        />
        <ChartLegend
          items={[
            { color: m.color, label: m.type === 'bar' ? 'Actual (finalized)' : 'Actual', swatch: m.type === 'bar' },
            ...(m.expected ? [{ color: '#94a3b8', label: 'Expected (same weekday, prior 4 weeks)', dashed: true }] : []),
            ...(m.expected ? [{ color: '#ef4444', label: 'Actual < 80% of expected', swatch: true, faint: true }] : []),
          ]}
        />
      </div>

      {selectedDate && (
        <DayDetail
          date={selectedDate}
          days={days}
          events={events}
          onClose={() => setSelectedDate(null)}
          onStep={(n) => setSelectedDate((d) => (d ? addDaysUTC(d, n) : d))}
        />
      )}

      {/* ---- the commitment: 28d rolling vs the ramp, with the 90% / 97% gates drawn ---- */}
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">The commitment, in 28-day totals</h2>
            <p className="text-sm text-slate-400">
              Green line = {formatPercent(VERDICT_GATES.green)} of the ramp (at or above is on track). Red line ={' '}
              {formatPercent(VERDICT_GATES.red)} (below is off track). The shaded band between them is behind pace.
            </p>
          </div>
          <button
            onClick={() => setShowFullRamp((v) => !v)}
            aria-pressed={showFullRamp}
            className={`self-start rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors sm:self-auto ${
              showFullRamp ? 'border-slate-500 bg-slate-800 text-white' : 'border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            {showFullRamp ? 'Hide' : 'Show'} ramp through {expectation.endDate}
          </button>
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <RollingCommitmentChart
            title="28-day rolling revenue"
            subtitle="Mediavine + pro-rated non-ad over the trailing 28 days"
            color="#ec4899"
            fmt={formatCurrency}
            rolling={rollingInRange}
            get={(p) => p.actualRevenue28d}
            expectedAt={(d) => expectedRevenueAt(expectation, d)}
            rampDates={rampDates}
            rampEndLabel={`Ramp to ${formatCurrency(expectation.revenue28dEnd)} by ${expectation.endDate}`}
            bands={preCommitmentBands}
            events={chartEvents}
            hoverDate={hoverDate}
            onHoverDate={setHoverDate}
            selectedDate={selectedDate}
            onSelectDate={selectDate}
          />
          <RollingCommitmentChart
            title="28-day rolling sessions"
            subtitle="GA4 sessions over the trailing 28 days"
            color="#38bdf8"
            fmt={formatCompactNumber}
            rolling={rollingInRange}
            get={(p) => p.actualSessions28d}
            expectedAt={(d) => expectedSessionsAt(expectation, d)}
            rampDates={rampDates}
            rampEndLabel={`Ramp to ${formatCompactNumber(expectation.sessions28dEnd)} by ${expectation.endDate}`}
            bands={preCommitmentBands}
            events={chartEvents}
            hoverDate={hoverDate}
            onHoverDate={setHoverDate}
            selectedDate={selectedDate}
            onSelectDate={selectDate}
          />
        </div>
      </div>

      <WeeklyTable weeks={weeks} onPick={(d) => setSelectedDate(d)} />

      <EventsPanel
        events={events}
        kinds={kinds}
        rangeStart={rangeStart}
        selectedDate={selectedDate}
        onPickDate={(d) => setSelectedDate(d)}
      />

      <details className="group rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">
        <summary className="flex cursor-pointer list-none items-center gap-2 font-medium text-slate-300">
          <Info className="h-4 w-4" /> How to read this page
        </summary>
        <ul className="mt-3 list-disc list-inside space-y-1">
          <li>Solid marks are what actually happened (finalized Mediavine days only); dashed lines are expectations.</li>
          <li>The verdict only reads &quot;on track&quot; once both revenue AND sessions clear 97% of the ramp — rising RPM on falling traffic is graded behind pace, not ahead. The day-by-day section re-applies that same rule to every finalized day, so the green/yellow/red counts are the team&apos;s record against its commitment.</li>
          <li>On the 28-day charts, the green line is 97% of the ramp and the red line is 90%. Above green is on track, between the lines is behind pace, below red is off track. Event ticks sit on the x axis; hover a day to read them.</li>
          <li>The KPI tiles total the selected range (finalized days only) and compare it with the equal period before it; &quot;All&quot; compares with what the ramp expected.</li>
          <li>Hover any chart for exact values; all charts share one crosshair. Click a day (or press Enter on a focused chart) to pin it and see every metric and event for that day.</li>
          <li>The range and event filters in the bar at the top scope every chart, tile and table below them.</li>
          <li>{expectation.basis}</li>
          <li>
            Data is regenerated by the daily funnel runner and committed to{' '}
            <code className="text-slate-300">reports/funnel/history.json</code>; recent days are blank while they settle.
          </li>
        </ul>
      </details>
    </div>
  );
}

// ---- verdict + pace ----------------------------------------------------------

function VerdictBanner({
  verdict,
  expectation,
  days,
  lastDate,
}: {
  verdict: Verdict | null;
  expectation: FunnelHistory['expectation'];
  days: FunnelDayRecord[];
  lastDate: string | null;
}) {
  if (!verdict) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-slate-500 flex-shrink-0" />
        <p className="text-slate-400 text-sm">Not enough finalized history yet for a 28-day rolling verdict.</p>
      </div>
    );
  }

  const style = VERDICT_STYLES[verdict.color];
  const Icon = verdict.color === 'green' ? CheckCircle2 : verdict.color === 'yellow' ? AlertTriangle : Siren;
  const last7 = lastDate ? summarizeWindow(days, lastDate, 7) : null;
  const neededRevPerDay = expectation.revenue28dEnd / 28;
  const neededSessPerDay = expectation.sessions28dEnd / 28;

  return (
    <div className={`rounded-xl p-5 sm:p-6 border ${style.bg} ${style.border}`}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
        <div className="flex items-start gap-3 lg:w-64 lg:flex-shrink-0">
          <Icon className={`h-7 w-7 flex-shrink-0 ${style.text}`} />
          <div>
            <h2 className={`text-2xl font-bold ${style.text}`}>{style.label}</h2>
            <p className="text-xs text-slate-400">28d rolling as of {verdict.date}</p>
          </div>
        </div>
        <div className="grid flex-1 gap-4 sm:grid-cols-2">
          <PctOfExpectedBar
            label="Revenue"
            actual={formatCurrency(verdict.actualRevenue28d)}
            expected={formatCurrency(verdict.expectedRevenue28d)}
            pct={verdict.revenuePct}
            barClass={verdict.revenuePct >= 0.97 ? 'bg-emerald-400' : verdict.revenuePct >= 0.9 ? 'bg-yellow-400' : 'bg-red-400'}
          />
          <PctOfExpectedBar
            label="Sessions"
            actual={formatCompactNumber(verdict.actualSessions28d)}
            expected={formatCompactNumber(verdict.expectedSessions28d)}
            pct={verdict.sessionsPct}
            barClass={verdict.sessionsPct >= 0.97 ? 'bg-emerald-400' : verdict.sessionsPct >= 0.9 ? 'bg-yellow-400' : 'bg-red-400'}
          />
        </div>
      </div>
      {last7 && last7.days > 0 && (
        <p className="mt-4 border-t border-slate-800/80 pt-3 text-sm text-slate-300">
          <span className="text-slate-500">Pace to {expectation.endDate}:</span> the end target needs about{' '}
          <strong className="text-white">{formatCurrency(neededRevPerDay)}/day</strong> and{' '}
          <strong className="text-white">{formatCompactNumber(neededSessPerDay)} sessions/day</strong>. The last {last7.days} finalized days
          averaged <strong className="text-white">{formatCurrency(last7.revenue / last7.days)}/day</strong> and{' '}
          <strong className="text-white">{formatCompactNumber(last7.sessions / last7.days)}/day</strong>.
        </p>
      )}
    </div>
  );
}

function PctOfExpectedBar({
  label,
  actual,
  expected,
  pct,
  barClass,
}: {
  label: string;
  actual: string;
  expected: string;
  pct: number;
  barClass: string;
}) {
  // Scale 0–120% so the 90% and 97% gates sit at readable positions.
  const scale = (p: number) => `${Math.min(100, (p / 1.2) * 100)}%`;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm text-slate-400">{label}</span>
        <span className="text-sm text-slate-400">
          <span className="text-lg font-semibold text-white tabular-nums">{actual}</span> of {expected}
        </span>
      </div>
      <div className="relative mt-2 h-2.5 rounded-full bg-slate-800" aria-hidden>
        <div className={`h-full rounded-full ${barClass}`} style={{ width: scale(pct) }} />
        <div className="absolute top-[-3px] h-4 w-px bg-slate-500" style={{ left: scale(0.9) }} title="90% — red below" />
        <div className="absolute top-[-3px] h-4 w-px bg-slate-300" style={{ left: scale(0.97) }} title="97% — green at or above" />
      </div>
      <div className="mt-1 flex justify-between text-xs text-slate-500">
        <span className="tabular-nums text-slate-300">
          {formatPercent(pct, 1)} of expected ({formatSignedPercent(pct)})
        </span>
        <span>gates 90% / 97%</span>
      </div>
    </div>
  );
}

function formatSignedPercent(pctOfExpected: number): string {
  const delta = pctOfExpected - 1;
  const sign = delta >= 0 ? '+' : '−';
  return `${sign}${formatPercent(Math.abs(delta), 1)}`;
}

// ---- KPI tiles -----------------------------------------------------------------

function KpiTiles({
  days,
  rangeDays,
  rangeRows,
  lastDay,
  verdict,
  active,
  onPick,
}: {
  days: FunnelDayRecord[];
  rangeDays: number;
  rangeRows: FunnelDayRecord[];
  lastDay: FunnelDayRecord | null;
  verdict: Verdict | null;
  active: MetricKey;
  onPick: (k: MetricKey) => void;
}) {
  // Revenue / sessions / RPM: totals over the selected range, ending at the last finalized day,
  // compared with the equal-length period before it. "All" has no prior period, so it compares
  // with what the ramp expected instead.
  const end = lastDay?.date ?? null;
  const range = end ? summarizeRange(days, end, rangeDays) : null;
  const cur = range?.current ?? null;
  const prev = range?.prior ?? null;
  const rangeName = rangeDays > 0 ? `last ${rangeDays}d` : 'all time';
  // With no complete prior period (the "All" range, or a range reaching past the start of the
  // history) the honest comparison is with what the ramp expected over the same days.
  const priorLabel = prev ? `vs prior ${rangeDays}d` : 'vs expected';
  const vsExpected = (a: number | undefined, e: number | undefined) => (a !== undefined && e ? a / e - 1 : null);

  // Scoreboard counters (already trailing-7d values) show the latest reading and how it moved across the range.
  const rangeStart = rangeRows.length > 0 ? rangeRows[0].date : null;
  const rangeEnd = rangeRows.length > 0 ? rangeRows[rangeRows.length - 1].date : null;
  const change = (get: (d: FunnelDayRecord) => number | null) =>
    rangeStart && rangeEnd ? counterChange(days, get, rangeStart, rangeEnd) : null;
  const owned = change((d) => d.ownedAdds7d);
  const pin = change((d) => d.pinterestSessions7d);
  const nonAd = change((d) => d.nonAdMonthly);
  const counterDelta = (c: ReturnType<typeof change>) => (c && c.first.date !== c.last.date ? pctChange(c.last.value, c.first.value) : null);
  const counterLabel = (c: ReturnType<typeof change>) => (c && c.first.date !== c.last.date ? `since ${c.first.date.slice(5)}` : '');

  const pctOf = (a: number, e: number) => (e > 0 ? `${formatPercent(a / e)} of expected` : '');

  const tiles: Array<{
    key: MetricKey;
    label: string;
    value: string;
    sub: string;
    delta: number | null;
    deltaLabel: string;
    spark: Array<number | null>;
    color: string;
  }> = [
    {
      key: 'revenue',
      label: `Revenue, ${rangeName}`,
      value: cur && cur.days > 0 ? formatCurrency(cur.revenue) : '—',
      sub: cur && cur.days > 0 ? `${formatCurrency(cur.revenue / cur.days)}/day · ${pctOf(cur.revenue, cur.expectedRevenue)}` : '',
      delta: prev ? pctChange(cur?.revenue, prev.revenue) : vsExpected(cur?.revenue, cur?.expectedRevenue),
      deltaLabel: priorLabel,
      spark: rangeRows.map((d) => d.revenue),
      color: METRICS.revenue.color,
    },
    {
      key: 'sessions',
      label: `Sessions, ${rangeName}`,
      value: cur && cur.days > 0 ? formatCompactNumber(cur.sessions) : '—',
      sub: cur && cur.days > 0 ? `${formatCompactNumber(cur.sessions / cur.days)}/day · ${pctOf(cur.sessions, cur.expectedSessions)}` : '',
      delta: prev ? pctChange(cur?.sessions, prev.sessions) : vsExpected(cur?.sessions, cur?.expectedSessions),
      deltaLabel: priorLabel,
      spark: rangeRows.map((d) => d.sessions),
      color: METRICS.sessions.color,
    },
    {
      key: 'rpm',
      label: `Session RPM, ${rangeName}`,
      value: cur?.rpm != null ? formatCurrency2(cur.rpm) : '—',
      sub: verdict ? `28d: ${formatCurrency2((verdict.actualRevenue28d / verdict.actualSessions28d) * 1000)}` : '',
      delta: prev ? pctChange(cur?.rpm, prev.rpm) : null,
      deltaLabel: priorLabel,
      spark: rangeRows.map((d) => d.rpm),
      color: METRICS.rpm.color,
    },
    {
      key: 'ownedAdds7d',
      label: 'Owned adds, trailing 7d',
      value: owned ? formatInt(owned.last.value) : '—',
      sub: owned ? `as of ${owned.last.date}` : 'no scoreboard data in range',
      delta: counterDelta(owned),
      deltaLabel: counterLabel(owned),
      spark: rangeRows.map((d) => d.ownedAdds7d),
      color: METRICS.ownedAdds7d.color,
    },
    {
      key: 'pinterestSessions7d',
      label: 'Pinterest sessions, trailing 7d',
      value: pin ? formatCompactNumber(pin.last.value) : '—',
      sub: pin ? `as of ${pin.last.date}` : 'no scoreboard data in range',
      delta: counterDelta(pin),
      deltaLabel: counterLabel(pin),
      spark: rangeRows.map((d) => d.pinterestSessions7d),
      color: METRICS.pinterestSessions7d.color,
    },
    {
      key: 'nonAdMonthly',
      label: 'Non-ad, monthly run-rate',
      value: nonAd ? formatCurrency(nonAd.last.value) : '—',
      sub: nonAd ? `as of ${nonAd.last.date}` : 'no scoreboard data in range',
      delta: counterDelta(nonAd),
      deltaLabel: counterLabel(nonAd),
      spark: rangeRows.map((d) => d.nonAdMonthly),
      color: METRICS.nonAdMonthly.color,
    },
  ];

  return (
    <div>
      <p className="mb-2 text-xs text-slate-500">
        {cur && cur.days > 0 && end ? (
          <>
            Tiles cover the <span className="text-slate-300">{cur.days} finalized days</span> through {end}
            {prev ? (
              <> and compare with the {prev.days} before them</>
            ) : (
              <> and compare with what the ramp expected{rangeDays > 0 ? ' (the history does not reach a full prior period)' : ''}</>
            )}
            . Change the range in the bar above.
          </>
        ) : (
          'No finalized days in this range yet.'
        )}
      </p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {tiles.map((t) => {
          const up = t.delta !== null && t.delta >= 0;
          return (
            <button
              key={t.key}
              onClick={() => onPick(t.key)}
              aria-pressed={active === t.key}
              className={`group flex flex-col rounded-xl border p-3 text-left transition-colors ${
                active === t.key ? 'border-slate-500 bg-slate-800/80' : 'border-slate-800 bg-slate-900 hover:border-slate-700'
              }`}
            >
              <span className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="inline-block h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: t.color }} />
                {t.label}
              </span>
              <span className="mt-1 text-xl font-semibold text-white tabular-nums">{t.value}</span>
              <span className="min-h-[1rem] text-xs text-slate-500">{t.sub}</span>
              <Sparkline values={t.spark} color={t.color} />
              <span className="mt-1 flex items-center gap-1 text-xs">
                {t.delta === null ? (
                  <span className="text-slate-600">no comparison</span>
                ) : (
                  <>
                    {up ? <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" /> : <ArrowDownRight className="h-3.5 w-3.5 text-red-400" />}
                    <span className="tabular-nums text-slate-200">
                      {up ? '+' : '−'}
                      {formatPercent(Math.abs(t.delta), 1)}
                    </span>
                    <span className="text-slate-500">{t.deltaLabel}</span>
                  </>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---- "is the team on track?" -----------------------------------------------------

const STATUS_COLOR: Record<VerdictColor, { hex: string; text: string; name: string }> = {
  green: { hex: '#34d399', text: 'text-emerald-400', name: 'Green' },
  yellow: { hex: '#facc15', text: 'text-yellow-400', name: 'Yellow' },
  red: { hex: '#f87171', text: 'text-red-400', name: 'Red' },
};

const STATUS_PILL: Record<VerdictColor, string> = {
  green: 'bg-emerald-500/15 text-emerald-300',
  yellow: 'bg-yellow-500/15 text-yellow-300',
  red: 'bg-red-500/15 text-red-300',
};

function formatPp(delta: number | null): string {
  if (delta === null) return '—';
  const pp = delta * 100;
  return `${pp >= 0 ? '+' : '−'}${Math.abs(pp).toFixed(1)} pp`;
}

function OnTrackSection({
  expectation,
  status,
  scorecard,
  rangeDates,
  hoverDate,
  onHoverDate,
  selectedDate,
  onSelectDate,
}: {
  expectation: FunnelHistory['expectation'];
  status: StatusPoint[];
  scorecard: StatusScorecard;
  rangeDates: string[];
  hoverDate: string | null;
  onHoverDate: (d: string | null) => void;
  selectedDate: string | null;
  onSelectDate: (d: string) => void;
}) {
  const byDate = useMemo(() => new Map(status.map((p) => [p.date, p])), [status]);
  const inRange = rangeDates.filter((d) => byDate.has(d));
  const firstGraded = inRange[0] ?? null;
  // The status strip covers every day of the range the rolling window can grade.
  const stripDates = firstGraded ? rangeDates.filter((d) => d >= firstGraded) : [];

  const pts = inRange.map((d) => byDate.get(d)!);
  // Tight, 5-point-aligned domain that always shows both gates.
  const values = pts.flatMap((p) => [p.revenuePct, p.sessionsPct]);
  const yDomain: [number, number] = [
    Math.floor((Math.min(VERDICT_GATES.red - 0.02, ...values) + 1e-9) * 20) / 20,
    Math.ceil((Math.max(1.02, ...values) - 1e-9) * 20) / 20,
  ];

  const bands: ChartBand[] =
    firstGraded && firstGraded < expectation.startDate
      ? [{ start: firstGraded, end: expectation.startDate, color: '#64748b', opacity: 0.1 }]
      : [];

  const { total, green, yellow, red, streak } = scorecard;
  const share = (n: number) => (total > 0 ? `${(n / total) * 100}%` : '0%');

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-white">Is the team on track? Day by day</h2>
        <p className="text-sm text-slate-400">
          Every finalized day re-graded against the ramp. A day is green only when revenue <em>and</em> sessions are at or above{' '}
          {formatPercent(VERDICT_GATES.green)} of the ramp; red when either is below {formatPercent(VERDICT_GATES.red)}.
        </p>
      </div>

      {/* scorecard */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
          <div className="text-xs text-slate-400">Days graded since {expectation.startDate}</div>
          <div className="mt-1 flex items-baseline gap-3 text-sm tabular-nums">
            <span><span className="text-xl font-semibold text-white">{green}</span> <span className="text-emerald-400">green</span></span>
            <span><span className="text-xl font-semibold text-white">{yellow}</span> <span className="text-yellow-400">yellow</span></span>
            <span><span className="text-xl font-semibold text-white">{red}</span> <span className="text-red-400">red</span></span>
          </div>
          <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-slate-800" aria-hidden>
            <div style={{ width: share(green), backgroundColor: STATUS_COLOR.green.hex }} />
            <div style={{ width: share(yellow), backgroundColor: STATUS_COLOR.yellow.hex }} />
            <div style={{ width: share(red), backgroundColor: STATUS_COLOR.red.hex }} />
          </div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
          <div className="text-xs text-slate-400">Current streak</div>
          {streak ? (
            <div className="mt-1 text-sm">
              <span className={`text-xl font-semibold ${STATUS_COLOR[streak.color].text}`}>{STATUS_COLOR[streak.color].name}</span>{' '}
              <span className="text-slate-300 tabular-nums">
                {streak.days} day{streak.days === 1 ? '' : 's'} running
              </span>
            </div>
          ) : (
            <div className="mt-1 text-sm text-slate-500">No graded days yet</div>
          )}
          <div className="mt-1 text-xs text-slate-500">
            {scorecard.lastGreen
              ? scorecard.daysSinceGreen === 0
                ? 'Green today'
                : `Last green ${scorecard.lastGreen} (${scorecard.daysSinceGreen}d ago)`
              : 'Never green yet'}
          </div>
        </div>
        <TrendCell label="Revenue, % of ramp" latest={pts.length ? pts[pts.length - 1].revenuePct : null} trend={scorecard.revenueTrend7d} />
        <TrendCell label="Sessions, % of ramp" latest={pts.length ? pts[pts.length - 1].sessionsPct : null} trend={scorecard.sessionsTrend7d} />
      </div>

      {/* % of ramp over time with the gates as reference lines */}
      <div className="mt-5">
        <FunnelLineChart
          ariaLabel="Revenue and sessions as a percent of the ramp, with the 90, 97 and 100 percent gates"
          height={240}
          yDomain={yDomain}
          yFormatter={(v) => formatPercent(v)}
          markers="none"
          bands={bands}
          yZones={[
            { from: 0, to: VERDICT_GATES.red, color: STATUS_COLOR.red.hex, opacity: 0.12 },
            { from: VERDICT_GATES.red, to: VERDICT_GATES.green, color: STATUS_COLOR.yellow.hex, opacity: 0.14 },
            { from: VERDICT_GATES.green, to: 10, color: STATUS_COLOR.green.hex, opacity: 0.07 },
          ]}
          refLines={[
            { y: 1, label: '100% · ramp', color: '#94a3b8', dashed: true, labelSide: 'left' },
            { y: VERDICT_GATES.green, label: `${formatPercent(VERDICT_GATES.green)} · on-track gate`, color: STATUS_COLOR.green.hex },
            { y: VERDICT_GATES.red, label: `${formatPercent(VERDICT_GATES.red)} · off-track gate`, color: STATUS_COLOR.red.hex },
          ]}
          series={[
            { id: 'rev', label: 'Revenue', color: METRICS.revenue.color, points: inRange.map((d) => ({ x: d, y: byDate.get(d)!.revenuePct })) },
            { id: 'ses', label: 'Sessions', color: METRICS.sessions.color, points: inRange.map((d) => ({ x: d, y: byDate.get(d)!.sessionsPct })) },
          ]}
          tooltipExtra={(d) => {
            const p = byDate.get(d);
            if (!p) return null;
            return (
              <div className={`mt-1 font-medium ${STATUS_COLOR[p.color].text}`}>
                {STATUS_COLOR[p.color].name} day{d < expectation.startDate ? ' (before the commitment, graded vs baseline)' : ''}
              </div>
            );
          }}
          hoverDate={hoverDate}
          onHoverDate={onHoverDate}
          selectedDate={selectedDate}
          onSelectDate={onSelectDate}
        />
        <ChartLegend
          items={[
            { color: METRICS.revenue.color, label: 'Revenue 28d ÷ ramp' },
            { color: METRICS.sessions.color, label: 'Sessions 28d ÷ ramp' },
            { color: STATUS_COLOR.green.hex, label: `${formatPercent(VERDICT_GATES.green)} gate` },
            { color: STATUS_COLOR.red.hex, label: `${formatPercent(VERDICT_GATES.red)} gate` },
            ...(bands.length ? [{ color: '#64748b', label: 'Before the commitment', swatch: true, faint: true }] : []),
          ]}
        />
      </div>

      {/* one cell per day: the at-a-glance record */}
      {stripDates.length > 0 && (
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-slate-500">
            <span>Daily status · {stripDates[0]}</span>
            <span>{stripDates[stripDates.length - 1]}</span>
          </div>
          <div className="flex h-5 gap-px" role="list" aria-label="Daily status">
            {stripDates.map((d) => {
              const p = byDate.get(d);
              const isSel = d === selectedDate;
              const isHover = d === hoverDate;
              return (
                <button
                  key={d}
                  role="listitem"
                  title={p ? `${d}: ${STATUS_COLOR[p.color].name} — revenue ${formatPercent(p.revenuePct, 1)}, sessions ${formatPercent(p.sessionsPct, 1)} of ramp` : `${d}: settling`}
                  aria-label={p ? `${d} ${STATUS_COLOR[p.color].name}` : `${d} settling`}
                  onClick={() => onSelectDate(d)}
                  onMouseEnter={() => onHoverDate(d)}
                  onMouseLeave={() => onHoverDate(null)}
                  className={`min-w-0 flex-1 rounded-[2px] ${isSel ? 'ring-2 ring-pink-400' : isHover ? 'ring-1 ring-slate-300' : ''}`}
                  style={{
                    backgroundColor: p ? STATUS_COLOR[p.color].hex : '#1e293b',
                    opacity: p ? (d < expectation.startDate ? 0.4 : 0.85) : 1,
                  }}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function TrendCell({ label, latest, trend }: { label: string; latest: number | null; trend: number | null }) {
  const color = latest === null ? null : latest < VERDICT_GATES.red ? 'red' : latest < VERDICT_GATES.green ? 'yellow' : 'green';
  const up = trend !== null && trend >= 0;
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className={`text-xl font-semibold tabular-nums ${color ? STATUS_COLOR[color].text : 'text-slate-500'}`}>
          {latest === null ? '—' : formatPercent(latest, 1)}
        </span>
        {trend !== null && (
          <span className="inline-flex items-center gap-0.5 text-xs">
            {up ? <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" /> : <ArrowDownRight className="h-3.5 w-3.5 text-red-400" />}
            <span className="tabular-nums text-slate-200">{formatPp(trend)}</span>
            <span className="text-slate-500">in 7d</span>
          </span>
        )}
      </div>
      <div className="mt-1 text-xs text-slate-500">
        {latest === null
          ? ''
          : latest >= VERDICT_GATES.green
            ? `${formatPp(latest - VERDICT_GATES.green)} above the on-track gate`
            : `${formatPp(VERDICT_GATES.green - latest).replace('+', '')} short of the on-track gate`}
      </div>
    </div>
  );
}

// ---- 28d rolling vs the ramp -------------------------------------------------------

function RollingCommitmentChart({
  title,
  subtitle,
  color,
  fmt,
  rolling,
  get,
  expectedAt,
  rampDates,
  rampEndLabel,
  bands,
  events,
  hoverDate,
  onHoverDate,
  selectedDate,
  onSelectDate,
}: {
  title: string;
  subtitle: string;
  color: string;
  fmt: (v: number) => string;
  rolling: Rolling28dPoint[];
  get: (p: Rolling28dPoint) => number | null;
  expectedAt: (date: string) => number;
  rampDates: string[];
  rampEndLabel: string;
  bands: ChartBand[];
  events: ChartEventMarker[];
  hoverDate: string | null;
  onHoverDate: (d: string | null) => void;
  selectedDate: string | null;
  onSelectDate: (d: string) => void;
}) {
  const actual: ChartPoint[] = rolling.map((p) => ({ x: p.date, y: get(p) }));
  const ramp: ChartPoint[] = rampDates.map((d) => ({ x: d, y: expectedAt(d) }));
  const gate = (k: number): ChartPoint[] => ramp.map((p) => ({ x: p.x, y: p.y === null ? null : p.y * k }));
  const green = gate(VERDICT_GATES.green);
  const red = gate(VERDICT_GATES.red);
  const areas: ChartArea[] = [
    { upper: gate(10), lower: green, color: STATUS_COLOR.green.hex, opacity: 0.07 },
    { upper: green, lower: red, color: STATUS_COLOR.yellow.hex, opacity: 0.16 },
    { upper: red, lower: 'floor', color: STATUS_COLOR.red.hex, opacity: 0.12 },
  ];

  let latest: { date: string; value: number } | null = null;
  for (let i = rolling.length - 1; i >= 0; i--) {
    const v = get(rolling[i]);
    if (v !== null) {
      latest = { date: rolling[i].date, value: v };
      break;
    }
  }
  const exp = latest ? expectedAt(latest.date) : null;
  const pct = latest && exp ? latest.value / exp : null;
  const tone = pct === null ? null : pct < VERDICT_GATES.red ? 'red' : pct < VERDICT_GATES.green ? 'yellow' : 'green';
  const gap = latest && exp ? latest.value - exp * VERDICT_GATES.green : null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6">
      <h3 className="text-lg font-bold text-white">{title}</h3>
      <p className="text-sm text-slate-400">{subtitle}</p>
      {latest && pct !== null && tone && gap !== null && (
        <div className="mt-3 mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-2xl font-semibold text-white tabular-nums">{fmt(latest.value)}</span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${STATUS_PILL[tone]}`}>{formatPercent(pct, 1)} of ramp</span>
          <span className="text-xs text-slate-400">
            {fmt(Math.abs(gap))} {gap >= 0 ? 'above' : 'short of'} the 97% gate · as of {latest.date}
          </span>
        </div>
      )}
      <FunnelLineChart
        ariaLabel={`${title}, actual versus the ramp with the 90 and 97 percent gates`}
        height={240}
        yFormatter={fmt}
        zeroBased={false}
        markers="ticks"
        events={events}
        bands={bands}
        areas={areas}
        hoverDate={hoverDate}
        onHoverDate={onHoverDate}
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
        compare={{ actual: 'actual', expected: 'ramp' }}
        tooltipOrder={['actual', 'ramp', 'green', 'red']}
        series={[
          { id: 'green', label: `${formatPercent(VERDICT_GATES.green)} gate`, color: STATUS_COLOR.green.hex, points: green, strokeWidth: 1.25 },
          { id: 'red', label: `${formatPercent(VERDICT_GATES.red)} gate`, color: STATUS_COLOR.red.hex, points: red, strokeWidth: 1.25 },
          { id: 'ramp', label: 'Ramp (100%)', color: '#94a3b8', points: ramp, dashed: true, strokeWidth: 1.5 },
          { id: 'actual', label: 'Actual', color, points: actual, strokeWidth: 2.5 },
        ]}
      />
      <ChartLegend
        items={[
          { color, label: 'Actual 28d total' },
          { color: '#94a3b8', label: rampEndLabel, dashed: true },
          { color: STATUS_COLOR.green.hex, label: `${formatPercent(VERDICT_GATES.green)} on-track gate` },
          { color: STATUS_COLOR.red.hex, label: `${formatPercent(VERDICT_GATES.red)} off-track gate` },
        ]}
      />
    </div>
  );
}

function Sparkline({ values, color }: { values: Array<number | null>; color: string }) {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length < 2) return <div className="mt-2 h-8" />;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const span = max - min || 1;
  const n = values.length;
  let d = '';
  let started = false;
  values.forEach((v, i) => {
    // Scoreboard counters are sparse; join across gaps so the trend stays readable.
    if (v === null) return;
    const x = n > 1 ? (i / (n - 1)) * 100 : 50;
    const y = 30 - ((v - min) / span) * 28;
    d += `${started ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)} `;
    started = true;
  });
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="mt-2 h-8 w-full" aria-hidden>
      <path d={d.trim()} fill="none" stroke={color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

// ---- pinned day ----------------------------------------------------------------

function DayDetail({
  date,
  days,
  events,
  onClose,
  onStep,
}: {
  date: string;
  days: FunnelDayRecord[];
  events: FunnelEvent[];
  onClose: () => void;
  onStep: (n: number) => void;
}) {
  const d = days.find((x) => x.date === date);
  const dayEvents = events.filter((e) => e.date === date);
  const first = days[0]?.date;
  const last = days[days.length - 1]?.date;

  const ratio = (a: number | null | undefined, b: number | null | undefined) =>
    a != null && b != null && b > 0 ? `${formatPercent(a / b)} of expected` : null;

  const cells: Array<{ label: string; value: string; note?: string | null }> = d
    ? [
        { label: 'Revenue', value: d.revenue != null ? formatCurrency2(d.revenue) : 'settling', note: ratio(d.revenue, d.expectedRevenue) },
        { label: 'Expected revenue', value: d.expectedRevenue != null ? formatCurrency2(d.expectedRevenue) : '—' },
        { label: 'Sessions', value: d.sessions != null ? formatInt(d.sessions) : 'settling', note: ratio(d.sessions, d.expectedSessions) },
        { label: 'Expected sessions', value: d.expectedSessions != null ? formatInt(d.expectedSessions) : '—' },
        { label: 'RPM', value: d.rpm != null ? formatCurrency2(d.rpm) : '—' },
        { label: 'Owned adds (7d)', value: d.ownedAdds7d != null ? formatInt(d.ownedAdds7d) : '—' },
        { label: 'Pinterest sessions (7d)', value: d.pinterestSessions7d != null ? formatInt(d.pinterestSessions7d) : '—' },
        { label: 'Non-ad monthly', value: d.nonAdMonthly != null ? formatCurrency(d.nonAdMonthly) : '—' },
      ]
    : [];

  return (
    <div className="rounded-xl border border-pink-500/40 bg-slate-900 p-4 sm:p-6" aria-live="polite">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onStep(-1)}
            disabled={!first || date <= first}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-30"
            aria-label="Previous day"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="text-lg font-bold text-white tabular-nums">
            {new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })} {date}
          </h2>
          <button
            onClick={() => onStep(1)}
            disabled={!last || date >= last}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-30"
            aria-label="Next day"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Unpin day">
          <X className="h-4 w-4" />
        </button>
      </div>
      {!d ? (
        <p className="text-sm text-slate-500">No data recorded for this day.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {cells.map((c) => (
            <div key={c.label} className="rounded-lg bg-slate-950/60 p-3">
              <div className="text-xs text-slate-500">{c.label}</div>
              <div className="text-base font-semibold text-white tabular-nums">{c.value}</div>
              {c.note && <div className="text-xs text-slate-400">{c.note}</div>}
            </div>
          ))}
        </div>
      )}
      <div className="mt-4">
        <h3 className="mb-2 text-sm font-medium text-slate-300">
          {dayEvents.length} event{dayEvents.length === 1 ? '' : 's'} this day
        </h3>
        {dayEvents.length > 0 && (
          <ul className="space-y-1.5">
            {dayEvents.map((e, i) => (
              <EventLine key={i} e={e} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ---- weekly roll-up ------------------------------------------------------------

function WeeklyTable({ weeks, onPick }: { weeks: ReturnType<typeof weeklySummary>; onPick: (date: string) => void }) {
  const pctCell = (a: number, e: number) => {
    if (e <= 0) return <span className="text-slate-600">—</span>;
    const p = a / e;
    const tone = p >= 0.97 ? 'text-emerald-400' : p >= 0.9 ? 'text-yellow-400' : 'text-red-400';
    return <span className={`tabular-nums ${tone}`}>{formatPercent(p)}</span>;
  };
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6">
      <h2 className="text-lg font-bold text-white">Week by week</h2>
      <p className="mb-4 text-sm text-slate-400">
        Mon–Sun totals over finalized days in the selected range; % is against the same-weekday expectation for those same days. Click a week to pin its Monday.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-left text-slate-500">
              <th className="py-2 pr-4 font-medium">Week of</th>
              <th className="py-2 pr-4 font-medium text-right">Revenue</th>
              <th className="py-2 pr-4 font-medium text-right">vs exp.</th>
              <th className="py-2 pr-4 font-medium text-right">Sessions</th>
              <th className="py-2 pr-4 font-medium text-right">vs exp.</th>
              <th className="py-2 pr-4 font-medium text-right">RPM</th>
              <th className="py-2 pr-4 font-medium text-right">Merges</th>
              <th className="py-2 font-medium text-right">Rollbacks / incidents</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((w) => (
              <tr
                key={w.weekStart}
                onClick={() => onPick(w.weekStart)}
                className="cursor-pointer border-b border-slate-800/60 hover:bg-slate-800/40"
              >
                <td className="py-2 pr-4 text-slate-300 whitespace-nowrap">
                  {w.weekStart}
                  {w.finalizedDays < 7 && <span className="ml-2 text-xs text-slate-500">{w.finalizedDays}/7 days</span>}
                </td>
                <td className="py-2 pr-4 text-right tabular-nums text-slate-200">{w.finalizedDays ? formatCurrency(w.revenue) : '—'}</td>
                <td className="py-2 pr-4 text-right">{pctCell(w.revenue, w.expectedRevenue)}</td>
                <td className="py-2 pr-4 text-right tabular-nums text-slate-200">{w.finalizedDays ? formatCompactNumber(w.sessions) : '—'}</td>
                <td className="py-2 pr-4 text-right">{pctCell(w.sessions, w.expectedSessions)}</td>
                <td className="py-2 pr-4 text-right tabular-nums text-slate-200">{w.rpm != null ? formatCurrency2(w.rpm) : '—'}</td>
                <td className="py-2 pr-4 text-right tabular-nums text-slate-300">{w.merges || '—'}</td>
                <td className={`py-2 text-right tabular-nums ${w.rollbacks + w.incidents > 0 ? 'text-red-400' : 'text-slate-600'}`}>
                  {w.rollbacks + w.incidents > 0 ? `${w.rollbacks} / ${w.incidents}` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---- events --------------------------------------------------------------------

function EventLine({ e }: { e: FunnelEvent }) {
  const Icon = EVENT_ICONS[e.kind];
  const tone = resultTone(e.result);
  return (
    <li className="flex items-start gap-2 text-sm">
      <Icon className={`mt-0.5 h-3.5 w-3.5 flex-shrink-0 ${EVENT_LABEL_COLOR[e.kind]}`} />
      <span className="flex-1 text-slate-300">
        {e.label}
        {e.commit && <code className="ml-1 text-xs text-slate-500">{e.commit}</code>}
      </span>
      {e.result && <ResultPill result={e.result} tone={tone} />}
    </li>
  );
}

function ResultPill({ result, tone }: { result: string; tone: 'ok' | 'bad' | 'other' }) {
  const cls =
    tone === 'ok'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
      : tone === 'bad'
        ? 'border-red-500/30 bg-red-500/10 text-red-300'
        : 'border-slate-700 bg-slate-800 text-slate-300';
  const Icon = tone === 'ok' ? CheckCircle2 : tone === 'bad' ? AlertTriangle : null;
  return (
    <span className={`inline-flex flex-shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${cls}`}>
      {Icon && <Icon className="h-3 w-3" />}
      {result}
    </span>
  );
}

const EVENTS_PAGE = 25;

function EventsPanel({
  events,
  kinds,
  rangeStart,
  selectedDate,
  onPickDate,
}: {
  events: FunnelEvent[];
  kinds: Set<EventKind>;
  rangeStart: string | null;
  selectedDate: string | null;
  onPickDate: (d: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [actor, setActor] = useState('');
  const [resultFilter, setResultFilter] = useState<'' | 'ok' | 'bad' | 'other'>('');
  const [limit, setLimit] = useState(EVENTS_PAGE);

  const inScope = useMemo(
    () => events.filter((e) => kinds.has(e.kind) && (!rangeStart || e.date >= rangeStart)),
    [events, kinds, rangeStart]
  );

  const actors = useMemo(() => {
    const c = new Map<string, number>();
    for (const e of inScope) {
      const a = eventActor(e.label);
      if (a) c.set(a, (c.get(a) ?? 0) + 1);
    }
    return Array.from(c.entries()).sort((a, b) => b[1] - a[1]);
  }, [inScope]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return inScope
      .filter((e) => !actor || eventActor(e.label) === actor)
      .filter((e) => !resultFilter || resultTone(e.result) === resultFilter)
      .filter(
        (e) =>
          !q ||
          e.label.toLowerCase().includes(q) ||
          (e.commit ?? '').toLowerCase().includes(q) ||
          (e.result ?? '').toLowerCase().includes(q) ||
          e.date.includes(q)
      )
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [inScope, actor, resultFilter, query]);

  useEffect(() => setLimit(EVENTS_PAGE), [query, actor, resultFilter, kinds, rangeStart]);

  const shown = filtered.slice(0, limit);
  const groups: Array<{ date: string; items: FunnelEvent[] }> = [];
  for (const e of shown) {
    const g = groups[groups.length - 1];
    if (g && g.date === e.date) g.items.push(e);
    else groups.push({ date: e.date, items: [e] });
  }

  const selectCls = 'rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-300';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Activity className="h-5 w-5 text-sims-pink" />
          Events
          <span className="text-sm font-normal text-slate-500">
            {filtered.length} of {inScope.length}
          </span>
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative">
            <span className="sr-only">Search events</span>
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search label, PR, sha…"
              className="w-56 rounded-lg border border-slate-700 bg-slate-950 py-1.5 pl-7 pr-2 text-sm text-slate-200 placeholder:text-slate-600"
            />
          </label>
          <select aria-label="Filter by agent" value={actor} onChange={(e) => setActor(e.target.value)} className={selectCls}>
            <option value="">All agents</option>
            {actors.map(([a, n]) => (
              <option key={a} value={a}>
                {a} ({n})
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by result"
            value={resultFilter}
            onChange={(e) => setResultFilter(e.target.value as typeof resultFilter)}
            className={selectCls}
          >
            <option value="">Any result</option>
            <option value="ok">Pass / OK</option>
            <option value="bad">Fail / missed</option>
            <option value="other">Other / none</option>
          </select>
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="text-slate-500 text-sm">No events match these filters.</p>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g.date} className={`rounded-lg p-2 ${g.date === selectedDate ? 'bg-pink-500/10 ring-1 ring-pink-500/40' : ''}`}>
              <button
                onClick={() => onPickDate(g.date)}
                className="mb-1.5 text-xs font-medium text-slate-400 hover:text-white tabular-nums"
                title="Pin this day on the charts"
              >
                {g.date}
              </button>
              <ul className="space-y-1.5">
                {g.items.map((e, i) => (
                  <EventLine key={i} e={e} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      {filtered.length > limit && (
        <button
          onClick={() => setLimit((l) => l + EVENTS_PAGE * 2)}
          className="mt-4 w-full rounded-lg border border-slate-800 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          Show more ({filtered.length - limit} remaining)
        </button>
      )}
    </div>
  );
}

// ---- small shared bits ---------------------------------------------------------

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6">
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
  items: Array<{ color: string; label: string; dashed?: boolean; swatch?: boolean; faint?: boolean }>;
}) {
  return (
    <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-400">
      {items.map((item, i) => (
        <span key={i} className="inline-flex items-center gap-2">
          {item.swatch ? (
            <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: item.color, opacity: item.faint ? 0.3 : 0.9 }} />
          ) : (
            <span
              className="inline-block w-4 h-0.5"
              style={{
                backgroundColor: item.dashed ? 'transparent' : item.color,
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
