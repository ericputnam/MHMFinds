'use client';

import React from 'react';
import Image from 'next/image';
import { Mod } from '@/lib/api';
import { AffiliateOffer } from '@/components/AffiliateCard';
import { isAffiliatePlacementEnabled } from '@/lib/affiliatePlacements';
import { trackAndOpenAffiliateLink } from '@/lib/affiliateClick';
import { formatFacetLabel } from '@/lib/facetColors';
import { fmtCount } from './games';
import { Icon } from './Icon';
import { cleanCreator, displayTitle } from './display';

interface LauncherGridProps {
  mods: Mod[];
  loading: boolean;
  error: string | null;
  pageSize: number;
  /** Rank offset for the "#n" badge; null hides ranks (non-download sorts, search). */
  rankFrom: number | null;
  favorites: string[];
  onFavorite: (modId: string) => void;
  affiliateOffers?: AffiliateOffer[];
  affiliateInterval?: number;
  onRetry: () => void;
  onClear: () => void;
}

/**
 * The results grid. The container below is the page's in-content Mediavine
 * anchor, so it is rendered unconditionally — on the server, while loading
 * (skeleton cells), on error, and when empty — never behind an early return.
 * Its class string is static: no ref, nothing that can hide it.
 */
export function LauncherGrid({
  mods,
  loading,
  error,
  pageSize,
  rankFrom,
  favorites,
  onFavorite,
  affiliateOffers = [],
  affiliateInterval = 8,
  onRetry,
  onClear,
}: LauncherGridProps) {
  const gridPlacementEnabled = isAffiliatePlacementEnabled('grid');

  let cells: React.ReactNode[];
  if (loading && mods.length === 0) {
    cells = Array.from({ length: pageSize }, (_, i) => <SkeletonCard key={`sk-${i}`} />);
  } else if (error) {
    cells = [
      <div key="err" className="emptygrid" role="alert">
        <Icon name="alert" />
        <strong>Couldn&apos;t load mods</strong>
        <span className="eg-note">Something went wrong on our side. Give it another go.</span>
        <button type="button" onClick={onRetry}>Try again</button>
      </div>,
    ];
  } else if (mods.length === 0) {
    cells = [
      <div key="empty" className="emptygrid">
        <Icon name="box" />
        <strong>No mods match that</strong>
        <span className="eg-note">Try a broader search, another game, or clear the filters.</span>
        <button type="button" onClick={onClear}>Clear filters</button>
      </div>,
    ];
  } else {
    cells = [];
    let affiliateIndex = 0;
    mods.forEach((mod, index) => {
      cells.push(
        <ModCell
          key={mod.id}
          mod={mod}
          rank={rankFrom != null ? rankFrom + index : null}
          favorited={favorites.includes(mod.id)}
          onFavorite={onFavorite}
          dim={loading}
        />
      );
      if (
        gridPlacementEnabled &&
        affiliateOffers.length > 0 &&
        (index + 1) % affiliateInterval === 0 &&
        affiliateIndex < affiliateOffers.length
      ) {
        const offer = affiliateOffers[affiliateIndex++];
        cells.push(<SponsoredCell key={`affiliate-${offer.id}`} offer={offer} />);
      }
    });
  }

  return (
    <div className="lx-grid mv-ads" aria-busy={loading}>
      {cells}
    </div>
  );
}

function ModCell({
  mod,
  rank,
  favorited,
  onFavorite,
  dim,
}: {
  mod: Mod;
  rank: number | null;
  favorited: boolean;
  onFavorite: (id: string) => void;
  dim: boolean;
}) {
  const href = `/mods/${mod.id}/`;
  const author = cleanCreator(mod.creator?.handle || mod.author);
  const type = mod.contentType ? formatFacetLabel(mod.contentType) : mod.category;
  const title = displayTitle(mod.title, type);
  const price = mod.price ? parseFloat(mod.price) : 0;
  const isFree = mod.isFree || !price;
  const favCount = mod._count?.favorites ?? 0;

  return (
    <article className="card" style={dim ? { opacity: 0.55 } : undefined}>
      <a className="card-link" href={href}>
        <div className="card-frame">
          {mod.thumbnail ? (
            <Image
              src={mod.thumbnail}
              alt=""
              fill
              unoptimized
              sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 25vw"
            />
          ) : (
            <span className="card-noimg">No preview</span>
          )}
          {rank != null && <span className="card-rank tabular">#{rank}</span>}
          {type && <span className="card-type">{type}</span>}
        </div>
        <div className="card-body">
          <h3 className="card-title">{title}</h3>
          <div className="card-byline">{author ? <>by <span className="by-name">{author}</span></> : ' '}</div>
          <div className="card-stats">
            <span className="stat tabular" title="Downloads">
              <Icon name="download" />
              {fmtCount(mod.downloadCount || 0)}
            </span>
            {favCount > 0 && (
              <span className="stat tabular" title="Favorites">
                <Icon name="heart" />
                {fmtCount(favCount)}
              </span>
            )}
            {typeof mod.rating === 'number' && mod.rating > 0 && (
              <span className="stat tabular" title="Rating">
                <Icon name="star" />
                {mod.rating.toFixed(1)}
              </span>
            )}
            <span className={`tag ${isFree ? 'free' : 'paid'}`}>{isFree ? 'Free' : `$${price.toFixed(2)}`}</span>
          </div>
        </div>
      </a>
      <button
        type="button"
        className={`card-fav${favorited ? ' is-on' : ''}`}
        aria-pressed={favorited}
        aria-label={favorited ? `Remove ${title} from favorites` : `Save ${title} to favorites`}
        onClick={() => onFavorite(mod.id)}
      >
        <Icon name="heart" />
      </button>
    </article>
  );
}

function SponsoredCell({ offer }: { offer: AffiliateOffer }) {
  const open = () =>
    trackAndOpenAffiliateLink({
      offerId: offer.id,
      sourceType: 'grid',
      partner: offer.partner,
      fallbackUrl: offer.affiliateUrl,
    });

  return (
    <article className="card is-sponsored">
      <button type="button" className="card-link" onClick={open} aria-label={`Sponsored: ${offer.name} from ${offer.partner}`}>
        <div className="card-frame">
          <Image src={offer.imageUrl} alt="" fill unoptimized sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 25vw" />
          <span className="card-sponsor">Sponsored</span>
          {offer.promoText && <span className="card-type">{offer.promoText}</span>}
        </div>
        <div className="card-body">
          <h3 className="card-title">{offer.name}</h3>
          {offer.description && <p className="card-desc">{offer.description}</p>}
          <div className="card-stats">
            <span className="stat">{offer.partner}</span>
            <span className="tag deal">
              View deal <Icon name="arrow" />
            </span>
          </div>
        </div>
      </button>
    </article>
  );
}

function SkeletonCard() {
  return (
    <div className="card is-skel" aria-hidden="true">
      <div className="card-frame skel" style={{ borderRadius: 0 }} />
      <div className="card-body">
        <div className="skel skel-line" style={{ width: '85%', marginTop: 0 }} />
        <div className="skel skel-line" style={{ width: '55%' }} />
        <div className="skel skel-line" style={{ width: '40%', marginTop: 18 }} />
      </div>
    </div>
  );
}
