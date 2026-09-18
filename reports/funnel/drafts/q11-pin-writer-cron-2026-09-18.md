# Q11 — Pin writer on cron + apex-host patch (one operator session)

**Status:** approved by the operator 2026-09-17 ("approve all #2 items"), option (a):
*one cron line on the server running the pin writer (`posts_2_supabase_server.py`) daily,
dry-run first, applied together with the Q8 patch.*

**What this file is:** everything needed to go from approval to applied in one SSH/scp
session. Two patches, one crontab line, one dry run, one live run, one verification
query. Nothing here has been executed — the team never runs the writer or the poster live.

**Target repo:** `/Users/eputnam/java_projects/MHMUtils`, HEAD **`f534a026de765501c3d0d6b05ae050b31fbfc232`** (`f534a02`,
*"Restore server automation after Jul 6 migration; drain backlog gently"*).
Both patches were verified with `git apply --check` against that sha on 2026-09-18:

```
Checking patch posts_2_supabase_server.py...
Checking patch test_posts_2_supabase_server.py...
Q11 APPLY-CHECK OK
Q8 APPLY-CHECK OK
```

They touch **disjoint files**, so order does not matter:

| Patch | Files |
|---|---|
| Q8 `q8-pin-poster-hardening-2026-09-12.patch` | `supabase_pin_poster_server.py`, `test_supabase_pin_poster.py` |
| Q11 `q11-pin-writer-apex-host-2026-09-18.patch` | `posts_2_supabase_server.py`, `test_posts_2_supabase_server.py` *(new)* |

---

## 0. Read this before you run anything — what Q11 does and does not do

`posts_2_supabase_server.py` inserts every row with a **placeholder** `Post Date`:

```python
# Placeholder date so n8n doesn't pick up entries prematurely
post_date = '2025-01-01'          # line 353
```

The poster (`supabase_pin_poster_server.py`) only selects rows dated in
`[today − 14d, today]`. So **rows this writer creates are stranded on arrival, by
design.** They become postable one of two ways:

1. the WP plugin schedules a banner pin for that article → the 06:00 orchestrator
   (`run_pinterest_daily_server.py` → `daily_pin_poster_server.py --supabase-only`)
   matches the article URL and rewrites `Post Date` to the scheduled day; or
2. `scripts/agents/revive-stranded-pins.py` (MHMFinds, Tier 1, already approved)
   re-dates a capped slice forward.

**So Q11 does not raise pins/day on its own. It refills the pool that the revivals
drain.** That matters right now: the reachable non-blog stranded pool is ~1,000 rows
≈ five more 196-row slices, and the writer plugin has produced **0 rows since
2026-09-04**. Without Q11 the queue is finite and ends. With Q11 it is fed from every
new post again.

If you want the writer to date its own rows and cut the revival step out entirely,
that is a **separate one-flag change** (`--post-date` / `--spread N`) — queued as Q12,
not smuggled into an approved item.

### Why the host patch ships in the same session

`extract_post_content()` line 261 takes the pin destination straight from the
WordPress REST `link` field:

```python
canonical_url = post_data.get('link', '{}/p={}'.format(site_url, post_id))
```

…and line 393 writes it to the `Post URL` column. Read live on 2026-09-18:

```
https://blog.musthavemods.com/wp-json/wp/v2/posts/  → "link": "https://blog.musthavemods.com/sims-4-candle-cc/"
https://musthavemods.com/wp-json/wp/v2/posts/       → "link": "https://musthavemods.com/sims-4-candle-cc/"
```

The value therefore depends entirely on which host the **server's** `config.json`
`wordpress_site_url` points at — and the evidence says at least some runs used the
blog host: **203 of 1,664 stranded rows (12%) carried `blog.musthavemods.com`
destinations on 2026-09-14**, and the first revival slice (E26) landed 28 of 140 pins
on the proxied duplicate. Those pins resolve, but their sessions attribute to a URL
nothing else in the funnel optimises, and `update_supabase_entries()` has to run a
second fallback query to find the row again.

