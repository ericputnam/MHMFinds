import { NextResponse } from 'next/server';

const WORDPRESS_ROBOTS_URL = 'https://blog.musthavemods.com/robots.txt';
const SITEMAP_DIRECTIVE = 'Sitemap: https://musthavemods.com/sitemap.xml';

// Directives served unconditionally. The WordPress robots.txt has 404'd in
// production (BigScoots misroute) and the old implementation fell back to a
// bare "Allow: /", silently dropping every rule below — the app's own rules
// must never depend on the WP fetch succeeding.
const BASE_RULES = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /*?creator=
Disallow: /*?cat=
Disallow: /*?p=
Disallow: /*?page_id=`;

// Explicit allow rules for AI answer-engine crawlers.
// Without these, crawlers that default to "ask first" may skip the site.
// Refs: OpenAI GPTBot, Anthropic ClaudeBot, Perplexity, Google AI crawlers.
const AI_CRAWLER_RULES = `User-agent: GPTBot
Allow: /
Disallow: /api/
Disallow: /admin/

User-agent: ChatGPT-User
Allow: /
Disallow: /api/
Disallow: /admin/

User-agent: ClaudeBot
Allow: /
Disallow: /api/
Disallow: /admin/

User-agent: Claude-Web
Allow: /
Disallow: /api/
Disallow: /admin/

User-agent: PerplexityBot
Allow: /
Disallow: /api/
Disallow: /admin/

User-agent: cohere-ai
Allow: /
Disallow: /api/
Disallow: /admin/

User-agent: Applebot-Extended
Allow: /
Disallow: /api/
Disallow: /admin/

User-agent: Google-Extended
Allow: /
Disallow: /api/
Disallow: /admin/`;

const RESPONSE_HEADERS = {
  'Content-Type': 'text/plain',
  'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
};

/**
 * Rules from the WordPress robots.txt, rewritten to the apex domain, minus
 * lines the base rules already cover and Sitemap directives (ours is
 * appended last). Returns '' when the fetch fails or returns non-robots
 * content (e.g. an HTML error page).
 */
async function fetchWordPressRules(): Promise<string> {
  try {
    const response = await fetch(WORDPRESS_ROBOTS_URL, {
      next: { revalidate: 3600 },
    });
    if (!response.ok) return '';

    const text = await response.text();
    if (text.trimStart().startsWith('<')) return '';

    const baseLines = new Set(BASE_RULES.split('\n').map((l) => l.trim()));
    return text
      .replace(/https?:\/\/blog\.musthavemods\.com/g, 'https://musthavemods.com')
      .split('\n')
      .filter((line) => {
        const trimmed = line.trim();
        return !baseLines.has(trimmed) && !trimmed.toLowerCase().startsWith('sitemap:');
      })
      .join('\n')
      .trim();
  } catch (error) {
    console.error('Failed to fetch robots.txt from WordPress:', error);
    return '';
  }
}

export async function GET() {
  const wpRules = await fetchWordPressRules();

  const sections = [BASE_RULES, AI_CRAWLER_RULES];
  if (wpRules) {
    sections.push(`# Rules inherited from the WordPress blog\n${wpRules}`);
  }
  sections.push(SITEMAP_DIRECTIVE);

  return new NextResponse(sections.join('\n\n') + '\n', {
    status: 200,
    headers: RESPONSE_HEADERS,
  });
}
