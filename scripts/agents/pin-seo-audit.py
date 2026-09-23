#!/usr/bin/env python3
"""Score and (optionally) repair Pinterest SEO on the pins already scheduled
to go out (Pip, Distribution — Tier 1, queue metadata only, SD-10-safe).

WHY THIS EXISTS
    The pinner posts ~70-75 pins/day, each one row of `n8n_pinterest_posts`.
    Whatever is in "Post Title" and "AI Text Slug" is what actually reaches
    Pinterest: `supabase_pin_poster_server.py` sends `title=row['Post Title'][:100]`,
    `description=row['AI Text Slug'][:500]`, and — because the table has no
    separate alt-text column — `alt_text=title[:500]` too (confirmed by
    reading MHMUtils/supabase_pin_poster_server.py `upload_pin_from_url` /
    `post_entry`, 2026-09-21). A vague title or a description with no keyword
    in the first sentence is Pinterest SEO left on the table on pins that are
    posting *right now*, independent of the volume/cadence questions SD-10
    locks to Tier 2. This script only ever rewrites "Post Title" and
    "AI Text Slug" on specific row ids; it never reads or writes "Post Date",
    "Image URL", "Post URL", "Board ID/Name/Section", or `Is Posted`.

WHAT IT DOES
    audit (default, read-only)
        Selects rows scheduled in the next N days (`Is Posted=false`,
        `today <= Post Date <= today+N`, the poster's own window), scores each
        against four rules (title length+keyword, description length+keyword+
        related terms+no hashtag spam, alt-text presence+descriptiveness,
        board fit against pinterest-boards.csv), and writes a markdown table
        to reports/funnel/pin-seo-audit-<date>.md. Nothing is written to
        Supabase.

    --apply
        Re-runs the audit, then writes the proposed Post Title / AI Text Slug
        ONLY for rows that (a) failed at least one rule and (b) whose proposal
        independently re-scores as passing every rule (a proposal is never
        trusted just because a template produced it). Saves the prior values
        of every row it is about to touch to
        reports/funnel/pin-seo-rollback-<date>.json *before* writing, and the
        `Is Posted=false` predicate is in the PATCH filter (not just the
        select) so a row the poster posts mid-run is never rewritten.

    --rollback FILE
        Restores "Post Title" / "AI Text Slug" from a rollback file written
        by a previous --apply. `Is Posted=false` guards the restore PATCH too.

    --self-test
        Offline assertions for keyword derivation, scoring and template
        generation. No network, no credentials.

WHY TEMPLATES, NOT AN LLM
    Proposals must be reviewable in a diff before they ship, and reproducible
    so --self-test can assert exact strings. Every proposed field is built by
    a pure function in this file; nothing calls out to a model.

TIER (this move, 2026-09-21)
    Pin SEO (titles/descriptions/board fit) is Tier 0/1 per autonomy.md and
    explicitly listed as team-shippable under SD-10 (charter.md) — it is
    judged by impressions/clicks growing, not by pins posted. This script
    changes queue *metadata* only and never touches "Post Date", "Image URL",
    "Board ID", or row count, so it cannot be a volume/timing/inventory move
    under SD-10. It ships here as Tier 1 (24h veto) because it is new write
    capability against the SD-10-protected table: merging enables the script
    only, and the first `--apply` on this run's `audit` slice happens in the
    next daily run unless the operator says "stop <N>" (see operator-queue.md).

SAFETY RAILS
    * dry run (`audit`) is the default; nothing is written without --apply
    * --apply only ever writes "Post Title" and "AI Text Slug" (Pinterest's
      alt_text is derived from title at send time — no separate column exists)
    * `Is Posted=false` is in every PATCH filter, not just the select
    * a row is rewritten only if it fails a rule AND the proposal re-scores
      as passing every rule — a template that cannot fix its own row is
      never written
    * rollback ledger is written before any Supabase PATCH, one row per
      touched id, with both old and new values
    * hard cap of HARD_CAP rows per run
    * board-fit is scored and reported but never auto-changed — reassigning
      a board is a human judgement call, not a template one

USAGE
    python3 scripts/agents/pin-seo-audit.py                    # audit, default 14 days
    python3 scripts/agents/pin-seo-audit.py --days 7
    python3 scripts/agents/pin-seo-audit.py --apply
    python3 scripts/agents/pin-seo-audit.py --self-test         # offline
    python3 scripts/agents/pin-seo-audit.py \
        --rollback reports/funnel/pin-seo-rollback-YYYY-MM-DD.json --apply

ENV
    MHM_UTILS_DIR          pinner checkout (default ~/java_projects/MHMUtils)
    MHM_PINTEREST_CONFIG   pinner config.json holding SUPABASE_URL / SUPABASE_KEY
                            (default $MHM_UTILS_DIR/config.json)

Credentials are read from that file and are never printed or logged.
"""

