import { HOME_SHELL_LASTMOD } from '@/lib/seo/siteLastmod';

/**
 * Homepage-only JSON-LD: the homepage `WebPage` node and the site FAQ
 * (E189, 2026-10-12, Sage).
 *
 * Until E189 both nodes were emitted by `app/layout.tsx`, the root layout,
 * so they appeared on every Next.js page. Live on 10-12, `/games/sims-4/hair-cc/`,
 * `/mods/[id]`, `/creator/` and `/games/sims-4/` each carried a `WebPage` node
 * with `@id: https://musthavemods.com/#webpage` and `url: https://musthavemods.com`,
 * along with the homepage FAQ. That told parsers every one of those pages was
 * the homepage. On a collection page it also contradicted that page's own
 * `CollectionPage` node.
 *
 * The root layout now keeps only the nodes that really are site-wide
 * (`WebSite` and `Organization`). These two render only from `app/page.tsx`.
 * `__tests__/unit/site-jsonld-scope.test.ts` fails if any other file names
 * the `#webpage` or `#faq` node ids.
 */
export const SITE_ROOT = 'https://musthavemods.com';
export const HOME_WEBPAGE_ID = `${SITE_ROOT}/#webpage`;
export const HOME_FAQ_ID = `${SITE_ROOT}/#faq`;

export function homePageJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': HOME_WEBPAGE_ID,
        url: SITE_ROOT,
        name: 'MustHaveMods - Find Sims 4 CC, Mods & Custom Content',
        isPartOf: {
          '@id': `${SITE_ROOT}/#website`,
        },
        about: {
          '@id': `${SITE_ROOT}/#organization`,
        },
        primaryImageOfPage: {
          '@id': `${SITE_ROOT}/#logo`,
        },
        datePublished: '2024-01-01',
        // E150: the homepage shell's real change date, not the render day.
        dateModified: HOME_SHELL_LASTMOD,
        description:
          'Search 15,000+ verified mods and custom content for Sims 4, Stardew Valley, and Minecraft. Find CC by vibe, style, or keyword.',
        inLanguage: 'en-US',
        potentialAction: [
          {
            '@type': 'ReadAction',
            target: [SITE_ROOT],
          },
        ],
      },
      {
        '@type': 'FAQPage',
        '@id': HOME_FAQ_ID,
        mainEntity: [
          {
            '@type': 'Question',
            name: 'What is MustHaveMods?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'MustHaveMods is a search engine for game mods and custom content. It indexes over 15,000 verified mods for Sims 4, Stardew Valley, Minecraft, and other games.',
            },
          },
          {
            '@type': 'Question',
            name: 'How do I find Sims 4 CC?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Use the search bar to search by keyword, vibe, or style. You can filter by content type (hair, clothes, furniture), visual style (alpha, maxis-match), and more.',
            },
          },
          {
            '@type': 'Question',
            name: 'Are the mods verified and safe?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes, all mods indexed on MustHaveMods go through a verification process. We only index content from trusted sources and creators.',
            },
          },
        ],
      },
    ],
  };
}

export function HomeJsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(homePageJsonLd()) }}
    />
  );
}
