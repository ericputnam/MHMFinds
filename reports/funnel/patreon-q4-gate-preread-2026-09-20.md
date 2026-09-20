# Q4 gate pre-read — 2026-09-20 (gate reads 2026-09-22)

_Generated 2026-09-20T10:57:37.423Z by `scripts/agents/patreon-q4-gate-preread.ts` (E69). Read-only; Patreon Members API + production DB; counts only. The rule below was written on 2026-09-08 — this file applies it, it does not choose it._

## The rule (verbatim, operator-queue Q4)

Proceed to renames + $10 tier only if paid joins ≥ 17/mo pace since 2026-09-08 AND ≥ 1/3 of paid patrons connected on site (Patreon-id join); revert the perk copy if cancels > 16/mo pace.

## Inputs today

| Input | Value | Leg |
|---|--:|---|
| Paid patrons (API) | 54 (9×$1, 43×$3, 1×$5, 1×$8) ≈ $150.50/mo · free 5387 · former 230 | |
| Paid joins since 2026-09-08 | 10 in 12.5 d → **24.4/mo pace** (perk tier 5; 7d 3) | joins ≥ 17/mo: **PASS** |
| Paid-and-connected (id join) | **0** of 54 paid = 0% (by email 0; 54/54 paid rows carry an id; 47/47 linked rows carry one) | ≥ 1/3 connected: **FAIL** |
| Cancels since 2026-09-08 (last charge on/after anchor) | 1 → 2.4/mo pace (7d 0) | cancels > 16/mo → revert copy: **no** |

**Decision the rule produces today: HOLD** — do not rename tiers or add the $10 tier on 09-22 unless the failing leg turns before the read.

- The cancels leg is a floor, not a count, until the 2026-10-01 charge run: Patreon bills most patrons on the 1st, so `last_charge_date ≥ 2026-09-08` can only see people who joined after the anchor and left again. Re-read cancels after 10-01 before treating "revert copy: no" as final.

## Why paid-and-connected is what it is: who the linked accounts are

47 site accounts have a Patreon login. Each Patreon id looked up in the campaign's 5671 member rows:

| Class | Accounts | Share |
|---|--:|--:|
| Active (paying) patron | 0 | 0% |
| Free member of the campaign | 4 | 8.5% |
| Former patron | 0 | 0% |
| Declined (payment failed) | 0 | 0% |
| Not in the campaign at all | 43 | 91.5% |
| No Patreon id stored | 0 | 0% |

- Largest class: **not in campaign** (43 of 47).
- 43 of 47 are Patreon-only site accounts (created by the Connect click itself — no credentials login); 4 linked an existing account. 46 of 47 were created on/after 2026-09-08; premium-flagged among them: 0.
- Linked-account users by creation day: 08-20: 1 · 09-08: 5 · 09-09: 10 · 09-10: 4 · 09-11: 6 · 09-12: 3 · 09-13: 3 · 09-14: 3 · 09-15: 1 · 09-16: 2 · 09-18: 2 · 09-19: 6 · 09-20: 1.

## How to read this

- "Free member" dominating means the /go Connect link is doing exactly what E40 diagnosed: free followers connect, are told they are not a member, and the page offers them only the campaign landing page. That is a product gap on the post-connect state, not a Patreon-copy problem, and it is not fixed by renaming tiers.
- "Not in campaign" dominating would mean Connect is reaching Patreon users who never followed us — the CTA is then a follow funnel, and the first ask should be the free follow, not a pledge.
- "Active" ≥ 1/3 of paid is the only state in which the rule proceeds.

Re-run on 2026-09-22: `npx tsx -r dotenv/config scripts/agents/patreon-q4-gate-preread.ts dotenv_config_path=.env.local`.
