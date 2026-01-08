'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Mod } from '@/lib/api';
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
  Users,
  MessageSquare,
  ChevronRight,
  Home
} from 'lucide-react';
import Image from 'next/image';

export default function ModDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [mod, setMod] = useState<Mod | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchMod = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/mods/${params.id}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Mod not found');
          } else {
            setError('Failed to load mod');
          }
          return;
        }

        const data = await response.json();
        setMod(data);
        setSelectedImage(data.thumbnail || data.images?.[0] || null);
      } catch (err) {
        console.error('Error fetching mod:', err);
        setError('Failed to load mod');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchMod();
    }
  }, [params.id]);

  const handleDownload = () => {
    if (!mod) return;
    
    // TODO: Track download in database
    if (mod.downloadUrl) {
      window.open(mod.downloadUrl, '_blank');
    } else if (mod.sourceUrl) {
      window.open(mod.sourceUrl, '_blank');
    }
  };

  const handleFavorite = () => {
    // TODO: Implement actual favorite functionality
    setIsFavorited(!isFavorited);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-mhm-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-sims-pink mx-auto mb-4"></div>
          <p className="text-slate-400 text-lg">Loading mod details...</p>
        </div>
      </div>
    );
  }

  if (error || !mod) {
    return (
      <div className="min-h-screen bg-mhm-dark flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-3xl font-bold text-white mb-2">{error || 'Mod not found'}</h1>
          <p className="text-slate-400 mb-6">The mod you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={() => router.push('/')}
            className="bg-sims-pink hover:bg-sims-pink/90 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all duration-300 font-semibold"
            aria-label="Return to home page"
          >
            <ArrowLeft className="inline mr-2" size={20} />
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mhm-dark">
      {/* Header with Breadcrumbs */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-sm mb-2" aria-label="Breadcrumb">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-1 text-gray-500 hover:text-indigo-600 transition-colors"
            >
              <Home size={16} />
              <span>Home</span>
            </button>
            <ChevronRight size={16} className="text-gray-400" />
            {mod && (
              <>
                <button
                  onClick={() => router.push(`/?category=${encodeURIComponent(mod.category)}`)}
                  className="text-gray-500 hover:text-indigo-600 transition-colors"
                >
                  {mod.category}
                </button>
                <ChevronRight size={16} className="text-gray-400" />
                <span className="text-gray-900 font-medium truncate max-w-xs">
                  {mod.title}
                </span>
              </>
            )}
          </nav>

          {/* Back Button */}
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors"
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
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
              <div className="relative aspect-video bg-gradient-to-br from-gray-100 to-gray-200">
                {selectedImage ? (
                  <img
                    src={selectedImage}
                    alt={mod.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Package size={64} className="text-gray-400" />
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
                <div className="p-4 bg-gray-50">
                  <div className="grid grid-cols-4 gap-3">
                    {mod.images.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImage(image)}
                        className={`relative aspect-square rounded-lg overflow-hidden hover:ring-2 hover:ring-sims-pink transition-all ${
                          selectedImage === image ? 'ring-2 ring-sims-pink' : ''
                        }`}
                      >
                        <img
                          src={image}
                          alt={`${mod.title} - Image ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Mediavine Video Player Container */}
            <div className="bg-white rounded-2xl shadow-lg mb-6 overflow-hidden">
              <div
                id="mediavine-video-player"
                className="mv-video-player"
                data-video-type="floating"
                style={{ minHeight: '400px' }}
              >
                {/* Mediavine Universal Player injects here automatically */}
              </div>
            </div>

            {/* Description Section */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">About This Mod</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {mod.description || mod.shortDescription || 'No description available.'}
              </p>
            </div>

            {/* Tags Section */}
            {mod.tags && mod.tags.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Tag size={20} />
                  Tags
                </h2>
                <div className="flex flex-wrap gap-2">
                  {mod.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="bg-sims-pink/20 text-sims-pink px-3 py-1 rounded-full text-sm font-medium hover:bg-sims-pink/30 transition-colors cursor-pointer border border-sims-pink/30"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Mod Info & Actions */}
          <div className="lg:col-span-1">
            {/* Title & Creator */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{mod.title}</h1>
              
              {/* Creator Info */}
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200">
                <div className="w-12 h-12 rounded-full bg-sims-pink flex items-center justify-center text-white font-bold text-lg">
                  {(mod.creator?.handle || mod.author || 'U')[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Created by</p>
                  <p className="font-semibold text-gray-900 flex items-center gap-1">
                    {mod.creator?.handle || mod.author || 'Unknown Creator'}
                    {mod.creator?.isVerified && (
                      <Crown size={14} className="text-yellow-500" />
                    )}
                  </p>
                </div>
              </div>

              {/* Category & Game Version */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Category</span>
                  <span className="font-semibold text-gray-900">{mod.category}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Game Version</span>
                  <span className="font-semibold text-gray-900">{mod.gameVersion}</span>
                </div>
                {mod.version && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Mod Version</span>
                    <span className="font-semibold text-gray-900">{mod.version}</span>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-gray-200">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-yellow-500 mb-1">
                    <Star size={18} className="fill-current" />
                    <span className="font-bold text-lg text-gray-900">
                      {typeof mod.rating === 'number' ? mod.rating.toFixed(1) : '4.5'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{mod.ratingCount || 0} ratings</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-sims-pink mb-1">
                    <Download size={18} />
                    <span className="font-bold text-lg text-gray-900">
                      {(mod._count?.downloads || mod.downloadCount || 0).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">downloads</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-red-500 mb-1">
                    <Heart size={18} />
                    <span className="font-bold text-lg text-gray-900">
                      {(mod._count?.favorites || 0).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">favorites</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-blue-500 mb-1">
                    <Eye size={18} />
                    <span className="font-bold text-lg text-gray-900">
                      {(mod.viewCount || 0).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">views</p>
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
                  className={`w-full ${
                    isFavorited
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
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
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-300"
                  >
                    <ExternalLink size={20} />
                    View on {mod.source}
                  </a>
                )}
              </div>
            </div>

            {/* Additional Info */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="font-bold text-gray-800 mb-4">Additional Information</h3>
              <div className="space-y-3 text-sm">
                {mod.publishedAt && (
                  <div className="flex items-start gap-2">
                    <Calendar size={16} className="text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-gray-500">Published</p>
                      <p className="font-medium text-gray-900">
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
                  <Package size={16} className="text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-gray-500">Source</p>
                    <p className="font-medium text-gray-900">{mod.source}</p>
                  </div>
                </div>
                {mod.updatedAt && (
                  <div className="flex items-start gap-2">
                    <TrendingUp size={16} className="text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-gray-500">Last Updated</p>
                      <p className="font-medium text-gray-900">
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
        </div>
      </div>
    </div>
  );
}

