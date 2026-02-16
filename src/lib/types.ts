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
  icon: string;
  keywords: string[]; // For AI parser matching
}

export interface Company {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  regionId: string;
  address: string;
  phone: string;
  delivery: boolean;
  logoUrl?: string;
  verified: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  companyId: string;
  categoryId: string;
  name: string;
  description: string;
  unit: string; // м3, тонн, шт
  priceFrom: number; // ₸
  priceUnit: string; // "за м3", "за тонну"
  inStock: boolean;
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
  requestId: string;
  companyId: string;
  price: number;
  priceUnit: string;
  comment: string;
  deliveryIncluded: boolean;
  deliveryPrice?: number;
  validUntil: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
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
export interface SearchResult {
  company: Company;
  products: Product[];
  priceFrom: number;
  priceUnit: string;
  relevanceScore: number;
}

export interface SearchResponse {
  parsed: ParsedQuery;
  results: SearchResult[];
  totalResults: number;
}
