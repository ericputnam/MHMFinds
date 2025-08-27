'use client';

import { useEffect, useState } from 'react';
import { apiClient, Mod } from '../../lib/api';

export default function TestPage() {
  const [mods, setMods] = useState<Mod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMods = async () => {
      try {
        console.log('Fetching mods...');
        setLoading(true);
        const response = await apiClient.getMods();
        console.log('API response:', response);
        setMods(response.mods);
      } catch (err) {
        console.error('API error:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch mods');
      } finally {
        setLoading(false);
      }
    };

    fetchMods();
  }, []);

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-600">Error: {error}</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">API Test Page</h1>
      <p className="mb-4">Found {mods.length} mods:</p>
      <div className="space-y-2">
        {mods.map((mod) => (
          <div key={mod.id} className="p-4 border rounded">
            <h3 className="font-semibold">{mod.title}</h3>
            <p className="text-sm text-gray-600">{mod.category} - {mod.gameVersion}</p>
            <p className="text-sm">{mod.isFree ? 'Free' : `$${mod.price}`}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
