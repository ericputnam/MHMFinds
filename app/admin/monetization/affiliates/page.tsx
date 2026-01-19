'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  Eye,
  MousePointer,
  ToggleLeft,
  ToggleRight,
  Search,
  X,
} from 'lucide-react';

interface AffiliateOffer {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string;
  affiliateUrl: string;
  partner: string;
  partnerLogo: string | null;
  category: string;
  priority: number;
  isActive: boolean;
  promoText: string | null;
  promoColor: string | null;
  startDate: string | null;
  endDate: string | null;
  impressions: number;
  clicks: number;
  createdAt: string;
}

const CATEGORIES = [
  { value: 'peripherals', label: 'Gaming Peripherals' },
  { value: 'gaming-chairs', label: 'Gaming Chairs' },
  { value: 'games', label: 'Games & Keys' },
  { value: 'pc-components', label: 'PC Components' },
  { value: 'streaming', label: 'Streaming Gear' },
  { value: 'merch', label: 'Merchandise' },
  { value: 'software', label: 'Software' },
  { value: 'other', label: 'Other' },
];

export default function AffiliatesAdminPage() {
  const [offers, setOffers] = useState<AffiliateOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState<AffiliateOffer | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    imageUrl: '',
    affiliateUrl: '',
    partner: '',
    partnerLogo: '',
    category: 'peripherals',
    priority: 0,
    promoText: '',
    promoColor: '#ec4899',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      const response = await fetch('/api/affiliates?limit=100');
      const data = await response.json();

      // Also fetch inactive offers for admin view
      const allResponse = await fetch('/api/admin/affiliates');
      if (allResponse.ok) {
        const allData = await allResponse.json();
        setOffers(allData.offers || []);
      } else {
        setOffers(data.offers || []);
      }
    } catch (error) {
      console.error('Failed to fetch offers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingOffer
        ? `/api/affiliates/${editingOffer.id}`
        : '/api/affiliates';

      const method = editingOffer ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          priority: parseInt(formData.priority.toString()),
          startDate: formData.startDate || null,
          endDate: formData.endDate || null,
          promoText: formData.promoText || null,
          partnerLogo: formData.partnerLogo || null,
        }),
      });

      if (response.ok) {
        setShowModal(false);
        setEditingOffer(null);
        resetForm();
        fetchOffers();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save offer');
      }
    } catch (error) {
      console.error('Failed to save offer:', error);
      alert('Failed to save offer');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this affiliate offer?')) return;

    try {
      const response = await fetch(`/api/affiliates/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchOffers();
      }
    } catch (error) {
      console.error('Failed to delete offer:', error);
    }
  };

  const handleToggleActive = async (offer: AffiliateOffer) => {
    try {
      const response = await fetch(`/api/affiliates/${offer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !offer.isActive }),
      });

      if (response.ok) {
        fetchOffers();
      }
    } catch (error) {
      console.error('Failed to toggle offer:', error);
    }
  };

  const openEditModal = (offer: AffiliateOffer) => {
    setEditingOffer(offer);
    setFormData({
      name: offer.name,
      description: offer.description || '',
      imageUrl: offer.imageUrl,
      affiliateUrl: offer.affiliateUrl,
      partner: offer.partner,
      partnerLogo: offer.partnerLogo || '',
      category: offer.category,
      priority: offer.priority,
      promoText: offer.promoText || '',
      promoColor: offer.promoColor || '#ec4899',
      startDate: offer.startDate ? offer.startDate.split('T')[0] : '',
      endDate: offer.endDate ? offer.endDate.split('T')[0] : '',
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      imageUrl: '',
      affiliateUrl: '',
      partner: '',
      partnerLogo: '',
      category: 'peripherals',
      priority: 0,
      promoText: '',
      promoColor: '#ec4899',
      startDate: '',
      endDate: '',
    });
  };

  const filteredOffers = offers.filter(offer => {
    const matchesCategory = !filterCategory || offer.category === filterCategory;
    const matchesSearch = !searchTerm ||
      offer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      offer.partner.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCTR = (offer: AffiliateOffer) => {
    if (offer.impressions === 0) return '0.00';
    return ((offer.clicks / offer.impressions) * 100).toFixed(2);
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-slate-800 rounded w-1/3" />
        <div className="h-64 bg-slate-800 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Affiliate Offers</h1>
          <p className="text-slate-400">Manage Impact.com affiliate products for monetization</p>
        </div>
        <button
          onClick={() => {
            setEditingOffer(null);
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-sims-pink hover:bg-sims-pink/80 rounded-lg transition-colors text-white font-medium"
        >
          <Plus className="h-4 w-4" />
          Add Offer
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="text-sm text-slate-400 mb-1">Total Offers</div>
          <div className="text-2xl font-bold text-white">{offers.length}</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="text-sm text-slate-400 mb-1">Active Offers</div>
          <div className="text-2xl font-bold text-green-400">
            {offers.filter(o => o.isActive).length}
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="text-sm text-slate-400 mb-1">Total Impressions</div>
          <div className="text-2xl font-bold text-blue-400">
            {offers.reduce((sum, o) => sum + o.impressions, 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="text-sm text-slate-400 mb-1">Total Clicks</div>
          <div className="text-2xl font-bold text-sims-pink">
            {offers.reduce((sum, o) => sum + o.clicks, 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search offers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-sims-pink"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-sims-pink"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map(cat => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>
      </div>

      {/* Offers Table */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left px-6 py-4 text-sm font-semibold text-slate-400">Offer</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-slate-400">Partner</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-slate-400">Category</th>
              <th className="text-center px-6 py-4 text-sm font-semibold text-slate-400">Priority</th>
              <th className="text-center px-6 py-4 text-sm font-semibold text-slate-400">Impressions</th>
              <th className="text-center px-6 py-4 text-sm font-semibold text-slate-400">Clicks</th>
              <th className="text-center px-6 py-4 text-sm font-semibold text-slate-400">CTR</th>
              <th className="text-center px-6 py-4 text-sm font-semibold text-slate-400">Status</th>
              <th className="text-right px-6 py-4 text-sm font-semibold text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOffers.map(offer => (
              <tr key={offer.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="relative group">
                      <img
                        src={offer.imageUrl}
                        alt={offer.name}
                        className="w-12 h-12 rounded-lg object-cover bg-slate-700 cursor-zoom-in"
                      />
                      {/* Magnified image on hover */}
                      <div className="absolute left-14 top-1/2 -translate-y-1/2 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none">
                        <div className="bg-slate-900 border border-slate-600 rounded-xl p-2 shadow-2xl">
                          <img
                            src={offer.imageUrl}
                            alt={offer.name}
                            className="w-64 h-64 rounded-lg object-contain bg-slate-800"
                          />
                          <div className="mt-2 text-xs text-slate-400 text-center truncate max-w-64">
                            {offer.name}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-white">{offer.name}</div>
                      {offer.promoText && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: offer.promoColor || '#ec4899', color: 'white' }}
                        >
                          {offer.promoText}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-300">{offer.partner}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300">
                    {CATEGORIES.find(c => c.value === offer.category)?.label || offer.category}
                  </span>
                </td>
                <td className="px-6 py-4 text-center text-slate-300">{offer.priority}</td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-1 text-slate-300">
                    <Eye className="h-3 w-3" />
                    {offer.impressions.toLocaleString()}
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-1 text-slate-300">
                    <MousePointer className="h-3 w-3" />
                    {offer.clicks.toLocaleString()}
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`font-medium ${parseFloat(getCTR(offer)) > 2 ? 'text-green-400' : 'text-slate-400'}`}>
                    {getCTR(offer)}%
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => handleToggleActive(offer)}
                    className="inline-flex items-center"
                  >
                    {offer.isActive ? (
                      <ToggleRight className="h-6 w-6 text-green-400" />
                    ) : (
                      <ToggleLeft className="h-6 w-6 text-slate-500" />
                    )}
                  </button>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <a
                      href={offer.affiliateUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-slate-400 hover:text-white transition-colors"
                      title="Open affiliate link"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <button
                      onClick={() => openEditModal(offer)}
                      className="p-2 text-slate-400 hover:text-white transition-colors"
                      title="Edit offer"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(offer.id)}
                      className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                      title="Delete offer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredOffers.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            {offers.length === 0 ? (
              <div>
                <p className="mb-2">No affiliate offers yet</p>
                <button
                  onClick={() => setShowModal(true)}
                  className="text-sims-pink hover:underline"
                >
                  Add your first offer
                </button>
              </div>
            ) : (
              <p>No offers match your filters</p>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <h2 className="text-xl font-bold text-white">
                {editingOffer ? 'Edit Offer' : 'Add New Offer'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingOffer(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-sims-pink"
                    placeholder="Razer BlackWidow V4"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Partner/Brand *
                  </label>
                  <input
                    type="text"
                    value={formData.partner}
                    onChange={(e) => setFormData({ ...formData, partner: e.target.value })}
                    required
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-sims-pink"
                    placeholder="Razer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-sims-pink"
                  placeholder="Short promotional description..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Product Image URL *
                  </label>
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    required
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-sims-pink"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Partner Logo URL
                  </label>
                  <input
                    type="url"
                    value={formData.partnerLogo}
                    onChange={(e) => setFormData({ ...formData, partnerLogo: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-sims-pink"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Affiliate URL (Impact.com tracking link) *
                </label>
                <input
                  type="url"
                  value={formData.affiliateUrl}
                  onChange={(e) => setFormData({ ...formData, affiliateUrl: e.target.value })}
                  required
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-sims-pink"
                  placeholder="https://impact.com/..."
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-sims-pink"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Priority (higher = shown first)
                  </label>
                  <input
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-sims-pink"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Promo Text
                  </label>
                  <input
                    type="text"
                    value={formData.promoText}
                    onChange={(e) => setFormData({ ...formData, promoText: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-sims-pink"
                    placeholder="20% OFF"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Promo Badge Color
                  </label>
                  <input
                    type="color"
                    value={formData.promoColor}
                    onChange={(e) => setFormData({ ...formData, promoColor: e.target.value })}
                    className="w-full h-10 bg-slate-800 border border-slate-700 rounded-lg cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-sims-pink"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-sims-pink"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingOffer(null);
                  }}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sims-pink hover:bg-sims-pink/80 rounded-lg text-white font-medium transition-colors"
                >
                  {editingOffer ? 'Update Offer' : 'Create Offer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
