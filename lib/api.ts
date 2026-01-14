const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export interface Mod {
  id: string;
  title: string;
  description: string | null;
  shortDescription: string | null;
  version: string | null;
  gameVersion: string | null;
  category: string;
  tags: string[];

  // Faceted taxonomy
  contentType: string | null;
  visualStyle: string | null;
  themes: string[];
  ageGroups: string[];
  genderOptions: string[];
  occultTypes: string[];
  packRequirements: string[];

  thumbnail: string | null;
  images: string[];
  downloadUrl: string | null;
  sourceUrl: string | null;
  source: string;
  sourceId: string | null;
  author: string | null;
  isFree: boolean;
  price: string | null;
  currency: string | null;
  isNSFW: boolean;
  isVerified: boolean;
  isFeatured: boolean;
  downloadCount: number;
  viewCount: number;
  rating: number | null;
  ratingCount: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  lastScraped: string | null;
  creatorId: string | null;
  creator: any | null;
  _count: {
    reviews: number;
    favorites: number;
    downloads: number;
  };
}

export interface ModsResponse {
  mods: Mod[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface SearchFilters {
  search?: string;
  category?: string; // Legacy
  gameVersion?: string;
  tags?: string[]; // Legacy

  // Faceted filters
  contentType?: string[];
  visualStyle?: string[];
  themes?: string[];
  ageGroups?: string[];
  genderOptions?: string[];

  isFree?: boolean;
  isNSFW?: boolean;
  sortBy?: 'createdAt' | 'downloadCount' | 'rating' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface FacetDefinition {
  id: string;
  facetType: string;
  value: string;
  displayName: string;
  description?: string;
  icon?: string;
  color?: string;
  sortOrder: number;
  count?: number; // Number of mods with this facet
}

class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Get mods with optional filtering and pagination
  async getMods(filters: SearchFilters = {}, page: number = 1, limit: number = 20): Promise<ModsResponse> {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.category) params.append('category', filters.category);
    if (filters.gameVersion) params.append('gameVersion', filters.gameVersion);
    if (filters.isFree !== undefined) params.append('isFree', filters.isFree.toString());
    if (filters.isNSFW !== undefined) params.append('isNSFW', filters.isNSFW.toString());
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
    
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    return this.request<ModsResponse>(`/mods?${params.toString()}`);
  }

  // Get a single mod by ID
  async getMod(id: string): Promise<Mod> {
    return this.request<Mod>(`/mods/${id}`);
  }

  // Get featured mods
  async getFeaturedMods(limit: number = 6): Promise<Mod[]> {
    const response = await this.getMods({}, 1, limit * 2); // Get more to filter from
    const featuredMods = response.mods.filter(mod => mod.isFeatured);
    
    // If no featured mods, return the first few mods instead
    if (featuredMods.length === 0) {
      return response.mods.slice(0, limit);
    }
    
    return featuredMods.slice(0, limit);
  }

  // Get mods by category
  async getModsByCategory(category: string, limit: number = 12): Promise<Mod[]> {
    const response = await this.getMods({ category }, 1, limit);
    return response.mods;
  }

  // Search mods
  async searchMods(query: string, limit: number = 20): Promise<Mod[]> {
    const response = await this.getMods({ search: query }, 1, limit);
    return response.mods;
  }

  // Get popular mods (by download count, fallback to newest if all downloads are 0)
  async getPopularMods(limit: number = 8): Promise<Mod[]> {
    const response = await this.getMods({ sortBy: 'downloadCount', sortOrder: 'desc' }, 1, limit);
    
    // If all mods have 0 downloads, sort by creation date instead
    if (response.mods.length > 0 && response.mods.every(mod => mod.downloadCount === 0)) {
      const newestResponse = await this.getMods({ sortBy: 'createdAt', sortOrder: 'desc' }, 1, limit);
      return newestResponse.mods;
    }
    
    return response.mods;
  }
}

export const apiClient = new ApiClient();
