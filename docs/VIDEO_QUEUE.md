# Video Queue (phase 1)

Three short videos a week, made on the operator's Mac, reviewed in WordPress, posted after approval.

```
 Sunday 10:00 ET (launchd)                      blog.musthavemods.com (WP plugin "MHM Video Queue")
 run-video-queue.sh --weekly                     ┌──────────────────────────────────────────────┐
   ├─ video-queue.ts ideas  ◄──── REST ───────── │ Videos → Ideas    writer types theme + links │
   ├─ social-draft.ts / video-queue.ts draft     │                                              │
   ├─ claude -p writes on-screen copy + caption  │ Videos → Queue    player, captions, credits  │
   ├─ short-video-frames.ts renders video.mp4    │   Approve · Request changes · Reject         │
   ├─ video-queue.ts check                       │                                              │
   └─ video-queue.ts push  ──── REST (chunked) ─►│ files stored OUTSIDE the web root            │
 Daily 21:00 ET (launchd)                        └──────────────────────────────────────────────┘
 run-video-queue.sh --revisions   re-makes "changes requested" videos and re-uploads them
```

Phase 2 (not built yet) adds the poster: approved videos go out at their slot through the YouTube
and TikTok APIs once each platform's audit passes. Until then an approved video sits in the queue as
"Approved — ready to post" and gets posted by hand (docs/SHORT_VIDEO_RUNBOOK.md).

## Roles and accounts (WordPress)

| Role | Who | Can |
|---|---|---|
| `mhm_video_reviewer` ("Video Reviewer") | the writer | see Videos → Queue and Ideas, approve / request changes / reject, edit captions, add ideas. Nothing else in WP admin. |
| `mhm_video_bot` ("Video Bot") | the Mac jobs | the plugin's REST API only, through an **Application Password**. Can't log in to the dashboard. |
| administrator | the operator | everything; both capabilities are added on activation |

Capabilities: `mhm_review_videos` (reviewer UI), `mhm_manage_video_queue` (bot REST API).

The bot's Application Password lives only in the operator's `.env.local`:

```
MHM_WP_VIDEO_URL=https://blog.musthavemods.com
MHM_WP_VIDEO_USER=video-bot
MHM_WP_VIDEO_APP_PASSWORD=[YOUR_APP_PASSWORD_HERE]
```

No YouTube, TikTok or Meta tokens are ever stored in WordPress.

## Video statuses

```
uploading ──finalize──► pending_review ──Approve──► approved ──(phase 2 poster / manual)──► posted
     ▲                     │      ▲                    │
     │                     │      └──── Unapprove ─────┘
     │                     ├──Request changes (note)──► changes_requested ──bot re-render──► uploading
     │                     └──Reject──► rejected
```

Reviewers never see `uploading`. Only the bot moves `changes_requested → uploading → pending_review`
and `approved → posted`.

## REST API — namespace `mhm-video-queue/v1`

Every route requires `mhm_manage_video_queue` (HTTP Basic with the Application Password).
JSON in, JSON out. Errors are `{ "code", "message", "data": { "status" } }` (standard WP_Error).

### Ideas

`GET /ideas?status=new` → `{ "ideas": [Idea] }`

```jsonc
// Idea
{ "id": 12, "theme": "cozy fall kitchen cc", "links": ["https://musthavemods.com/mods/abc/"],
  "notes": "free stuff only", "status": "new", "used_in": null,
  "author": "Writer Name", "created_at": "2026-11-07T15:00:00Z" }
```

`POST /ideas/{id}` body `{ "status": "used" | "declined" | "new", "used_in": 34, "bot_note": "…" }` → `{ "idea": Idea }`

### Videos

`GET /videos?status=changes_requested,approved` → `{ "videos": [Video] }` (status optional; comma list)

`GET /videos/{id}` → `{ "video": Video }`

`POST /videos` body = VideoInput → `{ "video": Video }` (status `uploading`)

`POST /videos/{id}` body = partial VideoInput, plus optional `status` (bot transitions only:
`changes_requested → uploading`, `approved → posted`), `post_urls` → `{ "video": Video }`

`POST /videos/{id}/file?kind=video|cover&offset=N` raw body (`Content-Type: application/octet-stream`),
≤ 1 MiB per chunk. `offset` must equal the bytes already received for this upload; a chunk whose offset
is behind is treated as a retry and ignored. `offset=0` restarts the upload. → `{ "kind", "received" }`

`POST /videos/{id}/finalize` body `{ "video_sha256", "cover_sha256" }` → verifies both uploads,
replaces the stored files (the previous revision is kept as `*.r<N>`), bumps `revision`, sets
`pending_review` → `{ "video": Video }`

`POST /notify` body `{ "message": "…" }` → emails every Video Reviewer that videos are waiting
(the message is plain text from the bot, at most 500 characters). → `{ "sent": 1 }`, or `{ "sent": 0, "reason" }`
(nothing waiting, no reviewers, already sent in the last 6 hours, or `wp_mail` failed; a failed send doesn't
start the 6-hour lock). The site needs working outgoing mail (an SMTP plugin) for this to reach the writer.

