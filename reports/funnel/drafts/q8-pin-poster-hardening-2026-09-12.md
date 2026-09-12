# Q8 — Pinterest poster hardening (patch for the operator to deploy)

Patch: `reports/funnel/drafts/q8-pin-poster-hardening-2026-09-12.patch` (this dir)
Target repo: `/Users/eputnam/java_projects/MHMUtils` (clean vs HEAD `f534a02` for both files; `git apply --check` passes)
Files: `supabase_pin_poster_server.py`, `test_supabase_pin_poster.py`

## What changed
1. When Pinterest rejects a pin with HTTP 404 and/or API code 2031 (board section gone) and the row *had* a `Board Section ID`, the poster logs a warning and re-posts the same pin once with no `board_section_id` (lands on the board root). On success the row is marked `Is Posted` like any other pin. Any other error, or a second failure, behaves exactly as before.
2. Selection query order is now `Post Date.asc,id.asc` instead of `Post Date.asc`. Same rows are eligible; only the order among rows sharing a Post Date is now deterministic (lowest id first).
3. Tests: the existing order test is updated to the new string; 10 new mocked tests cover the retry (once, only on 404/2031, only when a section was sent, payload otherwise identical). No network.

## Apply (local, Mac)
```bash
cd /Users/eputnam/java_projects/MHMUtils
git apply --check /Users/eputnam/.mhm-worktrees/ops-2026-09-12/reports/funnel/drafts/q8-pin-poster-hardening-2026-09-12.patch
git apply        /Users/eputnam/.mhm-worktrees/ops-2026-09-12/reports/funnel/drafts/q8-pin-poster-hardening-2026-09-12.patch
./venv/bin/python3 -m pytest test_supabase_pin_poster.py -q     # expect 15 passed
git add supabase_pin_poster_server.py test_supabase_pin_poster.py && git commit -m "Pin poster: retry once on board root when section is gone; id.asc tiebreaker"
```
(`patch -p1 < <patch>` works too if you prefer it over `git apply`.)

## Deploy (from SERVER-SETUP.md — only the one file needs to go)
```bash
cd /Users/eputnam/java_projects/MHMUtils
scp -i ~/.ssh/bigscoots_staging -P 2222 supabase_pin_poster_server.py \
  nginx@74.121.204.122:/home/nginx/domains/blog.musthavemods.com/
```
No restart: it is a `*/20 * * * *` cron (`supabase_pin_poster_server.py >> cron_supabase_poster.log`), so the next run picks up the new file. Optional pre-check on the server: `python3 supabase_pin_poster_server.py --dry-run` (dry-run does not call Pinterest).

## Verify (next cron run after the scp; server is CDT, runs :00/:20/:40)
- `ssh -i ~/.ssh/bigscoots_staging -p 2222 nginx@74.121.204.122 'tail -40 ~/domains/blog.musthavemods.com/supabase_pin_poster.log'`
- Normal day: `Pin posted! ID: ...` then `Done! Posted: 1, Failed: 0, Remaining: N` with N falling by 1 per run.
- The new path only shows when a dead section is hit: `WARNING - Section <id> gone (404 - {"code":2031,...}) -> retrying on board root <board_id>` followed by `Pin posted! ID:` and `Marked as posted in Supabase`. If the retry also fails you see the usual `Pin creation failed: ...` twice and `Failed: 1` — that means the *board* is gone, not just the section (see risks).
- The MHMFinds side: `check-pinner.sh` step 6 (dead-section check) should stop firing; scoreboard pinner freshness stays green the following morning.

## Roll back
```bash
cd /Users/eputnam/java_projects/MHMUtils
git checkout f534a02 -- supabase_pin_poster_server.py test_supabase_pin_poster.py   # or: git revert <your commit>
scp -i ~/.ssh/bigscoots_staging -P 2222 supabase_pin_poster_server.py \
  nginx@74.121.204.122:/home/nginx/domains/blog.musthavemods.com/
```
Nothing else to undo: no schema, config, or crontab change.

— Pip, Distribution