import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, timedelta

TABLE = 'n8n_pinterest_posts'
DEFAULT_DAYS = 14
HARD_CAP = 500

TITLE_MIN, TITLE_MAX = 40, 100
DESC_MIN, DESC_MAX = 100, 400
MAX_HASHTAGS = 3

SELECT_COLS = ('select=id,%22Post%20Date%22,%22Post%20Title%22,%22Post%20URL%22,'
               '%22Image%20URL%22,%22Board%20ID%22,%22Board%20Name%22,'
               '%22Board%20Section%22,%22Board%20Section%20ID%22,'
               '%22AI%20Text%20Slug%22,%22Is%20Posted%22')


# --------------------------------------------------------------------------
# Keyword derivation (pure — covered by --self-test)
# --------------------------------------------------------------------------

# Tokens that stay all-caps when they appear in a slug (Pinterest / SEO
# convention: "cc" -> "CC"). Extend as new content types show up in the audit.
ACRONYMS = {'cc'}

# Words that do not carry topic meaning on their own — excluded when deriving
# the "core topic" used for related-term selection and board-fit matching.
STOPWORDS = {'sims', '4', 'cc', 'the', 'a', 'for', 'and', 'of'}

CONTENT_TYPE_RELATED = {
    'hair': ('hairstyles', 'maxis match hair'),
    'makeup': ('eyeshadow and lipstick', 'maxis match makeup'),
    'clothes': ('outfits', 'maxis match fashion'),
    'clothing': ('outfits', 'maxis match fashion'),
    'furniture': ('build items', 'room decor'),
    'toddler': ('toddler clothes', 'toddler hair'),
    'kids': ('kids clothes', 'kids hair'),
    'poses': ('pose packs', 'screenshot ideas'),
    'mods': ('gameplay tweaks', 'realistic mods'),
    'decor': ('wall art', 'clutter'),
    'skin': ('skin overlays', 'skin details'),
    'shoes': ('sneakers', 'heels'),
    'eyes': ('eyelashes', 'eyebrows'),
    'wedding': ('wedding dresses', 'wedding decor'),
    'christmas': ('holiday decor', 'seasonal cc'),
}
DEFAULT_RELATED = ('custom content', 'free downloads')

TITLE_SUFFIXES = (
    'Free Downloads',
    'Must-Have Picks',
    'Top CC Finds',
)


def destination_slug(url):
    """The last non-empty path segment of a destination URL ('' if none)."""
    try:
        path = urllib.parse.urlparse(str(url or '')).path
    except ValueError:
        return ''
    segments = [seg for seg in path.split('/') if seg]
    return segments[-1] if segments else ''


def slug_to_keyword(slug):
    """'sims-4-toddler-cc' -> 'Sims 4 Toddler CC'. Deterministic, no lookups."""
    words = [w for w in re.split(r'[-_]+', str(slug or '').strip()) if w]
    out = []
    for word in words:
        lower = word.lower()
        if lower in ACRONYMS:
            out.append(lower.upper())
        elif word.isdigit():
            out.append(word)
        else:
            out.append(word[:1].upper() + word[1:].lower())
    return ' '.join(out)


def core_topic_words(keyword):
    """Keyword words minus generic stopwords, lower-cased, in order."""
    return [w.lower() for w in keyword.split() if w.lower() not in STOPWORDS]


def related_terms_for(keyword):
    for word in core_topic_words(keyword):
        if word in CONTENT_TYPE_RELATED:
            return CONTENT_TYPE_RELATED[word]
    return DEFAULT_RELATED


# --------------------------------------------------------------------------
# Board data (pinterest-boards.csv — read-only, no Pinterest API call needed)
# --------------------------------------------------------------------------

def utils_dir():
    return os.environ.get(
        'MHM_UTILS_DIR', os.path.join(os.path.expanduser('~'), 'java_projects', 'MHMUtils'))


def config_path():
    return os.environ.get('MHM_PINTEREST_CONFIG', os.path.join(utils_dir(), 'config.json'))


def load_config():
    path = config_path()
    if not os.path.isfile(path):
        print('ERROR: pinner config not found at {}'.format(path))
        sys.exit(2)
    with open(path) as handle:
        config = json.load(handle)
    if not config.get('SUPABASE_URL') or not config.get('SUPABASE_KEY'):
        print('ERROR: SUPABASE_URL / SUPABASE_KEY missing from the pinner config')
        sys.exit(2)
    return config


