# Rio — verdict 2026-11-13 (E403): E332(b) PASSES. Session RPM is up because sessions are deeper, not because ads pay more. The 28d gap to the ramp is caused by sessions, not RPM.

Circuit breaker 🟢 GREEN (`guardrail-2026-11-13.md`, judged 11-10):
- Revenue $229.90, +19.6% vs same weekday.
- RPM $20.72, +27.5%.
- 3-day revenue +16.8%.
- Health all ok.

Mediavine 28d $6,104.31 (+4.6%); 7d $1,653.77 (+14.5%).

**Sources (read 2026-11-13 ≈11:45Z, read-only):**
- Mediavine reporting MCP `mv_metrics_summary` for 10-19→10-25 (E332 baseline), 11-04→11-10 (7d anchored at the last finalized day) and 10-14→11-10 (28d).
- `reports/funnel/history.json` `expectation` (ramp basis).
- Scoreboard 2026-11-13, re-run in Rio's worktree with this PR's change.

## (a) E332(b): graded 2 days late (due 11-11)

Pre-committed rule (11-04): imp/session ≥ 16.47 **and** session RPM ≥ 95% of $16.62 (= $15.79). Otherwise, a T2 ad-density package (SD-5).

| MV 7d | 10-19→10-25 (baseline) | 11-04→11-10 | Δ |
|---|--:|--:|--:|
| Paid impressions / session | 16.47 (1,459,846 / 88,651) | **18.34** (1,579,173 / 86,115) | +11.4% |
| Session RPM | $16.62 | **$19.20** | +15.5% |
| Revenue | $1,473.53 | $1,653.77 | +12.2% |

**PASS on both legs.** E332 is closed, and no ad-density package is warranted.

## (b) Page-mix read: where the +15.5% RPM comes from

| Factor (session RPM = pv/session × imp/pv × $/1k imp) | Baseline | Now | Δ |
|---|--:|--:|--:|
| Pageviews / session | 1.514 | **1.794** | **+18.5%** |
| Paid impressions / pageview | 10.88 | 10.22 | −6.0% |
| Revenue / 1k paid impressions | $1.009 | $1.047 | +3.7% |
| Monetizable-session share | 57.2% | 68.9% | +20.5% |
| Revenue / monetizable session (×1k) | $29.05 | $27.85 | −4.1% |

What this means:
- **The whole RPM gain is depth.** Sessions fell 2.9% (88,651 → 86,115), but pageviews rose 15.1% and the share of sessions that see an ad rose from 57% to 69%.
- **Ad rates did not drive it.** Price per impression is up only 3.7% (Q4 seasonal), and revenue per *monetized* session fell 4.1%.
- The gain is consistent with the #388 Launcher depth effect E332 recorded (mon-pv/session +15.4%). It is not demand-side.
- **Operator's rule applied:** this is not growth. A deeper visit on fewer visits holds RPM up but does not move the sessions ramp.

## (c) Splitting the 28d gap to the ramp (10-14→11-10)

The ramp comes from `history.json` `expectation`: a straight line from August ($6,066/mo ad at 401,901 sessions + $100 non-ad) to December (600k sessions at the **baseline RPM $15.09** + $1,000 non-ad), prorated to 28 days. On day 71 of 122 it gives:
- ad $7,049.66 on 467,137 sessions
- non-ad $563.41
- total $7,613.07

| Component | $ vs ramp |
|---|--:|
| Sessions short: (467,137 − 352,355) × $15.09/1k | **−$1,732.06** |
| RPM above the ramp's $15.09: 352,355 × ($17.32 − $15.09)/1k | **+$787.27** |
| Non-ad short: $563.41 − $165 (digest's prorated public counter) | −$398.41 |
| **Total gap** ($7,613 − $6,269) | **−$1,343.76** |

- **Sessions explain 129% of the gap. RPM pays back 59%. Non-ad accounts for 30%.**
- On the Members API basis (non-ad $144.50/mo → $130.52 prorated), the non-ad shortfall is −$432.89 and the total gap is −$1,378.24.
- At today's 28d RPM of $17.32, the ad ramp needs **406,923 sessions/28d**, which is 87.1% of the sessions ramp. The site is 54,568 sessions short of ad parity even with the RPM gain.
- No RPM lever closes this. It is an AUDIENCE gap, which agrees with Quinn's dispatch.

## (d) Rollback-bound risk (guardrail: "in-window production deploys 59 exceed rollback bound 24")

- Today: **no exposure.** The judged day is green, and 7d is +14.5%.
- The real exposure is **11-14 and 11-15.** That is when 11-11 and 11-12 finalize, the first days that carry the operator's 11-11 evening batch (#514→#535: auth #515/#522, uploads #533/#534, route removals #531, CSS #532, and more).
- With more than 24 deploys in the window, the breaker would **withhold** an automatic rollback on a red day. A red read on those days therefore needs a manual bisect of app-page deploys, using page RPM on touched paths. Nothing will undo it automatically.
- I will watch page RPM on `/mods/*`, `/go/*` and the upload/creator paths in those reads.

## (e) Move: scoreboard non-ad headline reads the Members API (E403, T1, `scripts/agents/**`)

- **Problem.** E392 showed the public tier counter is an artefact: 69 / $179 against the API's 54 / $138.50.
- **Change.**
  - The headline now uses the Members API, with the public page as a fallback only.
  - It names its source.
  - It writes `null` when neither source is measured (E126).
  - `funnel-history.ts` treats Patreon as unmeasured only when the headline source is null; older scoreboards keep the old rule.
- **Live check (this worktree, 11-13).** The headline reads `$144.50/mo gross (Patreon Members API 56 paid; public counter $179.00 not used, E392)`, and `headline.nonAdSource = "members-api"`.
- **Effect on the dashboard.** `nonAdMonthly` steps from $179 to about $144.50 from 11-13 on. That is a −$34.50 discontinuity in the *measurement*, not in revenue. It sits inside the B2 floor read ($155): metric #2 now reads **below** the floor, which is accurate.

— Rio, Product & Revenue
