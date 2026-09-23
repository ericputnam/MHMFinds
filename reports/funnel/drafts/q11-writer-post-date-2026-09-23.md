# Q11 follow-up — the writer cron inserts drafts, not scheduled pins (Pip, E82, 2026-09-23)

**Tier 2** (operator's `MHMUtils` server script; changes the writer's queue timing — SD-10).

## What the numbers say (Supabase `n8n_pinterest_posts`, read 2026-09-23 ~11:00Z)

- Writer rows (`Wordpress Post ID` set) created since the cron went live 09-21: **268 / 25 / 48** per day (341 total).
- **341 of 341 carry `Post Date = 2025-01-01`** and `Is Posted = false`. Aug 1 → Sep 4 (pre-drought, plugin-driven): 25 of 474 (5%) had that date; 95% were dated same-day to +14d and 449/474 posted.
- Inflow to the poster's window (`[today-14d, today]`) is therefore **0 rows/day**. The whole forward queue is the Q12 revival slice: 7 rows/day dated 09-24 → 10-04 (77 rows). It is **dry on 2026-10-05**.
- Posting cadence is already following the drip: 35.1/day (7d mean) → **15 pins in the last 24h**, settling at 7/day. Pinterest is ~65% of sessions 28d (355,212 = 96.9% of the line).
- The standing top-up (SD-10 amendment) cannot fire: 77 ÷ 32.5/day = 2.37 d ≥ 2.0 today, and the formula *rises* as the drain falls (77 ÷ 15 = 5.1 d). It measures the residue against yesterday's rate, not the allotment against the rate we want.

## Cause

`~/java_projects/MHMUtils/posts_2_supabase_server.py:400-401`:

```python
    # Placeholder date so n8n doesn't pick up entries prematurely
    post_date = '2025-01-01'
```

By design the cron writes drafts; the step that assigns a real `Post Date` (the plugin's manual schedule press) is not part of the server path, so nothing ever promotes them.

## Recommendation (one word to approve)

Approve **one** of:

1. **Schedule at insert (preferred):** in the cron path only, date each new row forward at the writer's historical allotment (Aug mean ≈ 25 rows per 2-day batch ≈ 12/day, max-per-URL 1/day, never past +14d). One flag (`--schedule-per-day N`) in `posts_2_supabase_server.py`, default off, cron line passes `--schedule-per-day 12`. Pip writes the patch; the scp is yours.
2. **Writer presses schedule:** ask the writer to run the plugin's schedule step for the September rows (341 waiting). No code.
3. **Team-side promotion:** extend `pin-runway-topup.py` to treat sentinel-dated writer rows as its selection pool and raise the trigger to "rows dated in the next 7 d < 7 × target rate" — still ≤7/day, still sessions-ranked. This changes the writer's queue timing → stays Tier 2.

Cost of waiting: the queue drips 7/day until 10-04 and is empty 10-05; at ~1.5 sessions per pin-day observed on revived pages that is a cadence −80% vs last week going into October, on the channel that is 65% of the headline number.

Rollback for (1): revert the flag; rows already dated can be reset to `2025-01-01` by id from the insert log.

— Pip, Traffic
