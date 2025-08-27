'use client';

import React, { useState, useEffect } from 'react';

export default function TestSimplePage() {
  const [count, setCount] = useState(0);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('TestSimplePage useEffect running...');
    const fetchData = async () => {
      try {
        console.log('Fetching data...');
        const response = await fetch('/api/mods');
        const result = await response.json();
        console.log('Data fetched:', result);
        setData(result);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">Simple Test Page</h1>
      
      <div className="mb-4">
        <button 
          onClick={() => setCount(count + 1)}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Count: {count}
        </button>
      </div>

      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Status:</h2>
        <p>Loading: {loading ? 'Yes' : 'No'}</p>
        <p>Data: {data ? 'Loaded' : 'None'}</p>
        <p>Mods count: {data?.mods?.length || 0}</p>
      </div>

      {data && (
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-2">API Response:</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}

      <div className="mb-4">
        <button 
          onClick={async () => {
            console.log('Manual fetch...');
            const response = await fetch('/api/mods');
            const result = await response.json();
            console.log('Manual fetch result:', result);
            setData(result);
            setLoading(false);
          }}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          Manual Fetch
        </button>
      </div>
    </div>
  );
}
