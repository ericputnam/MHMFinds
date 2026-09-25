# Q4 gate pre-read — 2026-09-25 (gate reads 2026-09-22)

_Generated 2026-09-25T10:45:18.044Z by `scripts/agents/patreon-q4-gate-preread.ts` (E69). Read-only; Patreon Members API + production DB; counts only. The rule below was written on 2026-09-08 — this file applies it, it does not choose it._

## The rule (verbatim, operator-queue Q4)

Proceed to renames + $10 tier only if paid joins ≥ 17/mo pace since 2026-09-08 AND ≥ 1/3 of paid patrons connected on site (Patreon-id join); revert the perk copy if cancels > 16/mo pace.

## Inputs today

| Input | Value | Leg |
|---|--:|---|
| Paid patrons (API) | 55 (10×$1, 42×$3, 2×$5, 1×$8) ≈ $153.50/mo · free 5492 · former 230 | |
| Paid joins since 2026-09-08 | 13 in 17.4 d → **22.7/mo pace** (perk tier 7; 7d 4) | joins ≥ 17/mo: **PASS** |
| Paid-and-connected (id join) | **0** of 55 paid = 0% (by email 0; 55/55 paid rows carry an id; 72/72 linked rows carry one) | ≥ 1/3 connected: **FAIL** |
| Cancels since 2026-09-08 (last charge on/after anchor) | 1 → 1.7/mo pace (7d 0) | cancels > 16/mo → revert copy: **no** |

**Decision the rule produces today: HOLD** — do not rename tiers or add the $10 tier on 09-22 unless the failing leg turns before the read.

- The cancels leg is a floor, not a count, until the 2026-10-01 charge run: Patreon bills most patrons on the 1st, so `last_charge_date ≥ 2026-09-08` can only see people who joined after the anchor and left again. Re-read cancels after 10-01 before treating "revert copy: no" as final.

## Why paid-and-connected is what it is: who the linked accounts are

72 site accounts have a Patreon login. Each Patreon id looked up in the campaign's 5777 member rows:

| Class | Accounts | Share |
|---|--:|--:|
| Active (paying) patron | 0 | 0% |
| Free member of the campaign | 8 | 11.1% |
| Former patron | 0 | 0% |
| Declined (payment failed) | 0 | 0% |
| Not in the campaign at all | 64 | 88.9% |
| No Patreon id stored | 0 | 0% |

- Largest class: **not in campaign** (64 of 72).
- 64 of 72 are Patreon-only site accounts (created by the Connect click itself — no credentials login); 8 linked an existing account. 71 of 72 were created on/after 2026-09-08; premium-flagged among them: 0.
- Linked-account users by creation day: 08-20: 1 · 09-08: 5 · 09-09: 10 · 09-10: 4 · 09-11: 6 · 09-12: 3 · 09-13: 3 · 09-14: 3 · 09-15: 1 · 09-16: 2 · 09-18: 2 · 09-19: 6 · 09-20: 5 · 09-21: 6 · 09-22: 3 · 09-23: 6 · 09-24: 4 · 09-25: 2.

## How to read this

- "Free member" dominating means the /go Connect link is doing exactly what E40 diagnosed: free followers connect, are told they are not a member, and the page offers them only the campaign landing page. That is a product gap on the post-connect state, not a Patreon-copy problem, and it is not fixed by renaming tiers.
- "Not in campaign" dominating would mean Connect is reaching Patreon users who never followed us — the CTA is then a follow funnel, and the first ask should be the free follow, not a pledge.
- "Active" ≥ 1/3 of paid is the only state in which the rule proceeds.

Re-run on 2026-09-22: `npx tsx -r dotenv/config scripts/agents/patreon-q4-gate-preread.ts dotenv_config_path=.env.local`.