Turning the writer on daily without this patch means re-strapping that 1-in-8 defect
to every future post. Hence one session, both patches.

---

## (a) The crontab line

Server conventions come from `SERVER-SETUP.md` (absolute `cd`, `/usr/bin/python3`, no
venv, append to a `cron_*.log`, `2>&1`). Match them exactly:

```cron
30 5 * * * cd /home/nginx/domains/blog.musthavemods.com && /usr/bin/python3 posts_2_supabase_server.py --count 10 >> cron_posts_2_supabase.log 2>&1
```

The full crontab after the edit (the first three lines already exist — do not retype them):

```cron
30 5 * * * cd /home/nginx/domains/blog.musthavemods.com && /usr/bin/python3 posts_2_supabase_server.py --count 10 >> cron_posts_2_supabase.log 2>&1
0 6 * * * cd /home/nginx/domains/blog.musthavemods.com && /usr/bin/python3 run_pinterest_daily_server.py >> cron_pinterest.log 2>&1
*/20 * * * * cd /home/nginx/domains/blog.musthavemods.com && /usr/bin/python3 supabase_pin_poster_server.py >> cron_supabase_poster.log 2>&1
0 23 * * * cd /home/nginx/domains/blog.musthavemods.com && /usr/bin/python3 daily_pin_poster_server.py >> cron_banner_poster.log 2>&1
```

Choices, and why:

| Choice | Reason |
|---|---|
| **05:30 server-local (CDT) = 10:30 UTC** | It must land **before** the 06:00 orchestrator. Step 2 of that job re-dates Supabase rows for any article with a banner scheduled today; if the writer runs after it, a new post's image rows sit a full extra day before they can be scheduled. 05:30 also gives overnight publishes time to land. Cron on this box is server-local (`SERVER-SETUP.md` → "Timezone note"); DST moves it to 11:30 UTC in winter, which is fine — nothing downstream cares about the absolute hour, only the ordering against 06:00. |
| `/usr/bin/python3` | Same interpreter as the other three lines. The `*_server.py` scripts are stdlib + `requests` only; the system Python 3.9 has `requests`. **No venv on the server.** |
| `cd <domain dir> &&` | `SCRIPT_DIR` is resolved from `__file__`, but `config.json`, `pinterest-boards.csv` and `supabase_sync.log` are all read/written relative to it — and the other three cron lines do this. Consistency beats cleverness. |
| `--count 10` | Blog cadence is 4 posts/7d, 21/30d, so 10 covers ~2.5 weeks — the job can miss several days and still catch up. Cost: one Supabase `select` per image URL per run (~150 duplicate checks on a steady day, almost all returning "already there"). Anything larger multiplies that for no gain. |
| `>> cron_posts_2_supabase.log 2>&1` | Matches the `cron_*.log` convention. The script *also* writes `supabase_sync.log` via its own `FileHandler` **and** streams to stderr, so each line will appear in both files — expected, not a bug. |
| No `--dry-run` in the cron line | Dry run is the manual step below, once. |

---

## (b) The dry run — run this first, read the output, then continue

```bash
ssh -i ~/.ssh/bigscoots_staging -p 2222 nginx@74.121.204.122
cd /home/nginx/domains/blog.musthavemods.com
/usr/bin/python3 posts_2_supabase_server.py --count 10 --dry-run
```

`--dry-run` still calls WordPress and still runs the duplicate `select` (it has to, to
count honestly) but **never POSTs to Supabase**. Nothing is written.

What good output looks like:

```
... - INFO - === Supabase sync started (server) ===
... - INFO - Pinterest token validated/refreshed
... - INFO - Default board: <name> (<id>)
... - INFO - Fetched 10 posts from WordPress
... - INFO - [DRY RUN] Would insert: Sims 4 Candle CC -> https://blog.musthavemods.com/wp-content/uploads/...
... (one line per new image)
... - INFO - === Supabase sync complete ===
... - INFO - Inserted: 74, Duplicates: 96, Skipped: 0, Failed: 0
Supabase sync: inserted=74, duplicates=96, skipped=0, failed=0
```

