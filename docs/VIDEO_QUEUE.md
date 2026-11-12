# Video Queue

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

Once a slot time has passed, WordPress posts approved videos to YouTube (as a Short) and TikTok
(see "Posting"). Nothing is posted until an administrator connects an account under Videos → Posting.
On a platform that isn't connected, an approved video waits as "Approved — ready to post" and can be
posted by hand (docs/SHORT_VIDEO_RUNBOOK.md, then `video-queue.ts posted`).

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

YouTube and TikTok tokens are stored in WordPress, sealed (libsodium secretbox, key derived from the
site's `SECURE_AUTH` salt, or from `MHM_VQ_KEY` if wp-config.php defines it) in options that don't autoload. The OAuth client secrets are
sealed the same way. Neither is ever written into a page, a REST response or a log, and neither ever
reaches the Mac. Changing the WordPress salts makes them unreadable, so both platforms then need
Connect again. No Meta tokens are stored.

## Video statuses

```
uploading ──finalize──► pending_review ──Approve──► approved ──(poster / manual)──► posted
     ▲                     │      ▲                    │
     │                     │      └──── Unapprove ─────┘
     │                     ├──Request changes (note)──► changes_requested ──bot re-render──► uploading
     │                     └──Reject──► rejected
```

Reviewers never see `uploading`. Only the bot and the poster move `changes_requested → uploading →
pending_review` and `approved → posted`. If the stored video file no longer matches the hash it was
approved with, the poster sends the video back to `pending_review` and emails the alert address.

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

`POST /post-due` (no body) → runs the poster now, same as WP-cron → `{ "summary": "1 posted, 1 processing." }`
(or `"Nothing due."`, `"another run is in progress"`, `"no platform switched on"`).

`GET /oauth/youtube` and `GET /oauth/tiktok` are the OAuth redirect URIs. They are public because the
platform redirects the browser there. They only accept a `state` that this site issued in the last 10
minutes and the same browser's cookie, and the user who clicked Connect must still be an administrator.

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

## Posting (phase 2)

Settings live under Videos → Posting (administrators only). Each platform has its own switch. A platform is
used only when it is switched on and connected. Switching it off stops new posts straight away.

**When.** WP-cron runs the poster every 5 minutes. WP-cron fires only when someone visits the blog, so the
Mac also calls `POST /post-due` every 15 minutes (`video-post-due.sh`). A lock (option `mhm_vq_post_lock`,
released after 15 minutes if a run dies) keeps the two from overlapping. Each run starts at most 3 new
uploads and posts the earliest slots first.

**State per video and platform** (meta `_mhm_post_state`, shown on the Queue card):

```
queued → posting → posted                              YouTube
queued → posting → processing → inbox | posted         TikTok
      ↘ retry (once, network-type errors) ↘ failed      either one
```

- `posting` is written before the first network call. A `posting` older than 30 minutes means the run died
  mid-upload. It becomes `failed` and is marked *uncertain*, because the platform may already have the
  video. Uncertain failures are never retried automatically. Someone checks the channel, then clicks
  Retry on the Queue card. Unapprove + Approve doesn't reset them either.
- A platform that reached `posted` or `inbox` is never posted again for that video, even after editing
  captions or unapproving and approving again.
- TikTok `processing` is checked on each run. After 2 hours it becomes `failed` (uncertain).
- When every switched-on platform is `posted` or `inbox`, the video becomes `posted` and the links go in
  `post_urls`. If only some have finished, the card says "Approved — partly posted". If one failed, it says
  "Approved — needs attention".
- A due video on a platform that is switched on but not connected waits, and the alert address gets one
  email per platform per day.

**Emails** (Alert email setting, default the site admin): a failure, an uncertain upload, a changed file,
a platform not connected, and each TikTok inbox draft (with the caption to paste). They need working
outgoing mail (an SMTP plugin) on the blog.

**YouTube.** Uploaded with the Data API v3 resumable upload, in 8 MiB chunks, category Gaming, not made for
kids. Vertical and under 60 seconds, so YouTube lists it as a Short. Visibility comes from the setting
(start with Private). Until the Google Cloud project passes YouTube's API audit, YouTube makes every
upload private whatever the setting. The Queue card says so when that happens.

**TikTok.** Two modes:

- *Draft in the TikTok app* (default; scope `video.upload`). The video goes to the account's TikTok inbox and
  someone finishes the post in the app. Works before TikTok's audit. Counts as done once it's in the inbox.
- *Post directly* (adds `video.publish`; needs Connect again). When approving, the reviewer picks who can see
  it and whether to allow comments, duets and stitches, and declares promotional or branded content, as
  TikTok's Content Sharing Guidelines require. Options the creator account has turned off are greyed out.
  Branded content can't be "Only me". Until the app passes TikTok's Direct Post audit, TikTok only accepts
  private ("Only me") posts.

### Setting up the accounts (once)

1. **YouTube.** In Google Cloud, create a project. Enable *YouTube Data API v3*. Set up the OAuth consent
   screen (External; add the channel owner as a test user while the app is in Testing). Create an OAuth
   client of type *Web application* and add the Redirect URI shown on the Posting page. Paste the client
   ID and secret into the Posting page and save. Click Connect and sign in as the channel's Google account.
   To post publicly, apply for the YouTube API audit (Google's "YouTube API Services – Audit and Quota
   Extension" form).
2. **TikTok.** At developers.tiktok.com, create an app. Add *Login Kit* (Redirect URI from the Posting page)
   and *Content Posting API*, with scopes `user.info.basic` and `video.upload`, plus `video.publish` for direct
   posting. Paste the client key and secret, save, then Connect as the MustHaveMods TikTok account. For
   public direct posts, submit the app for TikTok's audit.
3. Test privately first. Use YouTube visibility Private and TikTok draft mode. Approve one video with a slot
   in the past, run `video-queue.ts post-due`, and check the channel and the TikTok inbox.
4. **Test** on the Posting page refreshes the token and reads the account name. **Disconnect** revokes the
   token at the platform and deletes it from WordPress.

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
| `scripts/agents/video-queue.ts` | CLI: `ideas`, `idea` (mark used/declined), `resolve`, `search`, `draft`, `check`, `push [--replace ID [--with-captions]]`, `revisions`, `notify`, `slots`, `posted --id N [--youtube URL] [--tiktok URL]` (record a manual post), `post-due` (run the poster now). Exit 0 ok, 1 failed check/error, 2 couldn't run (env, auth, WP unreachable) |
| `scripts/agents/video-queue-lib.ts` | pure helpers (slots, captions, link rules, checks); unit-tested |
| `scripts/agents/video-queue-prompt.md` | what headless Claude does on `--weekly` and `--revisions` |
| `scripts/agents/run-video-queue.sh` | launchd entry: clean worktree from origin/main, state dir, claude -p, log |
| `scripts/agents/launch-video-queue.sh` | what launchd runs: fetches origin/main and runs its `run-video-queue.sh`, so the main checkout can be on any branch |
| `scripts/agents/com.mhmfinds.video-weekly.plist` / `com.mhmfinds.video-revisions.plist` | schedules |
| `scripts/agents/video-post-due.sh` + `com.mhmfinds.video-post-due.plist` | the 15-minute poster catch-up. It reads the bot credentials from `.env.local` and passes them to curl on stdin |

Installing the schedules (once; repeat the `cp` lines after the launcher or plists change):

```bash
mkdir -p ~/.mhm-video-queue/bin
cp scripts/agents/launch-video-queue.sh ~/.mhm-video-queue/bin/ && chmod +x ~/.mhm-video-queue/bin/launch-video-queue.sh
cp scripts/agents/video-post-due.sh ~/.mhm-video-queue/bin/ && chmod +x ~/.mhm-video-queue/bin/video-post-due.sh
cp scripts/agents/com.mhmfinds.video-{weekly,revisions,post-due}.plist ~/Library/LaunchAgents/
for j in weekly revisions post-due; do
  launchctl bootout gui/$(id -u)/com.mhmfinds.video-$j 2>/dev/null || true   # bootstrap fails if already loaded
  launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.mhmfinds.video-$j.plist
done
```

Stop one with `launchctl bootout gui/$(id -u)/com.mhmfinds.video-weekly` (or `…video-revisions`, `…video-post-due`).
Load `video-post-due` only once a platform is connected. Until then every run just says "no platform switched on".

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
(`MHM_ENV_FILE=…/.local-test.env scripts/agents/video-post-due.sh` does the same for the catch-up.)

`mock-apis.php` (mounted as a must-use plugin, local only) answers every Google and TikTok call with canned
responses, so connecting and posting can be tested without real accounts. It also captures outgoing mail.
Its failure switches (init 500, a dropped chunk, a TikTok FAILED, an expired refresh token…) are in the
file header.

## Checks that refuse an upload

`video-queue.ts push` runs `check` first. It refuses: duration outside 10–60 s, a frame that isn't
1080×1920, fewer than 4 or more than 8 mods, a scene with no text or no creator, a creator value that is a
host or scraper debris ("Simfileshare", "Updated File", "Title"…; `isPlaceholderCreator`), NSFW mods or
paths, opted-out creators, images that didn't load, a target that isn't musthavemods.com, and banned
phrasing (`voiceLint`). Mods with placeholder authors are also dropped at draft time.