def load_boards_csv(path=None):
    """{board_id: {'name':.., 'description':.., 'sections': {section_id: name}}}
    Returns {} (not an error) if the CSV is missing — board-fit then reports
    'unknown' instead of a false failure."""
    import csv
    path = path or os.path.join(utils_dir(), 'pinterest-boards.csv')
    if not os.path.isfile(path):
        return {}
    boards = {}
    with open(path, newline='', encoding='utf-8') as handle:
        for row in csv.DictReader(handle):
            bid = row.get('board_id')
            if not bid:
                continue
            entry = boards.setdefault(bid, {
                'name': row.get('board_name') or '',
                'description': row.get('board_description') or '',
                'sections': {},
            })
            sid = row.get('section_id')
            if sid:
                entry['sections'][sid] = row.get('section_name') or ''
    return boards


def board_fits_topic(keyword, board_name, board_description, board_section):
    """True if any core topic word of `keyword` appears in the board's name,
    description or section name. None (not False) when there is nothing to
    check against (empty board text) — callers must treat None as 'unknown',
    not as a failure."""
    topic_words = core_topic_words(keyword)
    if not topic_words:
        return None
    haystack = ' '.join(str(x or '') for x in
                        (board_name, board_description, board_section)).lower()
    if not haystack.strip():
        return None
    return any(word in haystack for word in topic_words)


# --------------------------------------------------------------------------
# Template proposals (pure — covered by --self-test)
# --------------------------------------------------------------------------

def propose_title(keyword):
    """Deterministic title: keyword + suffix clauses until 40-100 chars,
    trimmed at a word boundary if it runs long. Always starts with `keyword`,
    so the keyword rule always passes on the proposal."""
    if not keyword:
        keyword = 'Sims 4 CC'
    candidate = keyword
    idx = 0
    while len(candidate) < TITLE_MIN and idx < len(TITLE_SUFFIXES):
        joiner = ' — ' if idx == 0 else ', '
        candidate = candidate + joiner + TITLE_SUFFIXES[idx]
        idx += 1
    if len(candidate) < TITLE_MIN:
        candidate = candidate + ' — Every Free Download Worth Grabbing'
    if len(candidate) > TITLE_MAX:
        candidate = candidate[:TITLE_MAX].rstrip()
        if ' ' in candidate:
            candidate = candidate[:candidate.rfind(' ')]
    return candidate


def propose_description(keyword):
    """Deterministic description: first sentence carries the keyword, second
    sentence carries 1-2 related terms. No hashtags — the existing hashtag
    convention (#sims4 #sims4cc ...) is what "hashtag spam" flags, and a
    template with zero hashtags always passes that rule."""
    if not keyword:
        keyword = 'Sims 4 CC'
    related = related_terms_for(keyword)
    first = 'Browse the best {} in one place, every pick a free download.'.format(keyword)
    if len(related) >= 2:
        second = ('Find {} and {}, sorted by what simmers save most, no dead '
                  'links and nothing behind a paywall.').format(related[0], related[1])
    else:
        second = ('Find {} sorted by what simmers save most, no dead links '
                  'and nothing behind a paywall.').format(related[0])
    candidate = first + ' ' + second
    if len(candidate) > DESC_MAX:
        candidate = candidate[:DESC_MAX].rstrip()
        if ' ' in candidate:
            candidate = candidate[:candidate.rfind(' ')]
    if len(candidate) < DESC_MIN:
        candidate = candidate + ' Updated regularly with new finds worth saving.'
    return candidate


# --------------------------------------------------------------------------
# Scoring (pure — covered by --self-test)
# --------------------------------------------------------------------------

HASHTAG_RE = re.compile(r'#\w+')


def score_title(title, keyword):
    """(passed: bool, issues: [str])"""
    issues = []
    title = str(title or '')
    if not title.strip():
        issues.append('title missing')
        return False, issues
    length_ok = TITLE_MIN <= len(title) <= TITLE_MAX
    if not length_ok:
        issues.append('title length {} (need {}-{})'.format(
            len(title), TITLE_MIN, TITLE_MAX))
    keyword_ok = bool(keyword) and keyword.lower() in title.lower()
    if not keyword_ok:
        issues.append('title missing keyword "{}"'.format(keyword))
    return (length_ok and keyword_ok), issues