Check four things before going further:

1. **`Fetched 10 posts from WordPress`** — not `Failed to fetch posts: 401 …`. If the app
   password is wrong the run ends here and writes nothing.
2. **`Failed: 0`.** In dry-run mode a non-zero `Failed` can only come from the duplicate
   check erroring, which means Supabase is unreachable — stop and fix that first.
3. **`Inserted:` is a plausible two-digit number.** The 09-04 batch put 268 rows in the
   table; the 5–6 posts published since have never been scheduled, so expect roughly
   **50–120 would-be inserts** and a similar or larger `Duplicates` count. If `Inserted`
   is in the hundreds, the duplicate check is not matching — stop.
4. If `Inserted: 0, Duplicates: <large>`, everything is already queued. Harmless; the cron
   is still worth adding for future posts.

`--dry-run` deliberately reports the *image* URL on the "Would insert" line, not the
destination, so it does **not** prove the host fix. The verification query in (d) does.

---

## (c) The patch

**File:** `reports/funnel/drafts/q11-pin-writer-apex-host-2026-09-18.patch` (this directory).

`canonicalize_post_url()` rewrites `blog.musthavemods.com`, `www.musthavemods.com`,
`www.blog.musthavemods.com` and any `http://` variant onto `https://musthavemods.com`,
keeping path, query and fragment byte for byte. Host comparison strips credentials and
port. **Any other host is returned unchanged** — a creator's download link or a
third-party URL can never be rewritten, and neither can a lookalike such as
`musthavemods.com.evil.example`. It is applied at line 261, which is the single source
of the value written at line 393.

`rest_url` (`Wordpress Post Rest URL`) is deliberately **not** normalised: it has to keep
pointing at the host that actually serves the REST API.

**Tests:** new file `test_posts_2_supabase_server.py`, same style as the Q8 batch —
`unittest`, no network, no Supabase, no Pinterest. **12 tests**, verified passing on
2026-09-18 against a sandbox copy of the patched module (`12 passed in 0.07s`):

- blog / www / `http://` / port-and-credentials hosts → apex
- apex URL unchanged; function is idempotent
- path + query + fragment survive
- third-party hosts and the `musthavemods.com.evil.example` lookalike untouched
- `''` and `None` pass through
- `extract_post_content()` puts the apex URL in `canonical_url` (the `Post URL` column)
  when the REST `link` is on the blog host
- `extract_post_content()` leaves `rest_url` on the configured host

---

## (d) Operator runbook — one session, in this order

### 1. Apply both patches locally

```bash
cd /Users/eputnam/java_projects/MHMUtils
D=/Users/eputnam/java_projects/MHMFinds/reports/funnel/drafts

git apply --check $D/q8-pin-poster-hardening-2026-09-12.patch
git apply --check $D/q11-pin-writer-apex-host-2026-09-18.patch
# both must print nothing. Then:
git apply $D/q8-pin-poster-hardening-2026-09-12.patch
git apply $D/q11-pin-writer-apex-host-2026-09-18.patch
```

Expected: silence, and `git status` shows 3 modified + 1 new file.

### 2. Tests

```bash
./venv/bin/python3 -m pytest test_supabase_pin_poster.py test_posts_2_supabase_server.py -q
```

Expected: **`27 passed`** (15 from Q8 + 12 from Q11). Anything else → stop, do not scp.

### 3. Commit

```bash
git add supabase_pin_poster_server.py test_supabase_pin_poster.py \
        posts_2_supabase_server.py test_posts_2_supabase_server.py
git commit -m "Pin poster: retry on board root when section is gone, id.asc tiebreaker; pin writer: canonical apex Post URL"
```

### 4. Copy the two runtime files to the server

Test files stay local — the server only runs the `*_server.py` scripts.

```bash
scp -i ~/.ssh/bigscoots_staging -P 2222 \
  supabase_pin_poster_server.py posts_2_supabase_server.py \
  nginx@74.121.204.122:/home/nginx/domains/blog.musthavemods.com/
```

No restart. `supabase_pin_poster_server.py` is picked up by the next `*/20` cron run.

