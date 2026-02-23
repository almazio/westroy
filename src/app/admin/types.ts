// ============================================
// WESTROY — Admin Panel Shared Types
// ============================================

export interface CategoryRef {
    id: string;
    nameRu: string;
    icon: string;
}

export interface CompanyData {
    id: string;
    name: string;
    description: string;
    categoryId: string;
    verified: boolean;
    delivery: boolean;
    phone: string;
    address: string;
    createdAt?: string;
    updatedAt?: string;
    _count?: {
        products: number;
        offers: number;
    };
}

export interface RequestData {
    id: string;
    query: string;
    parsedCategory: string;
    status: string;
    createdAt: string;
    offerCount: number;
}

export interface OfferData {
    id: string;
    status: 'pending' | 'accepted' | 'rejected';
}

export interface UserData {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: 'client' | 'producer' | 'admin';
    createdAt: string;
    company?: { id: string; name: string } | null;
    _count?: { requests: number };
}

export interface PartnerApplicationData {
    id: string;
    name: string;
    email: string;
    phone: string;
    companyName: string;
    category: string;
    city: string;
    message: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
}

export interface CatalogQualityData {
    totals: {
        products: number;
        companies: number;
        companiesWithoutProducts: number;
    };
    quality: {
        missingDescription: number;
        missingPriceUnit: number;
        invalidPrice: number;
        invalidUnit: number;
        staleProducts: number;
        outOfStock: number;
    };
    staleDays: number;
    samples: {
        companiesWithoutProducts: Array<{ id: string; name: string }>;
    };
}

export interface IntegrationSyncLog {
    id: string;
    createdAt: string;
    source: string;
    companyId: string;
    totalReceived: number;
    created: number;
    updated: number;
    skipped: number;
    errors: string[];
}

export function formatDate(date: string) {
    return new Date(date).toLocaleDateString('ru-RU');
}

export const requestStatusLabels: Record<string, string> = {
    active: '🟢 Активна',
    in_progress: '🟡 В работе',
    completed: '🔵 Завершена',
    cancelled: '⚫ Отменена',
};
