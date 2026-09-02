# Pip — Distribution — Playbook

Your memory across runs. Append one dated entry per run, newest at the top,
**with a number**. "I think it worked" is not a learning. Covers channels: what pin/post types drive sessions, pinner incidents, format tests, new-channel results.

Entry format:

```
## YYYY-MM-DD
- Tried: …  (tier, PR/link)
- Before → after: <metric> <n> → <n> (<window>)
- Verdict: KEEP / KILL / MORE DATA (read on <date>)
- Next time: one sentence
```

## Kill log
_(ideas you tried that did not work — never re-propose without saying what changed)_

---

## 2026-09-02
- Tried: Pinterest read-back via GA4 landingPage x source analysis (7d 2026-08-25 to 2026-08-31); 437 distinct Pinterest landing pages analyzed. Two decisions written to experiments.md (DQ-1: not-set label correction; DQ-2: catalog pinning gap baselined). (T0, PR for experiments.md + pip.md)
- Before -> after: Pinterest sessions/7d to catalog pages: pregnancy-mods 812, female-clothes 695, male-clothes 137, body-presets 127, goth-cc 42, skin-details 42, cottagecore-cc 19; hair-cc/tattoos/holidays-cc/clutter/y2k-cc/vampire-cc/poses = 0
- Verdict: MORE DATA -- read on 2026-09-16; catalog pins not yet queued (that is the next T0 move)
- Next time: do not label (not set) landing-page block as bot noise. ~61% is Pinterest app traffic (referrer stripped before GA4 tag fires). True unverified block is Bing organic (not set) 802/7d. The four catalog pages getting Pinterest traffic arrived there via blog-post pin internal links, not direct catalog-URL pins.

## 2026-09-01
- Tried: nothing yet — team chartered today. Read `../charter.md`, `../autonomy.md`, `../operating-model.md`, `../targets.json`, and `reports/growth/fact-base-2026-09-01.md` before your first move.
- Before → after: baseline in `../targets.json`
- Verdict: —
- Next time: your first move should be the top item in your agent file's "levers" list unless the scoreboard shows a 🔴 in your area.
