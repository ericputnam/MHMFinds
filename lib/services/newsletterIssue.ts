/**
 * Newsletter issue template — site-styled, flat editorial (Cass, 2026-09-13)
 *
 * Turns the operator-approved v2 mock
 * (`reports/funnel/drafts/newsletter-issue-01-site-styled-2026-09-12.html`)
 * into a function `bulkMailer` can call per recipient.
 *
 * The operator's rules, encoded here and asserted by
 * `__tests__/unit/newsletter-issue.test.ts` so they cannot drift:
 *
 *  - "I HATE gradients or AI looking things." No `linear-gradient`, no
 *    `box-shadow` glow, no pill buttons (the single button is 4px radius),
 *    no emoji, no generic card grid.
 *  - Dark `#0B0F19` shell, Poppins, pink `#EC4899` only for the wordmark,
 *    section labels, numbers and links; everything else white / `#9aa3b5`
 *    on dark with `#232a3d` hairlines.
 *  - Table layout with inline styles and `role="presentation"`, alt text on
 *    every image, images only from blog.musthavemods.com / musthavemods.com,
 *    WP `-768x512` for the lead and `-300x200` / `-150x150` for thumbnails
 *    so the whole issue stays well under Gmail's 102 KB clip.
 *  - No hidden preheader. The white-on-white / dark-on-dark preview-text
 *    trick is SpamAssassin `FONT_INVIS_MSGID` (+2.5) — it cost the 09-08 run
 *    2.5 points and is the reason the first line of the intro is the preview.
 *  - The unsubscribe link and the CAN-SPAM postal address come from the
 *    caller (`bulkMailer` verifies both before a real send). The address is
 *    never hardcoded here; when it is empty the line is omitted, never faked.
 *
 * Pure: no network, no DB, no env reads. Data-driven from `IssueData`, which a
 * future step can build from WP REST `_embed` + `favorite.groupBy`.
 */

export const ALLOWED_IMAGE_HOSTS = ['blog.musthavemods.com', 'musthavemods.com'] as const;

export interface IssuePost {
  title: string;
  url: string;
  /** One line under the title. */
  blurb: string;
  /** Absolute image URL on an allowed host. Lead uses -768x512, others -300x200. */
  image: string;
  alt: string;
}

export interface IssueMod {
  name: string;
  url: string;
  image: string;
  category: string;
  saves: number;
}

export interface IssueAsk {
  title: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
}

export interface IssueData {
  number: number;
  /** e.g. "September 12, 2026" — rendered verbatim, no locale formatting. */
  dateLabel: string;
  subject: string;
  intro: string;
  /** First entry is the lead story; the rest render as the numbered list. */
  posts: IssuePost[];
  collection: { label: string; title: string; url: string; blurb: string; ctaLabel: string };
  saved: IssueMod[];
  /** Catalog size for the "Browse and filter all N" line. */
  catalogCount: number;
  asks: [IssueAsk, IssueAsk];
  signoff: string;
}

export interface RenderContext {
  /** Per-recipient, HMAC-signed. Required — bulkMailer refuses a body without it. */
  unsubscribeUrl: string;
  /** From EMAIL_POSTAL_ADDRESS via resolvePostalAddress(). Empty → line omitted. */
  postalAddress: string;
  site?: string;
}

export interface RenderedIssue {
  subject: string;
  html: string;
  text: string;
}

const SITE_DEFAULT = 'https://musthavemods.com';
const FONT = "font-family:Poppins,'Helvetica Neue',Helvetica,Arial,sans-serif;";
const BG = '#0B0F19';
const PINK = '#EC4899';
const MUTED = '#9aa3b5';
const RULE = '#232a3d';

export function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Digits with US thousands separators, locale-independent. */
export function formatCount(n: number): string {
  return Math.trunc(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function isAllowedImageUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && (ALLOWED_IMAGE_HOSTS as readonly string[]).includes(u.hostname);
  } catch {
    return false;
  }
}

