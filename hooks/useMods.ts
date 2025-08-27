'use client';

import { useState, useEffect } from 'react';
import { apiClient, Mod, SearchFilters, ModsResponse } from '../lib/api';

export interface UseModsOptions {
  filters?: SearchFilters;
  page?: number;
  limit?: number;
  autoFetch?: boolean;
}

export function useMods(options: UseModsOptions = {}) {
  const { filters = {}, page = 1, limit = 20, autoFetch = true } = options;
  
  const [mods, setMods] = useState<Mod[]>([]);
  const [pagination, setPagination] = useState<ModsResponse['pagination'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMods = async (newFilters?: SearchFilters, newPage?: number) => {
    try {
      setLoading(true);
      setError(null);
      
      const currentFilters = newFilters || filters;
      const currentPage = newPage || page;
      
      const response = await apiClient.getMods(currentFilters, currentPage, limit);
      
      setMods(response.mods);
      setPagination(response.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch mods');
      console.error('Error fetching mods:', err);
    } finally {
      setLoading(false);
    }
  };

  const searchMods = async (query: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const results = await apiClient.searchMods(query, limit);
      setMods(results);
      setPagination({
        page: 1,
        limit,
        total: results.length,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search mods');
      console.error('Error searching mods:', err);
    } finally {
      setLoading(false);
    }
  };

  const getModsByCategory = async (category: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const results = await apiClient.getModsByCategory(category, limit);
      setMods(results);
      setPagination({
        page: 1,
        limit,
        total: results.length,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch mods by category');
      console.error('Error fetching mods by category:', err);
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => fetchMods();

  useEffect(() => {
    if (autoFetch) {
      fetchMods();
    }
  }, [autoFetch]);

  return {
    mods,
    pagination,
    loading,
    error,
    fetchMods,
    searchMods,
    getModsByCategory,
    refresh,
  };
}

export function useFeaturedMods(limit: number = 6) {
  const [mods, setMods] = useState<Mod[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeaturedMods = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const results = await apiClient.getFeaturedMods(limit);
        setMods(results);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch featured mods');
        console.error('Error fetching featured mods:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedMods();
  }, [limit]);

  return { mods, loading, error };
}

export function usePopularMods(limit: number = 8) {
  const [mods, setMods] = useState<Mod[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPopularMods = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const results = await apiClient.getPopularMods(limit);
        setMods(results);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch popular mods');
        console.error('Error fetching popular mods:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPopularMods();
  }, [limit]);

  return { mods, loading, error };
}