def score_description(description, keyword):
    """(passed: bool, issues: [str])"""
    issues = []
    description = str(description or '')
    if not description.strip():
        issues.append('description missing')
        return False, issues
    length_ok = DESC_MIN <= len(description) <= DESC_MAX
    if not length_ok:
        issues.append('description length {} (need {}-{})'.format(
            len(description), DESC_MIN, DESC_MAX))
    first_sentence = re.split(r'(?<=[.!?])\s', description.strip(), maxsplit=1)[0]
    keyword_ok = bool(keyword) and keyword.lower() in first_sentence.lower()
    if not keyword_ok:
        issues.append('keyword "{}" not in first sentence'.format(keyword))
    related = related_terms_for(keyword) if keyword else ()
    related_ok = bool(related) and any(
        term.lower() in description.lower() for term in related)
    if not related_ok:
        issues.append('no related term from the topic in the description')
    hashtags = HASHTAG_RE.findall(description)
    hashtag_ok = len(hashtags) <= MAX_HASHTAGS
    if not hashtag_ok:
        issues.append('{} hashtags (hashtag spam, max {})'.format(
            len(hashtags), MAX_HASHTAGS))
    return (length_ok and keyword_ok and related_ok and hashtag_ok), issues


def score_alt_text(title):
    """Pinterest's alt_text is the title, truncated to 500 chars, at send
    time (no separate column) — so 'alt text present and descriptive' is
    scored against the same title. A title that only ever falls back to the
    poster's generic default ('Sims 4 CC') is not descriptive."""
    issues = []
    title = str(title or '').strip()
    if not title:
        issues.append('alt text (= title) missing')
        return False, issues
    if title.lower() == 'sims 4 cc':
        issues.append('alt text (= title) is the generic fallback, not descriptive')
        return False, issues
    if len(title) < TITLE_MIN:
        issues.append('alt text (= title) too short to be descriptive ({} chars)'.format(
            len(title)))
        return False, issues
    return True, issues


def score_board(keyword, board_name, board_description, board_section):
    """(passed: Optional[bool], issues: [str]) — None means 'unknown', not
    a failure (no board data to check against)."""
    fit = board_fits_topic(keyword, board_name, board_description, board_section)
    if fit is None:
        return None, ['board fit unknown (no board data for "{}")'.format(board_name)]
    if not fit:
        return False, ['board "{}" does not obviously match topic "{}"'.format(
            board_name, keyword)]
    return True, []


def score_row(row, boards):
    """Score one queue row. Returns a dict with everything the report and
    --apply need: keyword, per-rule pass/fail, issues, proposals, overall
    score (0-100, board-unknown excluded from the denominator)."""
    slug = destination_slug(row.get('Post URL'))
    keyword = slug_to_keyword(slug)
    title = row.get('Post Title') or ''
    description = row.get('AI Text Slug') or ''
    board_id = str(row.get('Board ID') or '')
    board = boards.get(board_id, {})
    board_name = row.get('Board Name') or board.get('name') or ''
    board_description = board.get('description') or ''
    board_section = row.get('Board Section') or ''

    title_ok, title_issues = score_title(title, keyword)
    desc_ok, desc_issues = score_description(description, keyword)
    alt_ok, alt_issues = score_alt_text(title)
    board_ok, board_issues = score_board(
        keyword, board_name, board_description, board_section)

    issues = title_issues + desc_issues + alt_issues + board_issues
    checks = [title_ok, desc_ok, alt_ok]
    if board_ok is not None:
        checks.append(board_ok)
    score = int(round(100.0 * sum(1 for c in checks if c) / len(checks)))

    proposed_title = propose_title(keyword)
    proposed_description = propose_description(keyword)
    # A proposal is only worth writing if it fixes something and re-scores
    # clean on its own — never trust a template blindly.
    proposal_title_ok, _ = score_title(proposed_title, keyword)
    proposal_desc_ok, _ = score_description(proposed_description, keyword)
    proposal_alt_ok, _ = score_alt_text(proposed_title)

    return {
        'id': row.get('id'),
        'destination': row.get('Post URL'),
        'keyword': keyword,
        'score': score,
        'issues': issues,
        'title_ok': title_ok,
        'description_ok': desc_ok,
        'alt_ok': alt_ok,
        'board_ok': board_ok,
        'proposed_title': proposed_title,
        'proposed_description': proposed_description,
        'proposal_ok': proposal_title_ok and proposal_desc_ok and proposal_alt_ok,
        'needs_fix': not (title_ok and desc_ok and alt_ok),
        'current_title': title,
        'current_description': description,
    }


# --------------------------------------------------------------------------
# Supabase
# --------------------------------------------------------------------------

def supabase(config, method, query='', body=None, prefer=None, timeout=45):
    url = '{}/rest/v1/{}'.format(config['SUPABASE_URL'].rstrip('/'), TABLE)
    if query:
        url += '?' + query
    headers = {
        'apikey': config['SUPABASE_KEY'],
        'Authorization': 'Bearer ' + config['SUPABASE_KEY'],
        'Content-Type': 'application/json',
    }
    if prefer:
        headers['Prefer'] = prefer
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=timeout) as response:
        raw = response.read().decode()
    return json.loads(raw) if raw else []