function assertImage(url: string, what: string): void {
  if (!isAllowedImageUrl(url)) {
    throw new Error(
      `renderIssue: ${what} image must be an https URL on ${ALLOWED_IMAGE_HOSTS.join(' or ')}: ${url}`
    );
  }
}

function label(text: string): string {
  return `<div style="${FONT}font-size:12px;font-weight:700;color:${PINK};letter-spacing:.1em;text-transform:uppercase;">${escapeHtml(text)}</div>`;
}

function leadStory(p: IssuePost): string {
  assertImage(p.image, 'lead');
  return `<tr><td style="${FONT}padding:0 0 10px;font-size:12px;font-weight:700;color:${PINK};letter-spacing:.1em;text-transform:uppercase;">01 &nbsp;&middot;&nbsp; New this week</td></tr>
<tr><td><a href="${escapeHtml(p.url)}"><img src="${escapeHtml(p.image)}" width="600" alt="${escapeHtml(p.alt)}" style="display:block;width:100%;height:auto;border:0;"></a></td></tr>
<tr><td style="padding:16px 0 6px;">
<a href="${escapeHtml(p.url)}" style="${FONT}font-size:26px;font-weight:800;color:#ffffff;text-decoration:none;line-height:1.2;letter-spacing:-.01em;">${escapeHtml(p.title)}</a>
<div style="${FONT}font-size:14px;color:${MUTED};line-height:1.55;margin-top:8px;">${escapeHtml(p.blurb)}</div>
<a href="${escapeHtml(p.url)}" style="${FONT}font-size:14px;font-weight:600;color:${PINK};text-decoration:none;display:inline-block;margin-top:10px;">Read the list</a>
</td></tr>`;
}

function listRow(p: IssuePost, n: number): string {
  assertImage(p.image, `list item ${n}`);
  const num = String(n).padStart(2, '0');
  return `<tr>
<td width="36" valign="top" style="${FONT}padding:18px 0;font-size:13px;font-weight:700;color:${PINK};border-top:1px solid ${RULE};">${num}</td>
<td width="150" valign="top" style="padding:18px 16px 18px 0;border-top:1px solid ${RULE};"><a href="${escapeHtml(p.url)}"><img src="${escapeHtml(p.image)}" width="150" height="100" alt="${escapeHtml(p.alt)}" style="display:block;width:150px;height:100px;border:0;"></a></td>
<td valign="top" style="padding:16px 0 18px;border-top:1px solid ${RULE};">
<a href="${escapeHtml(p.url)}" style="${FONT}font-size:17px;font-weight:700;color:#ffffff;text-decoration:none;line-height:1.25;">${escapeHtml(p.title)}</a>
<div style="${FONT}font-size:13px;color:${MUTED};line-height:1.5;margin-top:5px;">${escapeHtml(p.blurb)}</div>
<a href="${escapeHtml(p.url)}" style="${FONT}font-size:13px;font-weight:600;color:${PINK};text-decoration:none;display:inline-block;margin-top:8px;">Read the list</a>
</td></tr>`;
}

function savedCell(m: IssueMod): string {
  assertImage(m.image, `saved mod "${m.name}"`);
  return `<td width="25%" valign="top" style="padding:0 6px;">
<a href="${escapeHtml(m.url)}"><img src="${escapeHtml(m.image)}" width="132" height="132" alt="${escapeHtml(m.name)}" style="display:block;width:100%;height:132px;border:0;"></a>
<div style="${FONT}font-size:11px;font-weight:600;color:${MUTED};margin-top:8px;">${escapeHtml(m.category)} &middot; ${formatCount(m.saves)} saves</div>
<a href="${escapeHtml(m.url)}" style="${FONT}font-size:13px;font-weight:700;color:#ffffff;text-decoration:none;line-height:1.3;display:block;margin-top:2px;">${escapeHtml(m.name)}</a>
</td>`;
}

