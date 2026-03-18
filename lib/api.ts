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

