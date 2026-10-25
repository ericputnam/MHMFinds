import { describe, expect, it } from 'vitest';

import {
  buildCurves,
  extractPaths,
  parseRssItems,
  rankReshare,
  renderReport,
  splitFreshEvergreen,
  summarize,
  type DailyRow,
} from '../../scripts/agents/tumblr-curve-lib';

const RSS = `<?xml version="1.0"?><rss><channel><title>t</title>
<item><title>Scars post</title><link>https://musthavemods.tumblr.com/post/1</link>
<description>&lt;p&gt;see &lt;a href="https://blog.musthavemods.com/sims-4-scars-cc?utm=x"&gt;here&lt;/a&gt;&lt;/p&gt;</description>
<pubDate>Mon, 12 Oct 2026 09:08:41 -0400</pubDate></item>
<item><title>Lookbook</title><link>https://musthavemods.tumblr.com/post/2</link>
<description>&lt;a href="https://musthavemods.com/mods/abc123/"&gt;x&lt;/a&gt; and &lt;a href="https://www.musthavemods.com/mods/abc123"&gt;dup&lt;/a&gt;</description>
<pubDate>Wed, 14 Oct 2026 20:30:00 -0400</pubDate></item>
<item><title>No date</title><link>x</link><description>none</description></item>
</channel></rss>`;

describe('parseRssItems / extractPaths', () => {
  it('parses items, decodes entities, normalizes and de-dupes paths, skips undated items', () => {
    const items = parseRssItems(RSS);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ title: 'Scars post', date: '2026-10-12', paths: ['/sims-4-scars-cc/'] });
    expect(items[1].paths).toEqual(['/mods/abc123/']);
    // 20:30 -0400 is 00:30Z the next day; the curve's day 0 must be the local day the post went up.
    expect(items[1].date).toBe('2026-10-14');
  });
  it('ignores foreign hosts', () => {
    expect(extractPaths('https://evil.musthavemods.com.example/x https://musthavemods.com/a/')).toEqual(['/a/']);
  });
});

const rows: DailyRow[] = [
  { date: '2026-10-12', host: 'musthavemods.com', path: '/sims-4-scars-cc/', sessions: 5 },
  { date: '2026-10-12', host: 'blog.musthavemods.com', path: '/sims-4-scars-cc', sessions: 2 }, // folds in → 7 on d0
  { date: '2026-10-13', host: 'musthavemods.com', path: '/sims-4-scars-cc/', sessions: 3 },
  { date: '2026-10-20', host: 'musthavemods.com', path: '/sims-4-scars-cc/', sessions: 1 }, // d8, outside the curve
  { date: '2026-10-14', host: 'musthavemods.com', path: '/mods/abc123/', sessions: 4 },
  { date: '2026-10-01', host: 'musthavemods.com', path: '/evergreen-a/', sessions: 30 },
  { date: '2026-10-22', host: 'musthavemods.com', path: '/evergreen-a/', sessions: 40 },
  { date: '2026-10-05', host: 'musthavemods.com', path: '/best-woohoo-mods-sims-4-ultimate-guide/', sessions: 90 },
  { date: '2026-10-05', host: 'musthavemods.com', path: '(not set)', sessions: 500 },
  { date: '2026-10-05', host: 'musthavemods.com', path: '/', sessions: 25 },
];

describe('buildCurves', () => {
  it('counts day offsets from the post date, folds hosts, truncates at the last finalized day', () => {
    const curves = buildCurves(parseRssItems(RSS), rows, '2026-10-23');
    const scars = curves.find((c) => c.path === '/sims-4-scars-cc/')!;
    expect(scars.days).toEqual([7, 3, 0, 0, 0, 0, 0, 0]);
    expect(scars.total).toBe(10);
    const truncated = buildCurves(parseRssItems(RSS), rows, '2026-10-15').find((c) => c.path === '/mods/abc123/')!;
    expect(truncated.days).toEqual([4, 0]);
  });
});

describe('splitFreshEvergreen / summarize / rankReshare', () => {
  const items = parseRssItems(RSS);
  const split = splitFreshEvergreen(items, rows, '2026-09-26', '2026-10-23');
  it('flags posted paths as fresh and the rest as evergreen, drops (not set)', () => {
    expect(split.find((s) => s.path === '/sims-4-scars-cc/')).toMatchObject({ fresh: true, postedOn: '2026-10-12', total: 11 });
    expect(split.find((s) => s.path === '/evergreen-a/')).toMatchObject({ fresh: false, total: 70, first7: 30, last7: 40 });
    expect(split.some((s) => s.path.includes('not set'))).toBe(false);
  });
  it('summarizes the fresh share', () => {
    const s = summarize(split);
    expect(s.fresh).toBe(15);
    expect(s.evergreen).toBe(70 + 90 + 25);
    expect(s.freshShare).toBeCloseTo(15 / 200, 6);
  });
  it('ranks evergreen reshare candidates by sessions and never returns NSFW or the homepage', () => {
    const r = rankReshare(split, 10, 1);
    expect(r.map((s) => s.path)).toEqual(['/evergreen-a/']);
  });
  it('renders a report that names the share and the Tier 2 gate', () => {
    const md = renderReport({
      generatedOn: '2026-10-25',
      start: '2026-09-26',
      end: '2026-10-23',
      items,
      curves: buildCurves(items, rows, '2026-10-23'),
      split,
      summary: summarize(split),
      reshare: rankReshare(split, 10, 1),
      channel7d: 100,
      channelPrev7d: 80,
    });
    expect(md).toContain('7.5%');
    expect(md).toContain('+25.0%');
    expect(md).toContain('Tier 2');
    expect(md).toContain('`/evergreen-a/` | 70 | 30 | 40');
  });
});
