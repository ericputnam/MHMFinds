'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { ModSubmissionForm, ModFormData } from '@/components/admin/ModSubmissionForm';

export default function CreatorSubmitPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // Check authentication status
  if (status === 'loading') {
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

  const isAdmin = session?.user?.isAdmin || false;

  const handleSubmit = async (formData: ModFormData) => {
    try {
      // Admins create mods directly, creators submit for review
      const endpoint = isAdmin ? '/api/admin/mods' : '/api/creator/submissions';

      // Prepare data for API
      const modData = {
        ...formData,
        price: formData.isFree ? null : formData.price ? parseFloat(formData.price) : null,
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(modData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit mod');
      }

      // Redirect based on role
      if (isAdmin) {
        router.push('/admin/mods');
      } else {
        router.push('/admin/submissions');
      }
    } catch (error) {
      console.error('Submission error:', error);
      throw error;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin"
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-6 w-6 text-slate-400" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {isAdmin ? 'Add New Mod' : 'Submit a Mod'}
            </h1>
            <p className="text-slate-400">
              {isAdmin
                ? 'Create a new mod entry in the database'
                : 'Submit your mod for admin review and approval'}
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
                Review Process
              </h3>
              <p className="text-blue-400/80 text-sm">
                Your submission will be reviewed by an administrator before going live on the site.
                You can track the approval status in your submissions list.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Reusable Form Component */}
      <ModSubmissionForm
        onSubmit={handleSubmit}
        submitLabel={isAdmin ? 'Create Mod' : 'Submit for Review'}
        showAdminFields={isAdmin}
      />
    </div>
  );
}