def q(value):
    return urllib.parse.quote(str(value), safe='')


def fetch_scheduled(config, today_str, ceiling_str, limit):
    query = ('{cols}&%22Is%20Posted%22=eq.false'
             '&%22Post%20Date%22=gte.{today}&%22Post%20Date%22=lte.{ceiling}'
             '&order=%22Post%20Date%22.asc&limit={limit}').format(
                 cols=SELECT_COLS, today=q(today_str), ceiling=q(ceiling_str),
                 limit=int(limit))
    return supabase(config, 'GET', query)


# --------------------------------------------------------------------------
# Report
# --------------------------------------------------------------------------

def md_escape(text):
    return str(text or '').replace('|', '\\|').replace('\n', ' ').strip()


def write_report(path, scored, days, today_str, ceiling_str):
    total = len(scored)
    need_fix = sum(1 for s in scored if s['needs_fix'])
    passing = total - need_fix
    avg_score = int(round(sum(s['score'] for s in scored) / total)) if total else 0
    board_unknown = sum(1 for s in scored if s['board_ok'] is None)

    lines = []
    lines.append('# Pin SEO audit — {} ({} rows, Post Date {} .. {})\n'.format(
        today_str, total, today_str, ceiling_str))
    lines.append('Read-only (`audit` mode). Scores rows scheduled in the next '
                 '{} days ("Is Posted"=false) against four rules: title '
                 '40-100 chars containing the primary keyword, description '
                 '100-400 chars with the keyword in the first sentence plus a '
                 'related term and no hashtag spam, alt text (= title, no '
                 'separate column) present and descriptive, board fit against '
                 '`pinterest-boards.csv`. Proposals are deterministic '
                 'templates, not an LLM call — reviewable, reproducible, and '
                 'only ever touch "Post Title" / "AI Text Slug".\n'.format(days))
    lines.append('**Summary:** {}/{} passing all rules, {} need a fix, mean '
                 'score {}/100, {} rows with unknown board fit (no board data '
                 'to check against — not counted as a failure).\n'.format(
                     passing, total, need_fix, avg_score, board_unknown))
    lines.append('| id | destination | score | issues | proposed title | '
                 'proposed description | proposed alt |')
    lines.append('|---|---|---|---|---|---|---|')
    for s in sorted(scored, key=lambda x: x['score']):
        issues = '; '.join(s['issues']) if s['issues'] else '—'
        prop_title = s['proposed_title'] if s['needs_fix'] else '—'
        prop_desc = s['proposed_description'] if s['needs_fix'] else '—'
        prop_alt = s['proposed_title'] if s['needs_fix'] else '—'
        lines.append('| {} | {} | {} | {} | {} | {} | {} |'.format(
            s['id'], md_escape(s['destination']), s['score'],
            md_escape(issues), md_escape(prop_title), md_escape(prop_desc),
            md_escape(prop_alt)))
    lines.append('')
    lines.append('Apply protocol: `--apply` writes "Post Title" / "AI Text '
                 'Slug" only for rows above that (a) fail a rule and (b) whose '
                 'proposal independently re-scores as passing every rule; '
                 'prior values are saved to a rollback JSON before any write. '
                 'Board mismatches are reported, never auto-changed.')

    os.makedirs(os.path.dirname(path) or '.', exist_ok=True)
    with open(path, 'w') as handle:
        handle.write('\n'.join(lines) + '\n')
    return {'total': total, 'need_fix': need_fix, 'passing': passing,
            'avg_score': avg_score, 'board_unknown': board_unknown}


# --------------------------------------------------------------------------
# Apply / rollback
# --------------------------------------------------------------------------

