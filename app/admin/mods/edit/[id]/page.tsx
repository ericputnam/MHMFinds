'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { ModSubmissionForm, ModFormData } from '@/components/admin/ModSubmissionForm';

interface Mod {
  id: string;
  title: string;
  description: string;
  shortDescription?: string;
  version?: string;
  gameVersion?: string;
  category: string;
  tags: string[];
  thumbnail?: string;
  images: string[];
  downloadUrl?: string;
  sourceUrl?: string;
  source: string;
  author?: string;
  isFree: boolean;
  price?: number;
  currency: string;
  isNSFW: boolean;
  isFeatured: boolean;
  isVerified: boolean;
  creator?: {
    userId: string;
  };
}

export default function EditModPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status } = useSession();
  const [mod, setMod] = useState<Mod | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const modId = params.id as string;
  const isAdmin = session?.user?.isAdmin || false;

  const fetchMod = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/mods/${modId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch mod');
      }
      const data = await response.json();
      setMod(data);

      // Verify creator ownership (if not admin)
      if (!isAdmin && data.creator?.userId !== session?.user?.id) {
        setError('You can only edit your own mods');
      }
    } catch (err) {
      console.error('Error fetching mod:', err);
      setError('Failed to load mod');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, modId, session?.user?.id]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchMod();
    }
  }, [fetchMod, status]);

  const handleSubmit = async (formData: ModFormData) => {
    try {
      if (isAdmin) {
        // Admins update mod directly
        const response = await fetch(`/api/admin/mods/${modId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            price: formData.isFree ? null : formData.price ? parseFloat(formData.price) : null,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update mod');
        }

        // Redirect to mods list
        router.push('/admin/mods');
      } else {
        // Creators submit for review
        const response = await fetch(`/api/creator/mods/${modId}/edit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            price: formData.isFree ? null : formData.price ? parseFloat(formData.price) : null,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to submit edit');
        }

        // Redirect to submissions
        router.push('/admin/submissions');
      }
    } catch (error) {
      console.error('Submission error:', error);
      throw error;
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/admin/login');
    return null;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href={isAdmin ? '/admin/mods' : '/admin'}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-6 w-6 text-slate-400" />
          </Link>
          <h1 className="text-3xl font-bold text-white">Error</h1>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-red-400 font-semibold mb-1">Unable to Edit Mod</h3>
              <p className="text-red-400/80 text-sm">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!mod) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-400">Mod not found</div>
      </div>
    );
  }

  // Convert mod data to form data format
  const initialData: Partial<ModFormData> = {
    title: mod.title,
    description: mod.description || '',
    shortDescription: mod.shortDescription || '',
    version: mod.version || '',
    gameVersion: mod.gameVersion || '',
    category: mod.category,
    tags: mod.tags,
    thumbnail: mod.thumbnail || '',
    images: mod.images,
    downloadUrl: mod.downloadUrl || '',
    sourceUrl: mod.sourceUrl || '',
    source: mod.source,
    author: mod.author || '',
    isFree: mod.isFree,
    price: mod.price ? mod.price.toString() : '',
    currency: mod.currency,
    isNSFW: mod.isNSFW,
    isFeatured: mod.isFeatured,
    isVerified: mod.isVerified,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={isAdmin ? '/admin/mods' : '/admin'}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-6 w-6 text-slate-400" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {isAdmin ? 'Edit Mod' : 'Submit Edit for Review'}
            </h1>
            <p className="text-slate-400">
              {isAdmin
                ? 'Update mod details directly'
                : 'Your changes will be submitted for admin review'}
            </p>
          </div>
        </div>
      </div>

      {/* Creator Info Banner */}
      {!isAdmin && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-blue-400 font-semibold mb-1">
                Edit Review Process
              </h3>
              <p className="text-blue-400/80 text-sm">
                Your edits will be submitted for admin review. The mod will be updated once approved.
                You can track the status in your submissions list.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Reusable Form Component */}
      <ModSubmissionForm
        initialData={initialData}
        onSubmit={handleSubmit}
        submitLabel={isAdmin ? 'Update Mod' : 'Submit Edit for Review'}
        showAdminFields={isAdmin}
      />
    </div>
  );
}
