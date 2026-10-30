import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { NewsletterSignup } from '../NewsletterSignup';
import { GAMES } from './games';
import { BrandMark } from './BrandMark';

const COLUMNS: { title: string; links: { href: string; label: string; next?: boolean }[] }[] = [
  {
    title: 'Game mods',
    links: [
      { href: '/games/sims-4/', label: 'Sims 4 Mods', next: true },
      { href: '/must-have-mods-sims-4/', label: 'Must-Have Sims 4 Mods' },
      { href: '/games/stardew-valley/', label: 'Stardew Valley Mods', next: true },
      { href: '/games/minecraft/', label: 'Minecraft Mods', next: true },
    ],
  },
  {
    title: 'Blog',
    links: [
      { href: '/blog/', label: 'All Posts' },
      { href: '/sims-4/', label: 'Sims 4' },
      { href: '/stardew-valley/', label: 'Stardew Valley' },
      { href: '/minecraft/', label: 'Minecraft' },
      { href: '/submit-mod/', label: 'Submit a Mod', next: true },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/about/', label: 'About', next: true },
      { href: '/terms/', label: 'Terms of Service', next: true },
      { href: '/privacy-policy/', label: 'Privacy Policy', next: true },
      { href: 'mailto:olivia@musthavemods.com', label: 'Contact' },
    ],
  },
];

/**
 * Homepage-only footer in the launcher look. Same links, newsletter source
 * ("footer") and disclaimer as components/Footer.tsx, which every other page
 * still uses. Below all ad anchors; normal flow.
 */
export function LauncherFooter() {
  return (
    <footer className="lx-foot">
      <div className="wrap">
        <div className="lf-top">
          <div className="lf-brand">
            <a href="/" className="brand" aria-label="MustHaveMods home">
              <BrandMark />
            </a>
            <p className="lf-tag">The search engine for game mods and custom content.</p>
            <div className="lf-games">
              {GAMES.filter((g) => g.icon).map((g) => (
                <Link key={g.id} href={`/games/${g.slug}/`} className="lf-game" aria-label={`${g.name} mods`}>
                  <Image src={g.icon!} alt="" width={28} height={28} />
                </Link>
              ))}
            </div>
          </div>
          {COLUMNS.map((c) => (
            <nav key={c.title} className="lf-col" aria-label={c.title}>
              <h3>{c.title}</h3>
              <ul>
                {c.links.map((l) => (
                  <li key={l.href}>
                    {l.next ? <Link href={l.href}>{l.label}</Link> : <a href={l.href}>{l.label}</a>}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="lf-news">
          <div>
            <h3>Never miss a mod drop</h3>
            <p>The best Sims 4 CC and mod finds, straight to your inbox.</p>
          </div>
          <NewsletterSignup source="footer" variant="strip" />
        </div>

        <div className="lf-legal">
          <p>
            This site is not endorsed by or affiliated with Electronic Arts, ConcernedApe, Mojang Studios, or their
            licensors. Trademarks are the property of their respective owners. Game content and materials are copyright
            their respective publishers.
          </p>
          <p>&copy; {new Date().getFullYear()} MustHaveMods. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