### 5. Dry run on the server

Section (b). Read all four checks before continuing.

### 6. Add the cron line

```bash
crontab -e     # as nginx
```

Paste the 05:30 line from (a) **above** the existing `0 6 * * *` line, save, then confirm:

```bash
crontab -l | grep posts_2_supabase
```

Expected: the line back, exactly as written.

### 7. One live run, by hand

```bash
cd /home/nginx/domains/blog.musthavemods.com
/usr/bin/python3 posts_2_supabase_server.py --count 10
```

Expected: the same shape as the dry run without the `[DRY RUN]` prefix, ending in
`Supabase sync: inserted=N, duplicates=M, skipped=0, failed=0` with **`failed=0`** and
`inserted` close to the dry run's number (a few will have flipped to duplicates if the
poster moved in between).

### 8. Verify the rows — this is the step that proves the host fix

Run on the server. It reads the credentials out of `config.json` and prints **no secrets**:

```bash
cd /home/nginx/domains/blog.musthavemods.com
/usr/bin/python3 - <<'PY'
import json, urllib.parse, urllib.request
c = json.load(open('config.json'))
q = urllib.parse.urlencode({
    'select': 'id,"Post URL","Post Date","Is Posted"',
    'order': 'id.desc',
    'limit': '15',
})
req = urllib.request.Request(
    c['SUPABASE_URL'] + '/rest/v1/n8n_pinterest_posts?' + q,
    headers={'apikey': c['SUPABASE_KEY'],
             'Authorization': 'Bearer ' + c['SUPABASE_KEY']})
rows = json.load(urllib.request.urlopen(req))
bad = [r for r in rows if 'blog.musthavemods.com' in (r['Post URL'] or '')]
for r in rows:
    print(r['id'], r['Post Date'], r['Is Posted'], r['Post URL'])
print('\nblog-host rows in this sample:', len(bad), '(must be 0)')
PY
```

Expected:

- 15 rows with ids **above 11430** (11430 was the last row created before the drought).
- every `Post URL` starts `https://musthavemods.com/` — **`blog-host rows in this sample: 0`**.
- every `Post Date` is **`2025-01-01`** and `Is Posted` is `False`. This is correct, not a
  failure — see section 0. They are inventory, not a schedule.

### 9. Next morning

Nothing about pins/day should change on day one; the new rows are stranded by design.
What should change is the stranded pool, upward. On the MHMFinds side:

```bash
./scripts/agents/check-pinner.sh
```

Expected: step 1 `[OK]`, step 2 `[OK]` with the stranded count **higher** than 1,219 by
roughly the number just inserted, step 6 `[OK]`. The runway number itself will not move
until a revival slice re-dates some of the new rows forward.

---

## (e) Rollback

**The cron line** — the only persistent change:

```bash
crontab -e     # delete the 30 5 * * * posts_2_supabase line, save
crontab -l | grep -c posts_2_supabase    # expect 0
```

**The patch** is additive: a new function, a new constant pair, one call site, one new
test file. Nothing is deleted or renamed, no schema, no config, no board, no token.

```bash
cd /Users/eputnam/java_projects/MHMUtils
git checkout f534a02 -- posts_2_supabase_server.py supabase_pin_poster_server.py
rm -f test_posts_2_supabase_server.py
scp -i ~/.ssh/bigscoots_staging -P 2222 \
  supabase_pin_poster_server.py posts_2_supabase_server.py \
  nginx@74.121.204.122:/home/nginx/domains/blog.musthavemods.com/
```

**Rows already written** post nothing on their own: `Post Date = 2025-01-01` is outside
the poster's 14-day window and `Is Posted` is false. If you want them gone anyway they
are a contiguous id range above 11430 and can be deleted in the Supabase UI — but there
is no need, and an unposted row costs nothing.

**Worst case if all of this is wrong:** the writer inserts duplicate-ish rows that the
poster can never select. No pin is posted, no pin is deleted, no live pin changes. The
blast radius of Q11 is one table's row count.

— Pip, Distribution
