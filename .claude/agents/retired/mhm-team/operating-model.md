# MHM Team Operating Model

_Established 2026-06-22 by the team (Sterling synthesizing Max, Tim, Mark)._
_This defines how the team works day-to-day. Agents read it alongside `charter.md`._

> **The scorecard is dollars, not commits.** The team is judged weekly on growing
> net take-home. Shipping code is not a defense. A team that ships 10 PRs but
> doesn't grow revenue has failed.

---

## 1. Daily operating model (light by design)

| Day-part | Who | What they do | Output |
|---|---|---|---|
| Morning ~15m | **Max** | RPM signal vs prior 7-day avg · run `check-blog-sidebar.sh` · scan `/go` interstitial for regressions · flag sidebar health <40 to Sterling | "RPM pulse" — one line 🟢/🟡/🔴 |
| Morning ~15m | **Tim** | GSC clicks WoW · `detect_quick_wins` · indexing spot-check on pages <7 days old · one distribution action | "Traffic pulse" — one line 🟢/🟡/🔴 |
| Morning ~10m | **Mark** | P&L delta vs prior week · watch OpenAI cost creep · score new backlog ideas vs net take-home ($50/mo min) | "Cost pulse" — flag if any cost line moved >10% WoW |
| Morning ~15m | **Ivy** | Affiliate EPC/CTR vs prior 7-day avg · broken/expired link scan · theme-coverage gaps | "Affiliate pulse" — one line 🟢/🟡/🔴 |
| Mid-day | **Sterling** | Review the three pulses. Green = silence. Red = escalate to operator immediately. | Silence (green) or escalation |
| EOD **Wed** | All | Append one lesson to playbook (tried → before/after → keep/drop/needs-more-data). Mark confirms no killed idea was re-proposed. | Playbook entries |

Most days the right answer is "all green, no action." The team is paid to grow
revenue, not to generate activity.

---

## 2. The weekly revenue cycle (core loop)

| Day | Beat | What happens |
|---|---|---|
| **Mon** | Ideation | Max/Tim/Mark each surface top ideas into `ideas-backlog.md` (read own playbook first to avoid re-proposing killed ideas). |
| **Tue** | Synthesis | Sterling fans out, merges into one ROI-ranked brief, applies the RPM priority multiplier, discards negative-ROI items. **Batch must include ≥1 non-code revenue idea** or Sterling sends it back. |
| **Wed** | Operator package | Sterling delivers the ranked brief (run `/mhm-review`). Operator 👍/👎 per idea. **This is the approval gate.** |
| **Thu** | Implementation | Approved ideas → feature branch + PR stating expected $ impact, profit-model term, and guardrails respected. Operator reviews & merges. No agent merges/deploys. |
| **Fri** | Measurement setup | Record the pre-ship "before" metric + date for each shipped item. Items that can't be measured aren't shipped. Measurement begins the next Monday. |

---

## 3. Idea pipeline & approval workflow

```
Proposed → Approved → In Progress → Shipped → Measured → Kept / Killed
```

- **Tracked in** [`ideas-backlog.md`](./ideas-backlog.md). Sterling owns it; any agent may append a row on Monday.
- **Non-code rule:** every weekly batch to the operator must include ≥1 non-code
  revenue idea (negotiation, content, partnership, platform activation, pricing).
- **Approval:** simple 👍/👎 per idea. No long back-and-forth.
- **Killed ideas** are logged with the reason and **never re-proposed** — unless the
  proposing agent explicitly states what materially changed and Sterling agrees.

---

## 4. Accountability — keep or lose the job

**Weekly revenue-growth math (net take-home, pro-rated weekly):**

```
Net (week) = (organic sessions × session-RPM)/4.33 + affiliate
           − (Vercel + Prisma + OpenAI + other)/4.33
```

Sterling reports this weekly vs prior week and vs `targets.json`.

| Condition | Consequence |
|---|---|
| 1 bad week | Noise. Note it, watch it. |
| 2 consecutive weeks flat/declining | Max, Tim, Mark each submit a written root cause (specific numbers) before the next cycle. |
| **3 consecutive weeks flat/declining net take-home, no approved high-ROI action in flight** | **Replacement condition — team is fired and replaced.** |
| Documented seasonal dip the team flagged proactively | 5% tolerance; threshold resets to next comparable period. |

---

## 5. Lessons-learned loop

- Every session, each agent appends one playbook entry **with a metric** ("I think
  it worked" is not a learning).
- Sterling reads all three playbooks at the start of each weekly cycle and promotes
  cross-agent patterns to standing decisions in `charter.md`.
- The kill log lives in the playbooks; re-proposing a killed idea without addressing
  the kill reason is overruled before it reaches the operator.

---

## 6. Automation (see also: schedule setup)

- **Baseline first (blocking):** Mark sets the baseline in `targets.json` before any
  scoring activates. **Revenue source:** the `mediavine-reporting` MCP (site 14318) —
  automated daily via API, no browser needed (`mv_metrics_summary`, `mv_earnings`,
  `mv_top_pages`, `mv_health_status`, …). A daily digest is also written to
  `reports/mediavine/YYYY-MM-DD.md`. Plus GA4 for traffic/monetization health. Infra
  costs (Vercel/Prisma/OpenAI) still from operator confirmation.
- **Revenue is now a daily signal**, not weekly — it's in the daily pulse. The weekly
  `/mhm-review` rolls it up + handles idea approvals (still operator-present for those).
- **Token note:** the Mediavine JWT lasts ~1 year. If a tool returns `AUTH_EXPIRED`,
  Mark flags the operator to refresh it (`scripts/mcp-mediavine/README.md`) — never guess.
- **Daily pulse:** light WoW checks (RPM/GSC/cost). Green = no message; red = escalate.
  `check-blog-sidebar.sh` runs as part of Max's daily check (non-negotiable per the
  Mar 2026 regression history).
- **Weekly `/mhm-review`:** operator-triggered (the operator must be present to
  approve). Suggested cadence: **Wednesday morning.**
- **Always operator-gated:** `functions.php`, Mediavine layout, infra, spending,
  merging to main. Automation escalates these; it never self-authorizes them.

— Sterling, CEO
