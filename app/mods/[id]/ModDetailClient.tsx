'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mod } from '@/lib/api';
import Link from 'next/link';
import {
  Download,
  Eye,
  Star,
  Heart,
  Crown,
  ExternalLink,
  ArrowLeft,
  Calendar,
  Package,
  Tag,
  TrendingUp,
  ChevronRight,
  Home
} from 'lucide-react';
import { AffiliateRecommendations } from '@/components/AffiliateRecommendations';
import { RelatedMods } from '@/components/RelatedMods';
import { ModContentSections } from '@/components/ModContentSections';
import { MoreFromCreator } from '@/components/MoreFromCreator';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ModDetailClientProps {
  initialMod: Mod;
}

function InContentAd() {
  // Mediavine injects an ad BETWEEN children of `.mv-ads` — needs ≥2 children.
  return (
    <div className="mv-ads my-6" aria-hidden="true">
      <div />
      <div />
    </div>
  );
}

export default function ModDetailClient({ initialMod }: ModDetailClientProps) {
  const router = useRouter();
  const [mod] = useState<Mod>(initialMod);
  const [isFavorited, setIsFavorited] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(
    initialMod.thumbnail || initialMod.images?.[0] || null
  );

  const handleDownload = () => {
    router.push(`/go/${mod.id}`);
  };

  const handleFavorite = () => {
    // TODO: Implement actual favorite functionality
    setIsFavorited(!isFavorited);
  };

  return (
    <div className="min-h-screen bg-mhm-dark">
      {/* Header with Breadcrumbs */}
      <div className="bg-mhm-card/80 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-sm mb-2" aria-label="Breadcrumb">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-1 text-slate-400 hover:text-sims-pink transition-colors"
            >
              <Home size={16} />
              <span>Home</span>
            </button>
            <ChevronRight size={16} className="text-slate-500" />
            {mod && (
              <>
                <button
                  onClick={() => router.push(`/?category=${encodeURIComponent(mod.category)}`)}
                  className="text-slate-400 hover:text-sims-pink transition-colors"
                >
                  {mod.category}
                </button>
                <ChevronRight size={16} className="text-slate-500" />
                <span className="text-white font-medium truncate max-w-xs">
                  {mod.title}
                </span>
              </>
            )}
          </nav>

          {/* Back Button */}
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-slate-300 hover:text-sims-pink transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="font-medium">Back to Browse</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Images */}
          <div className="lg:col-span-2">
            {/* Main Image */}
            <div className="bg-mhm-card border border-white/5 rounded-2xl shadow-lg overflow-hidden mb-6">
              <div className="relative aspect-video bg-gradient-to-br from-mhm-elevated to-mhm-card">
                {selectedImage ? (
                  <Image
                    src={selectedImage}
                    alt={mod.title}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 66vw"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Package size={64} className="text-slate-500" />
                  </div>
                )}

                {/* Badges */}
                <div className="absolute top-4 left-4 flex gap-2">
                  {mod.isVerified && (
                    <div className="bg-gradient-to-r from-amber-400 to-yellow-500 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 shadow-lg">
                      <Crown size={14} />
                      Verified
                    </div>
                  )}
                  {mod.isFree && (
                    <div className="bg-gradient-to-r from-green-400 to-emerald-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                      Free
                    </div>
                  )}
                  {!mod.isFree && mod.price && (
                    <div className="bg-sims-pink text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                      ${mod.price}
                    </div>
                  )}
                </div>
              </div>

              {/* Image Gallery */}
              {mod.images && mod.images.length > 0 && (
                <div className="p-4 bg-white/5 border-t border-white/5">
                  <div className="grid grid-cols-4 gap-3">
                    {mod.images.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImage(image)}
                        className={`relative aspect-square rounded-lg overflow-hidden hover:ring-2 hover:ring-sims-pink transition-all ${selectedImage === image ? 'ring-2 ring-sims-pink' : ''
                          }`}
                      >
                        <Image
                          src={image}
                          alt={`${mod.title} - Image ${index + 1}`}
                          fill

                          sizes="(max-width: 1024px) 25vw, 12vw"
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Description Section */}
            <div className="bg-mhm-card border border-white/5 rounded-2xl shadow-lg p-6 mb-6">
              <h2 className="text-2xl font-bold text-white mb-4">About This Mod</h2>
              <div className="prose prose-invert max-w-none text-slate-300 leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {mod.description || mod.shortDescription || 'No description available.'}
                </ReactMarkdown>
              </div>
            </div>

            <InContentAd />

            {/* Tags Section */}
            {mod.tags && mod.tags.length > 0 && (
              <div className="bg-mhm-card border border-white/5 rounded-2xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Tag size={20} />
                  Tags
                </h2>
                <div className="flex flex-wrap gap-2">
                  {mod.tags.map((tag, index) => (
                    <Link
                      key={index}
                      href={`/?search=${encodeURIComponent(tag)}`}
                      className="bg-sims-pink/20 text-sims-pink px-3 py-1 rounded-full text-sm font-medium hover:bg-sims-pink/30 transition-colors border border-sims-pink/30"
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <InContentAd />

            {/* Installation, Compatibility & FAQ — adds scroll depth + H2 ad insertion points */}
            <ModContentSections
              gameVersion={mod.gameVersion}
              category={mod.category}
              title={mod.title}
              author={mod.author}
              isFree={mod.isFree}
              source={mod.source}
            />

            <InContentAd />

            {/* More from Creator — drives pages/session via creator discovery loop */}
            <MoreFromCreator modId={mod.id} author={mod.creator?.handle || mod.author} />

            <InContentAd />

            {/* Related Mods */}
            <RelatedMods modId={mod.id} category={mod.category} gameVersion={mod.gameVersion} />
          </div>

          {/* Right Column - Mod Info & Actions */}
          <div className="lg:col-span-1">
            {/*
              Sidebar in-content ad wrapper. Mediavine injects an ad BETWEEN
              the children of a `.mv-ads` element, so wrapping the Download
              block and Additional Information as two real content siblings
              creates a single high-quality injection point directly adjacent
              to the page's primary CTA. An empty `.mv-ads` with placeholder
              divs did not fill reliably — Mediavine's injector prefers real
              content blocks as neighbors.
            */}
            <div className="mv-ads space-y-6 mb-6">
            {/* Title & Creator */}
            <div className="bg-mhm-card border border-white/5 rounded-2xl shadow-lg p-6">
              <h1 className="text-3xl font-bold text-white mb-4">{mod.title}</h1>

              {/* Creator Info */}
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/10">
                <div className="w-12 h-12 rounded-full bg-sims-pink flex items-center justify-center text-white font-bold text-lg">
                  {(mod.creator?.handle || mod.author || 'U')[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-400">Created by</p>
                  <p className="font-semibold text-white flex items-center gap-1">
                    {mod.creator?.handle || mod.author || 'Unknown Creator'}
                    {mod.creator?.isVerified && (
                      <Crown size={14} className="text-sims-blue" />
                    )}
                  </p>
                </div>
              </div>

              {/* Category & Game Version */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Category</span>
                  <span className="font-semibold text-white">{mod.category}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Game Version</span>
                  <span className="font-semibold text-white">{mod.gameVersion}</span>
                </div>
                {mod.version && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Mod Version</span>
                    <span className="font-semibold text-white">{mod.version}</span>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-white/10">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-yellow-400 mb-1">
                    <Star size={18} className="fill-current" />
                    <span className="font-bold text-lg text-white">
                      {typeof mod.rating === 'number' ? mod.rating.toFixed(1) : '4.5'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{mod.ratingCount || 0} ratings</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-sims-pink mb-1">
                    <Download size={18} />
                    <span className="font-bold text-lg text-white">
                      {(mod._count?.downloads || mod.downloadCount || 0).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">downloads</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-red-400 mb-1">
                    <Heart size={18} />
                    <span className="font-bold text-lg text-white">
                      {(mod._count?.favorites || 0).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">favorites</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-sims-blue mb-1">
                    <Eye size={18} />
                    <span className="font-bold text-lg text-white">
                      {(mod.viewCount || 0).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">views</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleDownload}
                  className="w-full bg-sims-pink hover:bg-sims-pink/90 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all duration-300"
                  aria-label={mod.isFree ? 'Download this mod now' : `Download this mod for $${mod.price}`}
                >
                  <Download size={22} />
                  {mod.isFree ? 'Download Now' : `Download - $${mod.price}`}
                </button>

                <button
                  onClick={handleFavorite}
                  className={`w-full ${isFavorited
                      ? 'bg-sims-pink hover:bg-sims-pink/90 text-white'
                      : 'bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10'
                    } py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-300`}
                >
                  <Heart size={20} className={isFavorited ? 'fill-current' : ''} />
                  {isFavorited ? 'Favorited' : 'Add to Favorites'}
                </button>

                {mod.sourceUrl && (
                  <a
                    href={mod.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-300"
                  >
                    <ExternalLink size={20} />
                    View on {mod.source}
                  </a>
                )}
              </div>
            </div>

            {/* Additional Info — second child of the `.mv-ads` wrapper above,
                so Mediavine has a clean injection point between the Download
                block and this card. */}
            <div className="bg-mhm-card border border-white/5 rounded-2xl shadow-lg p-6">
              <h3 className="font-bold text-white mb-4">Additional Information</h3>
              <div className="space-y-3 text-sm">
                {mod.publishedAt && (
                  <div className="flex items-start gap-2">
                    <Calendar size={16} className="text-slate-500 mt-0.5" />
                    <div>
                      <p className="text-slate-400">Published</p>
                      <p className="font-medium text-white">
                        {new Date(mod.publishedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <Package size={16} className="text-slate-500 mt-0.5" />
                  <div>
                    <p className="text-slate-400">Source</p>
                    <p className="font-medium text-white">{mod.source}</p>
                  </div>
                </div>
                {mod.updatedAt && (
                  <div className="flex items-start gap-2">
                    <TrendingUp size={16} className="text-slate-500 mt-0.5" />
                    <div>
                      <p className="text-slate-400">Last Updated</p>
                      <p className="font-medium text-white">
                        {new Date(mod.updatedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            </div>
            {/* end .mv-ads sidebar wrapper */}

            {/* Affiliate Product Recommendations */}
            {mod.themes && mod.themes.length > 0 && (
              <div className="mt-6">
                <AffiliateRecommendations
                  modId={mod.id}
                  themes={mod.themes}
                />
              </div>
            )}

            {/* Mediavine Sidebar Sticky Ad — MUST be last element in sidebar.
                Do NOT add position:sticky/fixed — Mediavine Script Wrapper handles
                stickiness itself. overflow must be visible. */}
            <aside
              id="secondary"
              className="widget-area primary-sidebar hidden lg:block mt-6 overflow-visible"
              role="complementary"
              aria-label="Sidebar ads"
            >
              {/* Empty — Mediavine auto-fills with its own stacked ad containers.
                  Matches WordPress blog sidebar pattern for better Mediavine detection. */}
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
