/**
 * Creator badge page — /creator/[slug]/badge/  (Nova, E269, 2026-10-25)
 *
 * "Featured on MustHaveMods": the embed a creator pastes on their own
 * Patreon / Tumblr / CurseForge / site. Each badge links back to the
 * creator's hosted page tagged `utm_source=creator-badge`, so the sessions
 * it sends are the AUDIENCE read (GA4 sessionSource = creator-badge, 0 on
 * 2026-09-25 → 10-23). The same link back is the ownership proof the growth
 * plan asks for before a claim is promoted (lib/creatorBadge.ts).
 *
 * Nested under /creator/ on purpose: no new top-level app/ directory, so no
 * NEXTJS_PREFIXES / OTHER_APP_PREFIXES entry is needed and the WordPress
 * catch-all never sees it. Utility page: noindex, no ad sidebar (it is not
 * in PAGES_WITH_SIDEBAR and must not declare id="secondary").
 *
 * Nothing here is an agreement. No terms, no money, no "by using this you
 * accept". A plain instruction to paste a picture that links back.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { Navbar } from '../../../../components/Navbar';
import { Footer } from '../../../../components/Footer';
import { CreatorBadgeEmbed } from '../../../../components/creator/CreatorBadgeEmbed';
import { getCreatorPageData } from '../../../../lib/creators';
import { creatorHref } from '../../../../lib/creatorSlug';
import { claimHref } from '../../../../lib/creatorClaim';
import { badgeHref } from '../../../../lib/creatorBadge';

// Same reason as the creator page: ~540 slugs that change with every ingest.
export const dynamic = 'force-dynamic';

interface BadgePageProps {
  params: Promise<{ slug: string }>;
}

const SITE = 'https://musthavemods.com';

export async function generateMetadata({ params }: BadgePageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getCreatorPageData(slug);
  if (!data) return { title: 'Creator not found | MustHaveMods', robots: { index: false } };
  return {
    title: `Featured on MustHaveMods badge for ${data.displayName} | MustHaveMods`,
    description: `Put the "Featured on MustHaveMods" badge on your page. It links back to ${data.displayName}'s mods on MustHaveMods.`,
    alternates: { canonical: `${SITE}${badgeHref(slug)}` },
    // Utility page for one person (the creator). Never in the index.
    robots: { index: false, follow: true },
  };
}

export default async function CreatorBadgePage({ params }: BadgePageProps) {
  const { slug } = await params;
  const data = await getCreatorPageData(slug);
  if (!data) notFound();

  const verified = Boolean(data.profile?.isVerified);

  return (
    <div className="min-h-screen bg-mhm-dark text-slate-200 flex flex-col font-sans selection:bg-sims-pink/30 selection:text-white">
      <Navbar />

      <main className="flex-grow">
        <div className="container mx-auto px-4 pt-6">
          <nav className="flex items-center gap-2 text-sm text-slate-400" aria-label="Breadcrumb">
            <Link href="/" className="flex items-center gap-1 hover:text-sims-pink transition-colors">
              <Home size={14} />
              <span>Home</span>
            </Link>
            <ChevronRight size={14} className="text-slate-600" />
            <Link href="/creator/" className="hover:text-sims-pink transition-colors">
              Creators
            </Link>
            <ChevronRight size={14} className="text-slate-600" />
            <Link href={creatorHref(data.slug)} className="hover:text-sims-pink transition-colors truncate">
              {data.displayName}
            </Link>
            <ChevronRight size={14} className="text-slate-600" />
            <span className="text-white font-medium">Badge</span>
          </nav>
        </div>

        <header className="container mx-auto px-4 pt-6 pb-8">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-sims-pink mb-2">
              Creator badge
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">
              Featured on MustHaveMods
            </h1>
            <p className="text-lg text-slate-400 mb-2">
              {data.displayName} has {data.totalMods.toLocaleString()} Sims 4{' '}
              {data.totalMods === 1 ? 'mod' : 'mods'} listed here, with{' '}
              {data.totalDownloads.toLocaleString()} downloads so far.
            </p>
            <p className="text-slate-300 leading-relaxed">
              Put the badge on your Patreon, Tumblr, CurseForge page or site. It links to{' '}
              <Link href={creatorHref(data.slug)} className="text-sims-pink hover:underline">
                your page on MustHaveMods
              </Link>
              , so people who find your CC here can find you there, and the other way round.
            </p>
          </div>
        </header>

        <div className="container mx-auto px-4 pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <section className="lg:col-span-2 min-w-0" aria-labelledby="badge-embed-heading">
              <h2 id="badge-embed-heading" className="text-xl font-bold text-white mb-4">
                Copy the badge
              </h2>
              <CreatorBadgeEmbed slug={data.slug} displayName={data.displayName} />
            </section>

            <aside className="min-w-0" aria-labelledby="badge-how-heading">
              <h2 id="badge-how-heading" className="text-xl font-bold text-white mb-4">
                How this works
              </h2>
              <ol className="space-y-4 text-sm text-slate-300 list-decimal list-inside">
                <li>
                  <span className="text-white font-medium">Paste it</span> where your fans already are.
                  Dark or light, whichever fits your page.
                </li>
                <li>
                  <span className="text-white font-medium">
                    {verified ? 'Your page is verified.' : 'Claim your page.'}
                  </span>{' '}
                  {verified ? (
                    <>
                      Your bio and links show on{' '}
                      <Link href={creatorHref(data.slug)} className="text-sims-pink hover:underline">
                        your creator page
                      </Link>
                      ; the badge sends readers straight there.
                    </>
                  ) : (
                    <>
                      <a
                        href={claimHref(data.slug)}
                        className="text-sims-pink font-semibold hover:underline"
                        data-testid="creator-badge-claim-link"
                      >
                        Claim this page →
                      </a>{' '}
                      Seeing the badge on your own page is how we confirm it is you. Once confirmed,
                      your page shows the verified mark with your own bio and links.
                    </>
                  )}
                </li>
                <li>
                  <span className="text-white font-medium">Submit new mods</span> from your creator
                  dashboard whenever you release something; they show up on your page.
                </li>
              </ol>
              <p className="mt-6 text-xs text-slate-500">
                The badge is a picture and a link. You can take it down any time; nothing changes on
                your listing when you do.
              </p>
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