```jsonc
// VideoInput (bot → WP)
{ "title": "black sims cc I keep in every save",     // internal title, plain text
  "hook": "black sims cc I keep in *every* save",     // as rendered
  "scenes": [{ "mod": "Lani Set", "creator": "TBZSimz", "text": "the whole fit, one download",
               "mod_url": "https://musthavemods.com/mods/…/" }],
  "target_url": "https://musthavemods.com/black-sims-4-cc/",
  "slot": "2026-11-09T21:00:00Z",                    // UTC; 4 pm ET
  "captions": { "youtube_title": "…", "youtube_description": "…", "tiktok": "…" },
  "credits": [{ "creator": "TBZSimz", "tiktok": "@tbzsimz", "youtube": "@tbzsimz" }],
  "idea_id": 12,                                     // or null
  "draft_ref": "2026-11-08/01-short-video-black-sims-4-cc.md",
  "duration_s": 17.6 }

// Video (WP → bot) = VideoInput plus
{ "id": 34, "status": "pending_review", "revision": 1,
  "change_note": "swap the grillz for something else", // last "Request changes" note
  "review_log": [{ "at": "…", "user": "Writer Name", "action": "changes_requested", "note": "…" }],
  "post_urls": { "youtube": null, "tiktok": null },
  "files": { "video": true, "cover": true }, "created_at": "…", "updated_at": "…" }
```

A reviewer's caption edits are saved on the video. On a re-upload the bot keeps them. It sends full
new `captions` only when making a new video, or when the revision note asked for caption changes
(`push --with-captions`). If a revision changed the credited mods, `push --replace` rebuilds just the
credits inside her captions (the YouTube "Credits:" block and the TikTok "Credits:" line) and leaves
the rest of her text alone (`mergeCredits`), so every mod in the video stays credited.

## Files

Stored outside the web root: `dirname(ABSPATH)/mhm-video-queue/<id>/video.mp4|cover.jpg`
(on prod `/home/nginx/domains/blog.musthavemods.com/mhm-video-queue/`). If that folder isn't writable,
the plugin falls back to `wp-content/uploads/mhm-video-queue-<random>/` with an `index.php` and a
deny `.htaccess`. The admin screen shows a warning in that case, because nginx ignores `.htaccess`.
Reviewers stream files through `admin-post.php?action=mhm_vq_file&id=N&kind=video` (login and
capability checked, HTTP Range supported for seeking). Nothing is in the media library, sitemap or
search.

## Mac side

| File | What it does |
|---|---|
| `scripts/agents/video-queue.ts` | CLI: `ideas`, `idea` (mark used/declined), `resolve`, `search`, `draft`, `check`, `push [--replace ID [--with-captions]]`, `revisions`, `notify`, `slots`, `posted --id N [--youtube URL] [--tiktok URL]` (record a manual post). Exit 0 ok, 1 failed check/error, 2 couldn't run (env, auth, WP unreachable) |
| `scripts/agents/video-queue-lib.ts` | pure helpers (slots, captions, link rules, checks); unit-tested |
| `scripts/agents/video-queue-prompt.md` | what headless Claude does on `--weekly` and `--revisions` |
| `scripts/agents/run-video-queue.sh` | launchd entry: clean worktree from origin/main, state dir, claude -p, log |
| `scripts/agents/com.mhmfinds.video-weekly.plist` / `com.mhmfinds.video-revisions.plist` | schedules |

State that must survive between runs (drafts, rendered assets) lives in
`~/.mhm-video-queue/state/reports/funnel/social/…` (`MHM_PROJECT_DIR`), not in a git checkout.

Slots: Monday, Wednesday and Friday at 16:00 America/New_York, the next three that are at least 20 hours
away and not already held by a non-rejected video.

Writer input is a suggestion, never an instruction. Links count only if they are musthavemods.com
pages or resolve to mods in our catalog. Everything else is ignored and noted back on the idea.

## Deploying the plugin

`scripts/staging/push-video-queue-plugin.sh [--dry-run | --yes]` lints the PHP, shows a diff against the
server copy, asks before uploading (unless `--yes`), backs up the server folder outside the web root,
then copies `staging/wordpress/plugins/mhm-video-queue/` to
`wp-content/plugins/mhm-video-queue/`. It never touches `functions.php`. Activate the plugin once in
WP admin, then create the two users (see "Roles and accounts").

## Local test site

`scripts/staging/video-queue-local/` runs a throwaway WordPress (docker, port 8089) with the plugin
bind-mounted. `setup.sh` creates an admin, a Video Reviewer and a Video Bot with an Application Password,
and writes them to `.local-test.env` (gitignored, chmod 600). Point the CLI at it by sourcing that file
before running `video-queue.ts`; real `.env.local` values are not overridden by dotenv.

## Checks that refuse an upload

`video-queue.ts push` runs `check` first. It refuses: duration outside 10–60 s, a frame that isn't
1080×1920, fewer than 4 or more than 8 mods, a scene with no text or no creator, a creator value that is a
host or scraper debris ("Simfileshare", "Updated File", "Title"…; `isPlaceholderCreator`), NSFW mods or
paths, opted-out creators, images that didn't load, a target that isn't musthavemods.com, and banned
phrasing (`voiceLint`). Mods with placeholder authors are also dropped at draft time.
