'use client';

import React, { useState, useEffect } from 'react';

export default function WorkingTestPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      console.log('Fetching data...');
      const response = await fetch('/api/mods');
      const result = await response.json();
      console.log('Data fetched:', result);
      setData(result);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">Working Test Page</h1>
      
      <div className="mb-4 p-4 bg-yellow-100 border border-yellow-300 rounded">
        <h2 className="text-lg font-semibold mb-2">Status:</h2>
        <p>Loading: {loading ? 'Yes' : 'No'}</p>
        <p>Data: {data ? 'Loaded' : 'None'}</p>
        <p>Mods count: {data?.mods?.length || 0}</p>
      </div>

      {loading && (
        <div className="mb-4 p-4 bg-blue-100 border border-blue-300 rounded">
          <p>Loading mods...</p>
        </div>
      )}

      {data && (
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-2">API Response:</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}

      <div className="mb-4">
        <button 
          onClick={fetchData}
          className="bg-green-500 text-white px-4 py-2 rounded mr-2"
        >
          Refresh Data
        </button>
        
        <button 
          onClick={() => {
            console.log('Console test');
            alert('Button clicked!');
          }}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Test Console
        </button>
      </div>
    </div>
  );
}
