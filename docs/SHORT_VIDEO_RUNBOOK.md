# Short Video Runbook (YouTube Shorts + TikTok)

How a MustHaveMods short video gets made, where it goes, and how it gets posted.
Written 2026-11-03 after the first post went out on both channels.

## Where we post

| Channel | Account | Upload page | First post |
|---|---|---|---|
| YouTube Shorts | @musthavemods (channel `UCkRyeflUNjiEM8Ze9KBh5TA`) | studio.youtube.com → Create → Upload videos | https://youtube.com/shorts/UTnUEY294Ok (2026-11-02) |
| TikTok | @musthavemods_official | tiktok.com/tiktokstudio/upload | https://www.tiktok.com/@musthavemods_official/video/7703936004666756366 (2026-11-03) |

Not ours to post to: the old TikTok `@musthavemods` (2022, no videos, login not recovered) and
`@olividkq5xk` (created by accident during sign-in). Instagram Reels is not set up.

**Profile links (UTM-tagged so GA4 can tell channels apart):**
- YouTube channel Website link: `https://musthavemods.com/?utm_source=youtube&utm_medium=social&utm_campaign=channel`
- TikTok bio link: `https://musthavemods.com/?utm_source=tiktok&utm_medium=social&utm_campaign=bio` (needs a Business account; not set yet)
- TikTok bio: `mods + cc for sims, stardew, minecraft and more. every creator credited`

## Where the videos send people

Every video points at a **catalog collection page** (e.g. `/black-sims-4-cc/`), never the blog.
Collection pages carry the Mediavine sidebar and in-content ads plus the /go/ download interstitial,
so a click from a video earns like any other session.

