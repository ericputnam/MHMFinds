# Post-rename watch — 2026-10-01 (anchor 2026-09-25T04:54:06Z; reads 2026-10-02, final 2026-10-09)

_Generated 2026-10-01T10:44:41.899Z by `scripts/agents/patreon-q4-gate-preread.ts --anchor rename` (E108). Read-only; Patreon Members API + production DB; counts only. The operator renamed the paid tiers at the anchor while the Q4 gate read HOLD; this file applies the gate's own revert clause from the rename onward — it does not re-open the gate._

## The rule (verbatim, operator-queue Q4)

The renames already happened at the anchor, so only the gate's revert clause is live here: revert the tier copy if cancels > 16/mo pace since 2026-09-25. Joins are watched against the 17/mo floor (a finding, not a revert). The $10 tier still waits on the connected leg (≥ 1/3 of paid patrons connected on site, Patreon-id join).

## Inputs today

| Input | Value | Leg |
|---|--:|---|
| Paid patrons (API) | 56 (10×$1, 43×$3, 2×$5, 1×$8) ≈ $156.50/mo · free 5607 · former 231 | |
| Paid joins since 2026-09-25 | 5 in 6.2 d → **24.5/mo pace** (perk tier 4; 7d 7) | joins ≥ 17/mo: **PASS** |
| Paid-and-connected (id join) | **1** of 56 paid = 1.8% (by email 1; 56/56 paid rows carry an id; 111/111 linked rows carry one) | ≥ 1/3 connected: **FAIL** |
| Cancels since 2026-09-25 (last charge on/after anchor) | 0 → 0/mo pace (7d 1) | cancels > 16/mo → revert copy: **no** |

**Revert the tier copy today: no** (cancels 0/mo pace vs > 16) · joins 24.5/mo pace vs floor 17 (holding; meaningless before ~D+3) · $10 tier: still HOLD on the connected leg.

- The cancels leg is a floor, not a count, until the 2026-10-01 charge run: Patreon bills most patrons on the 1st, so `last_charge_date ≥ 2026-09-25` can only see people who joined after the anchor and left again. Re-read cancels after 10-01 before treating "revert copy: no" as final.

## Why paid-and-connected is what it is: who the linked accounts are

111 site accounts have a Patreon login. Each Patreon id looked up in the campaign's 5894 member rows:

| Class | Accounts | Share |
|---|--:|--:|
| Active (paying) patron | 1 | 0.9% |
| Free member of the campaign | 11 | 9.9% |
| Former patron | 0 | 0% |
| Declined (payment failed) | 0 | 0% |
| Not in the campaign at all | 99 | 89.2% |
| No Patreon id stored | 0 | 0% |

- Largest class: **not in campaign** (99 of 111).
- 102 of 111 are Patreon-only site accounts (created by the Connect click itself — no credentials login); 9 linked an existing account. 41 of 111 were created on/after 2026-09-25; premium-flagged among them: 0.
- Linked-account users by creation day: 08-20: 1 · 09-08: 5 · 09-09: 10 · 09-10: 4 · 09-11: 6 · 09-12: 3 · 09-13: 3 · 09-14: 3 · 09-15: 1 · 09-16: 2 · 09-18: 2 · 09-19: 6 · 09-20: 5 · 09-21: 6 · 09-22: 3 · 09-23: 6 · 09-24: 4 · 09-25: 5 · 09-26: 6 · 09-27: 8 · 09-28: 11 · 09-29: 5 · 09-30: 3 · 10-01: 3.

## How to read this

- "Free member" dominating means the /go Connect link is doing exactly what E40 diagnosed: free followers connect, are told they are not a member, and the page offers them only the campaign landing page. That is a product gap on the post-connect state, not a Patreon-copy problem, and it is not fixed by renaming tiers.
- "Not in campaign" dominating would mean Connect is reaching Patreon users who never followed us — the CTA is then a follow funnel, and the first ask should be the free follow, not a pledge.
- "Active" ≥ 1/3 of paid is the only state in which the rule proceeds.

Re-run on 2026-10-02 and 2026-10-09: `npx tsx -r dotenv/config scripts/agents/patreon-q4-gate-preread.ts dotenv_config_path=.env.local --anchor rename`. Revert the tier copy only on the cancels leg (> 16/mo pace); joins < 17/mo pace is a finding for the digest, not a revert.