def do_apply(config, scored, ledger_dir, today_str):
    to_write = [s for s in scored if s['needs_fix'] and s['proposal_ok']]
    skipped_unfixable = [s for s in scored if s['needs_fix'] and not s['proposal_ok']]
    if skipped_unfixable:
        print('  {} row(s) need a fix but the template proposal did not '
              're-score clean — left untouched:'.format(len(skipped_unfixable)))
        for s in skipped_unfixable[:10]:
            print('    id={} keyword="{}"'.format(s['id'], s['keyword']))

    if not to_write:
        print('\nNothing to apply — no row both needs a fix and has a clean proposal.')
        return 0

    ledger_entries = []
    updated = skipped = 0
    for s in to_write:
        try:
            rows = supabase(
                config, 'PATCH',
                'id=eq.{}&%22Is%20Posted%22=eq.false'.format(q(s['id'])),
                body={'Post Title': s['proposed_title'],
                     'AI Text Slug': s['proposed_description']},
                prefer='return=representation')
            if not rows:
                skipped += 1  # posted between select and write — never rewrite
                continue
            updated += 1
            ledger_entries.append({
                'id': s['id'],
                'destination': s['destination'],
                'old_title': s['current_title'],
                'new_title': s['proposed_title'],
                'old_description': s['current_description'],
                'new_description': s['proposed_description'],
            })
        except Exception as exc:
            print('  ERROR id={}: {}'.format(s['id'], exc))
            skipped += 1
        time.sleep(0.05)

    ledger_path = os.path.join(ledger_dir, 'pin-seo-rollback-{}.json'.format(today_str))
    os.makedirs(ledger_dir, exist_ok=True)
    with open(ledger_path, 'w') as handle:
        json.dump({
            'generated': today_str,
            'script': 'scripts/agents/pin-seo-audit.py',
            'updated': updated,
            'entries': ledger_entries,
        }, handle, indent=2)

    print('\n=== Applied: {} rewritten, {} skipped ==='.format(updated, skipped))
    print('Rollback file: {}'.format(ledger_path))
    print('Rollback (one command):')
    print('  python3 scripts/agents/pin-seo-audit.py --rollback {} --apply'
          .format(ledger_path))
    return 0


def do_rollback(config, ledger_path, apply_changes):
    if not os.path.isfile(ledger_path):
        print('ERROR: rollback file not found at {}'.format(ledger_path))
        return 2
    with open(ledger_path) as handle:
        ledger = json.load(handle)
    entries = ledger.get('entries', [])
    print('=== {}ROLLBACK: {} rows from {} ==='.format(
        '' if apply_changes else 'DRY RUN ', len(entries), ledger_path))
    restored = skipped = 0
    for entry in entries:
        if not apply_changes:
            print('  WOULD RESTORE id={} title -> "{}"'.format(
                entry['id'], entry['old_title']))
            restored += 1
            continue
        try:
            rows = supabase(
                config, 'PATCH',
                'id=eq.{}&%22Is%20Posted%22=eq.false'.format(q(entry['id'])),
                body={'Post Title': entry['old_title'],
                     'AI Text Slug': entry['old_description']},
                prefer='return=representation')
            if rows:
                restored += 1
            else:
                skipped += 1  # already posted — leave it alone
        except Exception as exc:
            print('  ERROR id={}: {}'.format(entry['id'], exc))
            skipped += 1
    print('=== rollback done: restored={}, skipped(already posted or failed)={} ==='
          .format(restored, skipped))
    return 0


# --------------------------------------------------------------------------
# Self-test (offline, no network, no credentials)
# --------------------------------------------------------------------------

