# Max's Playbook — Ad Revenue Ops

I read this at the start of every run and append to it at the end. This is my
memory across sessions. Newest learnings at the top.

## Operating notes
- Read `charter.md` + `targets.json` first. My primary KPI: **session-RPM**.
- Only run read-only / `:dry-run` revenue scripts. Draft layout changes on a
  feature branch + PR; Mediavine layout changes need human approval.
- After any prod push that touches ads, ensure `check-blog-sidebar.sh` is run.

## Known-good patterns (from repo CLAUDE.md — already validated)
- Empty `<aside id="secondary">`, sidebar visible at `lg:` (not `xl:`), no placeholder divs → sidebar health 50+.
- `.mv-ads` needs ≥2 children to inject. Render ad anchors on first paint.
- 10s interstitial countdown > 5s for viewable impressions.

## Known-bad patterns (never reintroduce)
- Double `mediavine.newPageView()`; loading guard hiding anchors; `position: sticky/fixed` on ad containers; `overflow:hidden` on sidebar ancestors; SSH-editing functions.php.

## Learnings log
<!-- format: YYYY-MM-DD — situation → action → RPM before/after → verdict -->

**2026-07-30 — Weekly exec review: Jul 21 exit criterion breached, re-ran advertiser decomposition.**
Situation: Mark flagged weekly ad revenue $1,527.47 vs $2,045 target (-25.3%), session-RPM
$18.70 (Mediavine) / $15.86 (true, ÷ GA4 sessions) vs $24.00 target. The 07-02 mitigation
report set an exit criterion: if blended CPM hadn't recovered to $0.95+ by ~Jul 21, trigger a
full code-level audit (second, non-seasonal factor suspected). CPM was still $0.80-0.87 as of
Jul 30 — 9 days past the checkpoint, unescalated.

Action: pulled `mv_health_status`, `mv_health_history` (Jul 1-28), `mv_devices`, `mv_ad_units`,
and `mv_advertisers` for three windows (Jun27-Jul3, Jul16-22, Jul23-29) and hand-computed
blended CPM (revenue÷impressions×1000) per week since the tool doesn't return a rolling trend.
Also ran `npm test -- sidebar-sticky-health` (23/23 pass).

Findings:
- Blended CPM is *continuing to soften*, not stalled-then-flat: $0.878 (Jun27-Jul3) → $0.838
  (Jul16-22) → $0.834 (Jul23-29). No sign of a Jul-21 inflection at all.
- Site health is clean: sticky-sidebar teal-star metric 13.0-14.3 all of July (goal 1.5),
  ads.txt/privacy_policy ok, all 23 source-level regression tests pass, device mix flat
  (~96% desktop rev share). This rules out a code regression as the cause.
- BUT the advertiser mix has a real, non-trivially-seasonal wrinkle: **Yieldmo** ($2.67-2.74
  CPM, 3.8-4.8% of weekly revenue in the two prior windows) is **entirely absent from the
  named top-20 partner list in the Jul23-29 pull** — likely folded into "Other" (partner count
  crept 14→15→16), meaning a premium high-CPM partner's demand shrank below the reporting
  threshold. Meanwhile low-CPM remnant exchanges picked up the impression share: Google AdX
  held ~18% of impressions at just $0.61 CPM, and SeedTag's impressions nearly tripled
  (31.3k→42.6k→96.7k) at $0.69-1.02 CPM. Trade Desk is down another -13% WoW ($101→$88) on top
  of already being down big from late June; Kargo/GumGum partially rebounded WoW but remain
  ~40-55% below late-June levels.
- Verdict: still a **demand-side compression story, not a code/site regression** — but it's
  deepening and broadening (a second premium partner, Yieldmo, now effectively dropped out)
  rather than resolving on the 2025 seasonal timeline. This is an account-management/Mediavine-relationship
  lever, not an engineering one. No ad-layout changes are warranted — that would repeat the
  "don't react to a demand-side dip with layout changes" mistake this playbook already flags.

RPM before/after: N/A (no code change made — this was decomposition/diagnosis only).

Verdict: Escalate to Mediavine account rep this week — confirm whether the 07-02
floor-CPM/fill-rate/Yieldmo-demand email ever got sent (it was drafted and queued as an
operator action; status unconfirmed as of this review). Re-run this same three-window
decomposition again in 1-2 weeks to see if CPM finally inflects or keeps sliding — if it's
still $0.83-ish by mid-August, tell Sterling/Mark the "seasonal, self-resolving" framing from
07-02 needs to be formally retired in favor of "structural demand softening, needs an active
account-side fix."
