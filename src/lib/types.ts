// ============================================
// WESTROY — Core TypeScript Types
// ============================================

export interface Region {
  id: string;
  name: string;
  nameRu: string;
}

export interface Category {
  id: string;
  name: string;
  nameRu: string;
  description?: string;
  slug?: string;
  icon?: string;
  keywords?: string[]; // Array of strings (JsonB)
  parentId?: string | null;
  children?: Category[];
}

export interface Company {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  address?: string;
  phone?: string;
  delivery: boolean;
  logoUrl?: string;
  verified: boolean;
  baseCityId?: string;
  deliveryRegions?: string[]; // JsonB
  ownerId?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  slug?: string;
  article?: string;
  brand?: string;
  description?: string;
  imageUrl?: string;
  additionalImages?: string[]; // JsonB
  technicalSpecs?: Record<string, unknown>; // JsonB
  marketingFeatures?: Record<string, unknown>; // JsonB
  tags?: string[]; // JsonB
  unit?: string;
  specsJson?: Record<string, unknown>;
  categoryId: string;
  category?: Category;
  offers?: Offer[]; // Inferred from relation
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'client' | 'producer' | 'admin';
  companyId?: string; // For producer
}

export interface Request {
  id: string;
  userId: string;
  categoryId: string;
  query: string; // Original search text
  parsedCategory: string;
  parsedVolume?: string;
  parsedCity: string;
  deliveryNeeded: boolean;
  address?: string;
  deadline?: string;
  status: 'active' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface Offer {
  id: string;
  productId?: string;
  companyId: string;
  price: number;
  priceUnit: string;
  oldPrice?: number;
  discountLabel?: string;
  minOrder?: number;
  stockStatus: 'IN_STOCK' | 'ON_ORDER' | 'OUT_OF_STOCK';
  leadTime?: string;
  deliveryPrice?: number;
  requestId?: string;
  company?: Company;
  createdAt: string;
  updatedAt?: string;
}

// AI Parser types
export interface ParsedQuery {
  category: string | null;
  categoryId: string | null;
  volume: string | null;
  unit: string | null;
  city: string | null;
  delivery: boolean | null;
  grade: string | null; // М300, etc.
  confidence: number; // 0-1
  suggestions: Suggestion[];
  originalQuery: string;
}

export interface Suggestion {
  type: 'category' | 'delivery' | 'volume' | 'city';
  label: string;
  value: string;
}

// Search result types
export interface SearchResultProduct extends Product {
  priceFrom: number;
  priceUnit: string;
}

export interface SearchResult {
  company: Company;
  products: SearchResultProduct[];
  priceFrom: number;
  priceUnit: string;
  relevanceScore: number;
  stats?: {
    completedOrders: number;
    avgResponseMinutes: number | null;
    rating?: number;
    reviewCount?: number;
  };
}

export interface SearchResponse {
  parsed: ParsedQuery;
  results: SearchResult[];
  totalResults: number;
}

export interface SearchFilters {
  inStockOnly?: boolean;
  withImageOnly?: boolean;
  withArticleOnly?: boolean;
  brand?: string;
}
