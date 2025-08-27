'use client';

import React, { useState, useEffect } from 'react';

export default function SimpleMainPage() {
  const [mounted, setMounted] = useState(false);
  const [mods, setMods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Set mounted state after hydration
  useEffect(() => {
    console.log('Setting mounted state...');
    setMounted(true);
  }, []);

  // Fetch mods
  useEffect(() => {
    if (!mounted) return;
    
    console.log('Fetching mods...');
    const fetchMods = async () => {
      try {
        const response = await fetch('/api/mods');
        const data = await response.json();
        console.log('Mods fetched:', data);
        setMods(data.mods || []);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching mods:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch mods');
        setLoading(false);
      }
    };

    fetchMods();
  }, [mounted]);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">Simple Main Page</h1>
      
      <div className="mb-4 p-4 bg-yellow-100 border border-yellow-300 rounded">
        <h2 className="text-lg font-semibold mb-2">Debug Info:</h2>
        <p>Mounted: {mounted ? 'Yes' : 'No'}</p>
        <p>Loading: {loading ? 'Yes' : 'No'}</p>
        <p>Error: {error || 'None'}</p>
        <p>Mods count: {mods.length}</p>
      </div>

      {loading && (
        <div className="mb-4 p-4 bg-blue-100 border border-blue-300 rounded">
          <p>Loading mods...</p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-300 rounded">
          <p>Error: {error}</p>
        </div>
      )}

      {mods.length > 0 && (
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-2">Mods:</h2>
          <div className="space-y-2">
            {mods.map((mod) => (
              <div key={mod.id} className="p-3 bg-gray-100 rounded">
                <h3 className="font-semibold">{mod.title}</h3>
                <p className="text-sm text-gray-600">{mod.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <button 
        onClick={async () => {
          console.log('Manual fetch...');
          const response = await fetch('/api/mods');
          const data = await response.json();
          console.log('Manual fetch result:', data);
          setMods(data.mods || []);
          setLoading(false);
        }}
        className="bg-green-500 text-white px-4 py-2 rounded"
      >
        Manual Fetch
      </button>
    </div>
  );
}
