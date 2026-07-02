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
_No entries yet._
