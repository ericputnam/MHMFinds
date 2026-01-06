'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { ModSubmissionForm, ModFormData } from '@/components/admin/ModSubmissionForm';

export default function NewModPage() {
  const router = useRouter();

  const handleSubmit = async (formData: ModFormData) => {
    // Prepare data for API
    const modData = {
      ...formData,
      price: formData.isFree ? null : formData.price ? parseFloat(formData.price) : null,
    };

    const response = await fetch('/api/admin/mods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(modData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create mod');
    }

    // Redirect to mods list on success
    router.push('/admin/mods');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/mods"
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-6 w-6 text-slate-400" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Add New Mod</h1>
            <p className="text-slate-400">Create a new mod entry in the database</p>
          </div>
        </div>
      </div>

      {/* Reusable Form Component */}
      <ModSubmissionForm
        onSubmit={handleSubmit}
        submitLabel="Create Mod"
        showAdminFields={true}
      />
    </div>
  );
}
