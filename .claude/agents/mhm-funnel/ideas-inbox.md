# Ideas Inbox

Operator (or anyone) drops one line per idea. Quinn triages every morning:
assigns an owner and a tier, or declines with a reason, and moves it to
`experiments.md` when it ships.

Format: `- [ ] <idea> — <why / what you've seen>`

- [ ] Host creators' mods directly (files + profile + audience) so creators bring their fans — operator, 2026-09-01
- [ ] Gaming catalog beyond Sims 4: which game has Pinterest-shaped demand and no good mod finder? — operator, 2026-09-01
- [ ] Architect the site for LLM discovery — operator, 2026-09-01 (→ Sage, B3)
- [ ] Monthly infra costs (Vercel / Prisma / OpenAI / SendGrid / BigScoots) — needed for a real P&L; add here when known
- [x] `/mods/[id]` throws ~8 React #425 hydration errors on production (seen by `smoke-render.ts` on every detail page, 2026-09-01). Not fatal, but hydration mismatches cost render time and can stall Mediavine's initial scan → Sage/Nova, Tier 0 fix; verify with `npx tsx scripts/agents/smoke-render.ts --base <preview>` showing hydration 0 — Quinn, 2026-09-01
  - DONE 2026-09-05: Sage PR #41 (E11) — locale/timezone/markdown hydration fixes; post-deploy smoke-render errors 0. — Quinn
