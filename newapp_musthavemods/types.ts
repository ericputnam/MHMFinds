export interface Mod {
  id: string;
  title: string;
  author: string;
  category: string;
  description: string;
  imageUrl: string;
  downloadCount: string;
  rating: number;
  tags: string[];
  isMaxisMatch: boolean;
  // Extended Metadata
  gameVersion?: string;
  favoritesCount?: number;
  viewCount?: string;
  publishedDate?: string;
  updatedDate?: string;
  link?: string;
}

export enum Category {
  ALL = "All",
  CAS = "Create a Sim",
  BUILD_BUY = "Build/Buy",
  SCRIPT = "Script Mods",
  POSE = "Poses",
  WORLD = "Worlds"
}

export enum SortOption {
  RELEVANCE = "Relevance",
  DOWNLOADS = "Most Downloads",
  RATING = "Highest Rated",
  NEWEST = "Newest Finds"
}

export interface FilterState {
  category: Category;
  sort: SortOption;
  showMaxisMatchOnly: boolean;
  showAlphaOnly: boolean;
}

export interface SearchState {
  query: string;
  category: Category;
  isLoading: boolean;
  results: Mod[];
  error: string | null;
}

// For the Gemini response schema
export interface GeminiModResponse {
  mods: {
    title: string;
    author: string;
    category: string;
    description: string;
    downloadCount: string;
    rating: number;
    tags: string[];
    isMaxisMatch: boolean;
  }[];
}