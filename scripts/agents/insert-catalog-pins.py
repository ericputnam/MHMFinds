#!/usr/bin/env python3
"""Queue catalog-page pins into the pinner backlog (Pip, Distribution).

The pinner drains blog posts only. Collection pages under /games/sims-4/* have
never had their own URLs pinned, so the only Pinterest traffic they get arrives
sideways through blog-post pins (E1 / DQ-2, 2026-09-02). E1 put the first seven
catalog URLs into the Supabase queue on 2026-09-04 (IDs 11421-11427, all seven
posted). This is the same move for the collection pages that have shipped since.

2026-09-07 batch: /games/sims-4/makeup-cc/ (Nova, E7, 2026-09-04) and
/games/sims-4/witch-cc/ (Nova, E3, 2026-09-02). Both had 0 sessions from any
source in GA4 for 2026-08-30 -> 2026-09-05.

Safe to re-run: every insert is guarded by a duplicate check on Image URL.

USAGE
    python3 scripts/agents/insert-catalog-pins.py --dry-run
    python3 scripts/agents/insert-catalog-pins.py

ENV
    MHM_PINTEREST_CONFIG  path to the pinner config.json holding SUPABASE_URL /
                          SUPABASE_KEY (default ~/java_projects/MHMUtils/config.json)

Credentials are read from that file and never printed.
"""

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import date

DEFAULT_CONFIG = os.path.join(
    os.path.expanduser('~'), 'java_projects', 'MHMUtils', 'config.json')
TABLE = 'n8n_pinterest_posts'
POST_DATE = str(date.today())

# Pin copy is written to read like a person wrote it: a concrete promise, the
# things a simmer actually searches for, no marketing throat-clearing. Counts
# match what the live page says so the pin never over-promises.
CATALOG_ENTRIES = [
    {
        # E7 / PR #32 — 922 verified mods across makeup, eyebrows, eyeliner,
        # blush, lipstick, eyes. Live title: "Browse 900+ Looks".
        'Post Title': '900+ Sims 4 Makeup CC Finds — Lashes, Lipstick, Blush and Full Sets',
        'Post URL': 'https://musthavemods.com/games/sims-4/makeup-cc/',
        'Image URL': 'https://blog.musthavemods.com/wp-content/uploads/2024/11/3-800x1200.png',
        'Board ID': '762656586837358122',
        'Board Name': 'Sims 4 CC Makeup',
        'Wordpress Keyword': 'sims-4-makeup-cc',
        'AI Text Slug': (
            'Every Sims 4 makeup CC in one place — lashes, eyeshadow, lipstick, blush, '
            'brows and full glam sets, sorted by what simmers download most. Free finds, '
            'maxis match and alpha. #sims4 #sims4cc #sims4makeup #simsccfinds'
        ),
        'Post Date': POST_DATE,
        'Is Posted': False,
    },
    {
        # E3 / PR #22 + #27 — witch/spellcaster keyword collection.
        'Post Title': 'Sims 4 Witch CC for Spellcasters — Broomsticks, Cauldrons and Cottage Magic',
        'Post URL': 'https://musthavemods.com/games/sims-4/witch-cc/',
        'Image URL': (
            'https://blog.musthavemods.com/wp-content/uploads/2024/10/'
            'The-Late-Night-Snack-of-the-Celestial-Witch-1024x1536.webp'
        ),
        'Board ID': '762656586838171420',
        'Board Name': 'Sims 4 Witch CC - Custom Content for Spellcasters',
        'Wordpress Keyword': 'sims-4-witch-cc',
        'AI Text Slug': (
            'Sims 4 witch CC for your spellcaster — witchy dresses and hats, broomsticks, '
            'cauldrons, spell books, potion clutter and moody celestial decor. All free '
            'downloads in one filterable grid. #sims4 #sims4cc #sims4witch #spellcaster'
        ),
        'Post Date': POST_DATE,
        'Is Posted': False,
    },
]


def load_config():
    path = os.environ.get('MHM_PINTEREST_CONFIG', DEFAULT_CONFIG)
    if not os.path.isfile(path):
        print('ERROR: pinner config not found at {}'.format(path))
        sys.exit(2)
    with open(path) as handle:
        return json.load(handle)


def request(config, method, path, params=None, body=None, prefer=None):
    url = '{}/rest/v1/{}'.format(config['SUPABASE_URL'].rstrip('/'), path)
    if params:
        url += '?' + urllib.parse.urlencode(params)
    headers = {
        'apikey': config['SUPABASE_KEY'],
        'Authorization': 'Bearer ' + config['SUPABASE_KEY'],
        'Content-Type': 'application/json',
    }
    if prefer:
        headers['Prefer'] = prefer
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=30) as response:
        raw = response.read().decode()
    return json.loads(raw) if raw else []


def image_url_exists(config, image_url):
    rows = request(config, 'GET', TABLE,
                   params={'select': 'id', 'Image URL': 'eq.' + image_url})
    return len(rows) > 0


def main():
    dry_run = '--dry-run' in sys.argv
    print('=== {} catalog pins -> {} ==='.format(
        'DRY RUN:' if dry_run else 'Inserting', TABLE))

    config = load_config()
    inserted = skipped = 0

    for entry in CATALOG_ENTRIES:
        print('\n[{}] {}'.format(entry['Wordpress Keyword'], entry['Post Title']))
        try:
            if image_url_exists(config, entry['Image URL']):
                print('  SKIP (image already queued)')
                skipped += 1
                continue
            if dry_run:
                print('  WOULD INSERT -> {} (board {})'.format(
                    entry['Post URL'], entry['Board Name']))
                inserted += 1
                continue
            rows = request(config, 'POST', TABLE, body=entry,
                           prefer='return=representation')
            new_id = rows[0]['id'] if rows else '?'
            print('  INSERTED id={} -> {}'.format(new_id, entry['Post URL']))
            inserted += 1
        except urllib.error.HTTPError as exc:
            print('  ERROR: HTTP {} from Supabase'.format(exc.code))
            skipped += 1
        except Exception as exc:
            print('  ERROR: {}'.format(exc))
            skipped += 1

    print('\n=== Done: {}={}, skipped={} — Post Date {} ==='.format(
        'would insert' if dry_run else 'inserted', inserted, skipped, POST_DATE))
    print('Entries drain at the pinner\'s normal ~3 pins/hour rate.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