function askCell(a: IssueAsk, side: 'left' | 'right'): string {
  const pad = side === 'left' ? '18px 16px 18px 0' : '18px 0 18px 16px';
  return `<td width="50%" valign="top" style="padding:${pad};border-top:1px solid ${RULE};">
<div style="${FONT}font-size:15px;font-weight:700;color:#ffffff;">${escapeHtml(a.title)}</div>
<div style="${FONT}font-size:13px;color:${MUTED};line-height:1.5;margin-top:4px;">${escapeHtml(a.body)}</div>
<a href="${escapeHtml(a.ctaUrl)}" style="${FONT}font-size:13px;font-weight:600;color:${PINK};text-decoration:none;display:inline-block;margin-top:8px;">${escapeHtml(a.ctaLabel)}</a>
</td>`;
}

export function renderIssueHtml(issue: IssueData, ctx: RenderContext): string {
  if (!ctx.unsubscribeUrl) throw new Error('renderIssue: unsubscribeUrl is required');
  if (issue.posts.length < 1) throw new Error('renderIssue: at least one post is required');
  if (issue.saved.length > 4) throw new Error('renderIssue: at most 4 most-saved mods fit the row');
  const site = ctx.site ?? SITE_DEFAULT;
  const [lead, ...rest] = issue.posts;
  const issueNo = String(issue.number).padStart(2, '0');
  const postal = ctx.postalAddress ? `${escapeHtml(ctx.postalAddress)}<br>\n` : '';
  // The unsubscribe URL is inserted raw, not HTML-escaped: bulkMailer verifies the
  // body with a raw `includes(unsubscribeUrl)`, and real links carry `&t=`. The
  // URL is built by lib/services/unsubscribe.ts from encoded params, never from
  // user input, so it contains nothing that needs escaping.

  const saved = issue.saved.length
    ? `<tr><td style="padding:30px 0 12px;border-top:1px solid ${RULE};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td style="${FONT}font-size:12px;font-weight:700;color:${PINK};letter-spacing:.1em;text-transform:uppercase;">Most-saved this week</td>
<td align="right" style="${FONT}font-size:12px;color:${MUTED};">by everyone on the site</td>
</tr></table></td></tr>
<tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${issue.saved.map(savedCell).join('')}</tr></table></td></tr>
<tr><td style="${FONT}padding:16px 0 0;font-size:13px;color:${MUTED};">Browse and filter all ${formatCount(issue.catalogCount)} at <a href="${escapeHtml(site)}/" style="color:#ffffff;font-weight:600;">musthavemods.com</a>.</td></tr>`
    : '';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>MustHaveMods Issue ${issueNo}</title></head>
<body style="margin:0;padding:0;background:${BG};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};"><tr><td align="center" style="padding:28px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

<tr><td style="padding:0 0 14px;border-bottom:2px solid #ffffff;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td style="${FONT}font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-.02em;">MustHave<span style="color:${PINK};">Mods</span></td>
<td align="right" style="${FONT}font-size:12px;font-weight:600;color:${MUTED};letter-spacing:.06em;text-transform:uppercase;">Issue ${issueNo} &nbsp;&middot;&nbsp; ${escapeHtml(issue.dateLabel)}</td>
</tr></table></td></tr>

<tr><td style="${FONT}padding:22px 0 26px;font-size:15px;color:#ffffff;line-height:1.6;">${escapeHtml(issue.intro)}</td></tr>

${leadStory(lead)}

<tr><td style="padding:14px 0 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rest.map((p, i) => listRow(p, i + 2)).join('')}</table></td></tr>

<tr><td style="padding:26px 0 0;border-top:2px solid #ffffff;">
${label(issue.collection.label)}
<a href="${escapeHtml(issue.collection.url)}" style="${FONT}font-size:22px;font-weight:800;color:#ffffff;text-decoration:none;line-height:1.2;display:block;margin-top:8px;">${escapeHtml(issue.collection.title)}</a>
<div style="${FONT}font-size:14px;color:${MUTED};line-height:1.55;margin-top:6px;">${escapeHtml(issue.collection.blurb)}</div>
<a href="${escapeHtml(issue.collection.url)}" style="${FONT}display:inline-block;margin-top:14px;background:${PINK};color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:11px 18px;border-radius:4px;">${escapeHtml(issue.collection.ctaLabel)}</a>
</td></tr>

${saved}

<tr><td style="padding:30px 0 0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${askCell(issue.asks[0], 'left')}${askCell(issue.asks[1], 'right')}</tr></table></td></tr>

<tr><td style="${FONT}padding:26px 0 0;border-top:2px solid #ffffff;font-size:12px;color:${MUTED};line-height:1.7;">
${escapeHtml(issue.signoff)}<br>
You're getting this because you signed up at musthavemods.com.<br>
${postal}<a href="${ctx.unsubscribeUrl}" style="color:${MUTED};">Unsubscribe</a> &nbsp;&middot;&nbsp; <a href="${escapeHtml(site)}/" style="color:${MUTED};">musthavemods.com</a>
</td></tr>
</table></td></tr></table></body></html>
`;
}

export function renderIssueText(issue: IssueData, ctx: RenderContext): string {
  const site = ctx.site ?? SITE_DEFAULT;
  const posts = issue.posts.map((p, i) => `${i + 1}. ${p.title}\n   ${p.url}`).join('\n\n');
  const saved = issue.saved.length
    ? `\n--\n\nMost-saved this week, by everyone on the site\n\n${issue.saved
        .map((m) => `  ${m.name} (${m.category}, ${formatCount(m.saves)} saves)\n  ${m.url}`)
        .join('\n')}\n\nBrowse and filter all ${formatCount(issue.catalogCount)}: ${site}/\n`
    : '';
  const asks = issue.asks.map((a) => `${a.title}. ${a.body}\n${a.ctaUrl}`).join('\n\n');
  return `MustHaveMods — Issue ${String(issue.number).padStart(2, '0')} — ${issue.dateLabel}

${issue.intro}

${posts}

--

${issue.collection.label}: ${issue.collection.title}
${issue.collection.blurb}
${issue.collection.url}
${saved}
--

${asks}

${issue.signoff}

--
You're getting this because you signed up at musthavemods.com.
${ctx.postalAddress ? `${ctx.postalAddress}\n` : ''}Unsubscribe: ${ctx.unsubscribeUrl}
`;
}

export function renderIssue(issue: IssueData, ctx: RenderContext): RenderedIssue {
  return {
    subject: issue.subject,
    html: renderIssueHtml(issue, ctx),
    text: renderIssueText(issue, ctx),
  };
}

const WP = 'https://blog.musthavemods.com/wp-content/uploads';

/**
 * Issue #1 — the six posts published the week of 2026-09-08 and the four
 * most-saved mods as read from the production DB on 2026-09-12 (favorite
 * counts and the 16,409 catalog size are from that read; refresh before a
 * send if the numbers are stale).
 */
export const ISSUE_01: IssueData = {
  number: 1,
  dateLabel: 'September 14, 2026',
  subject: 'Your first MustHaveMods roundup: 6 new CC lists',
  intro:
    'You signed up a while ago and heard nothing. That was us, not you. From here it is one email a week with the CC and mods worth your download slot, and nothing else. Here is everything we published this week.',
  posts: [
    {
      title: '31+ Sims 4 Goth Accessories',
      url: 'https://blog.musthavemods.com/sims-4-goth-accessories/',
      blurb: 'Jewelry, tattoos, spikes, stockings and more. The list that finishes the goth makeup and shoes lists from last month.',
      image: `${WP}/2026/09/Felister-Blog-Post-Images-2-2-768x512.jpg`,
      alt: '31+ Sims 4 Goth Accessories',
    },
    {
      title: '16+ Sims 4 Cardi B CC',
      url: 'https://blog.musthavemods.com/sims-4-cardi-b-cc/',
      blurb: 'Red-carpet gowns to streetwear. The ultimate Bardi makeover.',
      image: `${WP}/2026/09/Felister-Blog-Post-Images-2-1-300x200.jpg`,
      alt: '16+ Sims 4 Cardi B CC',
    },
    {
      title: '10 Sims 4 Social Media Mods',
      url: 'https://blog.musthavemods.com/sims-4-social-media-mods/',
      blurb: 'Influencer gameplay that goes further than the base game.',
      image: `${WP}/2026/09/Felister-Blog-Post-Images-2-300x200.jpg`,
      alt: '10 Sims 4 Social Media Mods',
    },
    {
      title: '25+ Sims 4 Nicki Minaj CC',
      url: 'https://blog.musthavemods.com/sims-4-nicki-minaj-cc/',
      blurb: 'Hair, skin overlay, a sim download, shoes, clothing.',
      image: `${WP}/2026/09/Felister-Blog-Post-Images-2-12-300x200.jpg`,
      alt: '25+ Sims 4 Nicki Minaj CC',
    },
    {
      title: '24+ Sims 4 Y2K Makeup CC',
      url: 'https://blog.musthavemods.com/sims-4-y2k-makeup-cc/',
      blurb: 'Shimmer, colour and bold details for the 2000s look.',
      image: `${WP}/2026/09/Felister-Blog-Post-Images-2-11-300x200.jpg`,
      alt: '24+ Sims 4 Y2K Makeup CC',
    },
    {
      title: '24+ Sims 4 Y2K Hairstyles',
      url: 'https://blog.musthavemods.com/sims-4-y2k-hairstyles/',
      blurb: 'Chunky highlights, tiny braids, dramatic side parts.',
      image: `${WP}/2026/09/Felister-Blog-Post-Images-2-10-300x200.jpg`,
      alt: '24+ Sims 4 Y2K Hairstyles',
    },
  ],
  collection: {
    label: 'If you only click one thing',
    title: 'The full Makeup CC collection',
    url: 'https://musthavemods.com/games/sims-4/makeup-cc/',
    blurb: '922 pieces across makeup, eyebrows, eyeliner, blush, lipstick and eyes, filterable by pack and creator.',
    ctaLabel: 'Open the collection',
  },
  saved: [
    {
      name: 'Sims 4 3D Eyelashes Ver 5',
      url: 'https://musthavemods.com/mods/cmim9obub00mzoxy7av4vowyr/',
      image: `${WP}/2021/11/sims-4-3d-eyelashes-ver-5-150x150.jpg`,
      category: 'Makeup',
      saves: 169,
    },
    {
      name: 'Neutral Skin Pack',
      url: 'https://musthavemods.com/mods/cmim9fbe50050oxqwan0aotpy/',
      image: `${WP}/2023/09/image-10-150x150.png`,
      category: 'Skin',
      saves: 148,
    },
    {
      name: 'Teen Space',
      url: 'https://musthavemods.com/mods/cmim8wi8s00pcoxy8ltjr279a/',
      image: 'https://musthavemods.com/wp-content/uploads/2024/11/image-50-150x150.jpeg',
      category: 'Furniture',
      saves: 146,
    },
    {
      name: 'Random Baddie Room',
      url: 'https://musthavemods.com/mods/cmijqfwh20006ox8olvoz17aj/',
      image: `${WP}/2025/04/662f8614-4c93-4d71-a0f7-db9dca7ea088-1-150x150.png`,
      category: 'Furniture',
      saves: 130,
    },
  ],
  catalogCount: 16409,
  asks: [
    {
      title: 'Save what you like',
      body: 'A free account keeps your finds in one place instead of 30 open tabs.',
      ctaLabel: 'Create a free account',
      ctaUrl: 'https://musthavemods.com/sign-in/',
    },
    {
      title: 'Skip the download countdown',
      body: 'Patrons at $3 or more connect Patreon on any download page and the 10-second wait disappears.',
      ctaLabel: 'Become a patron',
      ctaUrl: 'https://www.patreon.com/musthavemods',
    },
  ],
  signoff: "That's it. Next one lands in a week. — The MustHaveMods team",
};