- YouTube description link: `https://musthavemods.com/<collection>/?utm_source=youtube&utm_medium=social&utm_campaign=short-YYYY-MM-DD`
- TikTok caption: plain text `musthavemods.com/<collection>` (TikTok doesn't make caption links clickable)
- **Shorts description and comment links can't be clicked in the Shorts feed.** They only work on
  the watch page, mostly on desktop. The link most viewers can actually tap is the channel's Website link,
  so the end card shows the domain.

## Cadence

1 a day for the first two weeks (from 2026-11-02), then 5 a week. Post time 4 pm ET.
Mix in a Stardew or Minecraft video about once a week so the account matches its bio.

## How a video is made

**Since phase 1 of the video queue (docs/VIDEO_QUEUE.md) this runs by itself:** every Sunday at 10:00
the weekly job makes three videos (the writer's ideas first, then top pages), renders and checks them,
and uploads them to the WordPress queue for the Mon/Wed/Fri 4 pm ET slots. The writer reviews them in
WP admin → Videos → Queue. Every night at 21:00 a revisions job remakes the ones she sent back with
"Request changes". The manual steps below are what the job does, and still work by hand.

The code lives on `main` under `scripts/agents/` (PRs #447, #448).

1. **Draft:** `npx tsx scripts/agents/social-draft.ts --platforms short-video`
   writes `reports/funnel/social/drafts/YYYY-MM-DD/NN-short-video-<collection>.md`. It picks
   collection pages by recent non-Pinterest sessions. It excludes NSFW paths and rows, honours
   `reports/funnel/social/creator-optout.txt`, and lists 4–8 credited mods with images.
2. **Hand-write the on-screen copy in the draft** (the renderer never writes words):
   - `Hook: "black sims cc I keep in *every* save"`, where `*word*` turns that word pink
   - one `Text: "…"` line per mod, short and specific to what you can see in the image
   - a caption of 1–2 sentences that names one creator, plus at most 3 real community hashtags
     (`#sims4 #sims4cc #ts4cc`)
3. **Render:** `npx tsx scripts/agents/short-video-frames.ts --date YYYY-MM-DD [--file NN-short-video-x.md]`
   writes to `reports/funnel/social/assets/YYYY-MM-DD/<draft>/` (gitignored):
   - `video.mp4`: 1080×1920, 30 fps, about 17–20 s, with sound effects (what we post)
   - `video-silent.mp4`: for adding a trending sound in-app
   - `cover.jpg`, `slide-NN.png`: the cover frame and stills for photo mode or carousels
   Needs Playwright Chromium and `ffmpeg` on PATH. Without ffmpeg, only the stills are written.
4. **Watch it** before queueing it.

**Style rules (the operator's, non-negotiable):**
- Flat colours only: background `#0B0F19`, accent pink `#EC4899`, Inter 900. Never gradients.
- Nothing that looks or reads AI-made: no glossy renders, no "dive in", no "elevate", no emoji strings,
  no rhetorical openers.
- Every mod is credited by creator name, on screen and in the caption or description.

## Tagging creators

A tag notifies the creator, and a repost from them reaches their audience, which is the fastest
way for a new account to get its first views. A wrong tag notifies a stranger and looks like spam,
so **only tag a handle you've confirmed**. Confirmed means the creator links the account from a page
they control: their Linktree, flow.page, Patreon "about" or Tumblr sidebar, or the account's bio links
back to one of those. If a handle only matches by name, don't tag it.

- **TikTok:** put `@handle` in the caption's Credits line, e.g. `Credits: @tbzsimz, @redheadsimscc, slaughtsims`.
  Use plain names for creators you haven't confirmed.
- **YouTube:** an `@handle` in the description links to their channel. Only use handles from the table.
- After posting, optionally send the creator a short, plain note ("put your Lani Set in a short, credited you")
  and nothing more. That's a message on the operator's behalf, so it needs their OK each time.
- Never tag a creator listed in `reports/funnel/social/creator-optout.txt`.

**Confirmed handles** (add a row each time you confirm one):

| Creator (as credited) | TikTok | YouTube | Confirmed from | Date |
|---|---|---|---|---|
| TBZSimz | @tbzsimz | @tbzsimz | flow.page/tbzsimz links both | 2026-11-03 |
| redheadsims | @redheadsimscc | @RedheadSimsCC | linktr.ee/redheadsims lists the YouTube; the TikTok bio links that Linktree | 2026-11-03 |

**Checked, not confirmed (don't tag):**

| Creator | What we found |
|---|---|
| slaughtsims | Downloads are on `slaughtasims.tumblr.com`, so our credit may be misspelled. No TikTok or YouTube under either spelling. |
| xxblacksims | TikTok `@xxblacksims` exists but has 0 videos and an empty bio. No YouTube. |
| NoNvme Sims | YouTube `@nonvme` ("No Nvme") exists, but nothing ties it to the creator. TikTok `@nonvme` is someone else. |
| EH Sims | TikTok `@ehsims` is a Roblox account. No YouTube. |

How to check a handle without a browser: `curl -A "<desktop UA>" https://www.tiktok.com/@<handle>`, then
look at `"statusCode"` (10221 means no such user), `"nickname"`, `"signature"` and `"bioLink"`. For YouTube,
`curl https://www.youtube.com/@<handle>` returns 404 if no such channel exists. Patreon pages render with JS and
the Chrome extension blocks patreon.com, so read creators' Linktree or flow.page pages instead.

## Approval

Short video is still Tier 2. Nothing goes public until it is approved. For videos in the WordPress
queue, the writer's **Approve** is that approval (the operator's decision, 2026-11-07). For anything made
outside the queue, the operator approves the batch ("approve social YYYY-MM-DD"). Agents draft, render and
upload to the queue; they never post on their own.

Until phase 2 (the API poster) exists, an approved video sits in the queue as "Approved — ready to post".
Post it with the steps below, using the captions shown on its queue card (they include her edits), then
record the post URLs: `npx tsx scripts/agents/video-queue.ts posted --id N --youtube <url> --tiktok <url>`.

## How to post: YouTube (Studio, in a browser)

1. Studio → Create → Upload videos and pick `video.mp4`. The operator picks the file: no browser tool
   can drive the native file dialog. Studio takes up to 15 files at once, so batch a week.
2. **Title:** the hook in plain text followed by `#shorts`, e.g. `black sims cc I keep in every save #shorts`.
3. **Description:**
   ```
   <caption sentence(s)>

   Full list + downloads: https://musthavemods.com/<collection>/?utm_source=youtube&utm_medium=social&utm_campaign=short-YYYY-MM-DD

   Credits:
   <Mod name> by <creator>
   ...

   #sims4 #sims4cc #ts4cc
   ```
4. Audience: **No, it's not made for kids.**
5. Video elements: nothing. Checks: wait for "No issues found".
6. Visibility: **Public** for now, or **Schedule** with a date and time for a batch.
7. Copy the `youtube.com/shorts/<id>` link from the "Video published" dialog.

Gotchas:
- In the built-in browser pane, cmd+A doesn't select inside the title box, so typing appends.
  Set the title with the form tool instead.
- The Visibility radios can sit off-screen in a narrow window.
  `tp-yt-paper-radio-button[name="PUBLIC"]` can be clicked from page JS.

## How to post: TikTok (TikTok Studio, in Chrome)

The built-in browser pane couldn't keep a TikTok login. Use Chrome (Claude in Chrome).

1. tiktok.com/tiktokstudio/upload → **Select video** → `video.mp4` (the operator picks the file).
   Studio never reaches document-idle, so Chrome's file-upload tool, `find` and `read_page` all
   time out there. Page JS (`javascript_tool`) still works.
2. **Caption:** paste it, don't type it. The caption box is a Draft.js editor. `execCommand('insertText')`
   drops line breaks and duplicates hashtags, and a select-all/delete loop crashed the page
   ("Something went wrong"; its Retry button recovered it with the upload intact). What works: select
   the editor contents with a Range, then dispatch a `paste` ClipboardEvent whose DataTransfer holds the
   full caption with `\n` line breaks. Press Escape afterwards to close the hashtag suggestion list.
   ```
   <caption sentence(s)>

   Full list + downloads: musthavemods.com/<collection>

   Credits: <creator>, <creator>, ...

   #sims4 #sims4cc #ts4cc
   ```
   Once the bio link exists, "Full list + downloads in bio" also works.
3. When to post: **Now**, or **Schedule** (up to 10 days ahead). Who can see: **Everyone**.
4. **Post**. If it asks "Continue to post?" while the content check is still running, choose **Post now**.
   A new account's post shows "Content under review" for a while. That's normal.
5. Get the link from Studio → Posts (`/@musthavemods_official/video/<id>`).

## Security posture (TikTok)

- Post from the website only. No TikTok app on the operator's main phone.
- Email login on a business-only address, no Google, Apple or Facebook sign-in,
  authenticator-app 2FA, no DMs with anything private.
- Claude never types passwords or 2FA codes. The operator signs in, and Claude works in that session.

## After posting

- Mark the draft's frontmatter `status: POSTED` with the post URLs.
- Add a row to `reports/funnel/changelog.md` (date, channel, URL, collection page).
- Read results in GA4 by `utm_campaign=short-YYYY-MM-DD` (YouTube) and the TikTok referrer, and in
  Studio analytics on each platform.