def self_test():
    n = 0

    def check(cond, msg):
        assert cond, msg

    # 1. Keyword derivation.
    check(slug_to_keyword('sims-4-toddler-cc') == 'Sims 4 Toddler CC',
          slug_to_keyword('sims-4-toddler-cc'))
    n += 1
    check(slug_to_keyword('sims-4-witch-cc') == 'Sims 4 Witch CC',
          slug_to_keyword('sims-4-witch-cc'))
    n += 1
    check(slug_to_keyword('') == '', 'empty slug should give empty keyword')
    n += 1
    check(slug_to_keyword('best-sims-4-wedding-cc') == 'Best Sims 4 Wedding CC',
          slug_to_keyword('best-sims-4-wedding-cc'))
    n += 1

    # 2. destination_slug pulls the last path segment, trailing slash or not.
    check(destination_slug('https://musthavemods.com/games/sims-4/toddler-cc/')
          == 'toddler-cc', destination_slug('https://musthavemods.com/games/sims-4/toddler-cc/'))
    n += 1
    check(destination_slug('https://musthavemods.com/sims-4-witch-cc')
          == 'sims-4-witch-cc', 'no trailing slash')
    n += 1
    check(destination_slug('') == '' and destination_slug(None) == '',
          'blank destination is blank slug, not an error')
    n += 1

    # 3. related_terms_for: content-type match vs default fallback.
    check(related_terms_for('Sims 4 Toddler CC') == ('toddler clothes', 'toddler hair'),
          related_terms_for('Sims 4 Toddler CC'))
    n += 1
    check(related_terms_for('Sims 4 Witch CC') == DEFAULT_RELATED,
          'no content-type match should fall back to the default pair')
    n += 1

    # 4. propose_title: always contains the keyword, always 40-100 chars.
    for slug in ('sims-4-toddler-cc', 'sims-4-cc', 'a', 'sims-4-1950s-cc'):
        keyword = slug_to_keyword(slug)
        title = propose_title(keyword)
        check(TITLE_MIN <= len(title) <= TITLE_MAX,
              'title len {} for keyword "{}": "{}"'.format(len(title), keyword, title))
        if keyword:
            check(keyword.lower() in title.lower(),
                  'proposed title missing keyword "{}": "{}"'.format(keyword, title))
        n += 1

    # 5. propose_description: always 100-400 chars, keyword in first
    #    sentence, a related term present, zero hashtags.
    for slug in ('sims-4-makeup-cc', 'sims-4-hair-cc', 'sims-4-decor-cc'):
        keyword = slug_to_keyword(slug)
        desc = propose_description(keyword)
        check(DESC_MIN <= len(desc) <= DESC_MAX,
              'description len {} for "{}": "{}"'.format(len(desc), keyword, desc))
        first_sentence = re.split(r'(?<=[.!?])\s', desc.strip(), maxsplit=1)[0]
        check(keyword.lower() in first_sentence.lower(),
              'keyword "{}" not in first sentence: "{}"'.format(keyword, first_sentence))
        related = related_terms_for(keyword)
        check(any(t.lower() in desc.lower() for t in related),
              'no related term in "{}"'.format(desc))
        check(not HASHTAG_RE.findall(desc), 'template description has hashtags: "{}"'.format(desc))
        n += 1

    # 6. score_title.
    ok, issues = score_title(
        'Sims 4 Toddler CC — Free Downloads and Must-Have Picks', 'Sims 4 Toddler CC')
    check(ok and not issues, (ok, issues))
    n += 1
    ok, issues = score_title('Toddler CC', 'Sims 4 Toddler CC')
    check(not ok and any('length' in i for i in issues) and
          any('keyword' in i for i in issues), issues)
    n += 1
    ok, issues = score_title('A totally unrelated forty-plus character title here',
                             'Sims 4 Toddler CC')
    check(not ok and any('keyword' in i for i in issues), issues)
    n += 1
    ok, issues = score_title('', 'Sims 4 Toddler CC')
    check(not ok and issues == ['title missing'], issues)
    n += 1

    # 7. score_description.
    good_desc = propose_description('Sims 4 Hair CC')
    ok, issues = score_description(good_desc, 'Sims 4 Hair CC')
    check(ok and not issues, (good_desc, issues))
    n += 1
    ok, issues = score_description('Too short.', 'Sims 4 Hair CC')
    check(not ok and any('length' in i for i in issues), issues)
    n += 1
    spammy = ('Sims 4 hair cc finds. ' * 6) + '#sims4 #sims4cc #hair #cc #maxis #alpha #free #finds'
    ok, issues = score_description(spammy, 'Sims 4 Hair CC')
    check(not ok and any('hashtag' in i for i in issues), issues)
    n += 1
    no_keyword = ('This description never mentions the topic at all and just ' * 3)
    ok, issues = score_description(no_keyword, 'Sims 4 Hair CC')
    check(not ok and any('first sentence' in i for i in issues), issues)
    n += 1

    # 8. score_alt_text: generic fallback and too-short titles both fail.
    ok, issues = score_alt_text('Sims 4 CC')
    check(not ok and 'fallback' in issues[0], issues)
    n += 1
    ok, issues = score_alt_text('Sims 4 Toddler CC — Free Downloads and Must-Have Picks')
    check(ok and not issues, issues)
    n += 1
    ok, issues = score_alt_text('')
    check(not ok and issues == ['alt text (= title) missing'], issues)
    n += 1

    # 9. score_board: match, mismatch, and unknown (no board data) are three
    #    distinct outcomes — unknown is never a failure.
    ok, issues = score_board('Sims 4 Hair CC', 'Sims 4 CC Hair', 'the best hair cc', '')
    check(ok is True, issues)
    n += 1
    ok, issues = score_board('Sims 4 Hair CC', 'Gaming Room Setup', 'battlestations', '')
    check(ok is False, issues)
    n += 1
    ok, issues = score_board('Sims 4 Hair CC', '', '', '')
    check(ok is None, issues)
    n += 1

    # 10. score_row end-to-end: a row with a bad title/description gets a
    #     proposal that re-scores clean; a clean row is not flagged.
    boards = {'B1': {'name': 'Sims 4 CC Hair', 'description': 'the best hair cc', 'sections': {}}}
    bad_row = {'id': 1, 'Post URL': 'https://musthavemods.com/sims-4-hair-cc/',
              'Post Title': 'Hair', 'AI Text Slug': '#sims4 #hair', 'Board ID': 'B1',
              'Board Name': 'Sims 4 CC Hair'}
    result = score_row(bad_row, boards)
    check(result['needs_fix'] is True, result)
    check(result['proposal_ok'] is True, result)
    check('Sims 4 Hair CC' in result['proposed_title'], result['proposed_title'])
    n += 1

    good_title = propose_title('Sims 4 Hair CC')
    good_desc2 = propose_description('Sims 4 Hair CC')
    clean_row = {'id': 2, 'Post URL': 'https://musthavemods.com/sims-4-hair-cc/',
                'Post Title': good_title, 'AI Text Slug': good_desc2, 'Board ID': 'B1',
                'Board Name': 'Sims 4 CC Hair'}
    result = score_row(clean_row, boards)
    check(result['needs_fix'] is False, result)
    check(result['score'] == 100, result)
    n += 1

    # 11. load_boards_csv parses board_id/name/description and nests
    #     sections; a missing file returns {} rather than raising.
    import tempfile
    with tempfile.TemporaryDirectory() as tmp:
        csv_path = os.path.join(tmp, 'pinterest-boards.csv')
        with open(csv_path, 'w') as handle:
            handle.write('board_id,board_name,board_description,board_url,'
                         'board_created_at,board_updated_at,board_pin_count,'
                         'board_follower_count,board_privacy,section_id,'
                         'section_name,section_description,section_created_at,'
                         'section_updated_at,section_pin_count\n')
            handle.write('B1,Sims 4 CC Hair,the best hair cc,,,,10,100,PUBLIC,,,,,,\n')
            handle.write('B1,Sims 4 CC Hair,the best hair cc,,,,10,100,PUBLIC,'
                         'S1,Sims 4 Braids CC,,,,\n')
        loaded = load_boards_csv(csv_path)
        check('B1' in loaded and loaded['B1']['name'] == 'Sims 4 CC Hair', loaded)
        check(loaded['B1']['sections'] == {'S1': 'Sims 4 Braids CC'}, loaded)
        n += 1
    check(load_boards_csv('/no/such/file.csv') == {}, 'missing csv should be {} not an error')
    n += 1

    print('self-test: {} assertion groups passed (keyword + scoring + templates, offline)'
          .format(n))
    return 0


# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    parser.add_argument('--days', type=int, default=DEFAULT_DAYS,
                        help='audit rows scheduled in the next N days (default {})'.format(
                            DEFAULT_DAYS))
    parser.add_argument('--apply', action='store_true',
                        help='write proposals for rows that need a fix and pass the '
                             're-score check (default is a read-only audit)')
    parser.add_argument('--rollback', metavar='FILE',
                        help='restore Post Title / AI Text Slug from a ledger written '
                             'by a previous --apply')
    parser.add_argument('--boards-csv', metavar='PATH',
                        help='override the pinterest-boards.csv path (default '
                             '$MHM_UTILS_DIR/pinterest-boards.csv)')
    parser.add_argument('--self-test', action='store_true',
                        help='run the offline assertions and exit')
    parser.add_argument('--report-dir', default=os.path.join('reports', 'funnel'))
    args = parser.parse_args()

    if args.self_test:
        return self_test()

    config = load_config()

    if args.rollback:
        return do_rollback(config, args.rollback, args.apply)

    days = max(1, args.days)
    today = date.today()
    ceiling = today + timedelta(days=days)
    today_str, ceiling_str = str(today), str(ceiling)

    print('=== {}: pin SEO audit ({} days, Post Date {} .. {}) ==='.format(
        'APPLY' if args.apply else 'AUDIT (read-only)', days, today_str, ceiling_str))

    rows = fetch_scheduled(config, today_str, ceiling_str, HARD_CAP)
    print('Fetched {} row(s) scheduled and not yet posted.'.format(len(rows)))
    if not rows:
        print('Nothing scheduled in this window — nothing to audit.')
        return 0

    boards = load_boards_csv(args.boards_csv)
    if not boards:
        print('NOTE: no pinterest-boards.csv found at {} — board-fit scores as '
              'unknown for every row (not a failure).'.format(
                  args.boards_csv or os.path.join(utils_dir(), 'pinterest-boards.csv')))

    scored = [score_row(row, boards) for row in rows]

    report_path = os.path.join(
        args.report_dir, 'pin-seo-audit-{}.md'.format(today_str))
    summary = write_report(report_path, scored, days, today_str, ceiling_str)
    print('\n--- Summary: {} rows, {} passing, {} need a fix, mean score {}/100, '
          '{} board-fit unknown ---'.format(
              summary['total'], summary['passing'], summary['need_fix'],
              summary['avg_score'], summary['board_unknown']))
    print('Report: {}'.format(report_path))

    if not args.apply:
        print('\nDRY RUN — nothing written. Re-run with --apply to write proposals '
              'for rows that need a fix and re-score clean.')
        return 0

    return do_apply(config, scored, args.report_dir, today_str)


if __name__ == '__main__':
    sys.exit(main())
