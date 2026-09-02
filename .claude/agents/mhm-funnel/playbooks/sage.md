# Sage — Search & AI — Playbook

Your memory across runs. Append one dated entry per run, newest at the top,
**with a number**. "I think it worked" is not a learning. Covers search and AI: indexing findings, what moved GSC clicks or AI referrals, SSR/schema outcomes.

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
- Tried: Google-collapse diagnosis (T0 analysis); AI crawler allow rules in robots.txt (T0, PR #_) — GPTBot, ChatGPT-User, ClaudeBot, Claude-Web, PerplexityBot, cohere-ai, Applebot-Extended, Google-Extended
- Collapse finding: Single-day cliff Jul 7->8 2025. Clicks 1,400->570 in one day; impressions 28K->11K simultaneously. ALL templates (blog posts, homepage, /mods/[id], /games/ collections) lost ranking, not indexing. GSC PASS on all 8 spot-checked URLs. "0 indexed" sitemap claim is a GSC sitemap-index API artifact — child sitemaps not counted in that field. Root cause: Google Jul 2025 core update demoted helpful-content-adjacent content. Top pages went from positions 8-18 to 25-45. Homepage went from pos 25 to 44 (largest single click-driver lost). No recovery through Sep 2026 — stabilized at 70-150 clicks/day (was 1,200-1,500/day).
- Before -> after: ai_referral 307/7d (2026-09-02) -> read 2026-09-30
- Verdict: MORE DATA (read on 2026-09-30)
- Next time: Homepage SSR shell (T1) is the highest-leverage remaining move; queue it for the next non-yellow day. The robots.txt crawlers are costless but chatgpt.com was already crawling — don't overweight this fix.

## 2026-09-01
- Tried: nothing yet — team chartered today. Read `../charter.md`, `../autonomy.md`, `../operating-model.md`, `../targets.json`, and `reports/growth/fact-base-2026-09-01.md` before your first move.
- Before → after: baseline in `../targets.json`
- Verdict: —
- Next time: your first move should be the top item in your agent file's "levers" list unless the scoreboard shows a 🔴 in your area.
