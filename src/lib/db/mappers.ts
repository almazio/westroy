// ============================================
// WESTROY — DB Type Mappers
// ============================================

import { Region, Category, Company, Product, User, Request, Offer } from '../types';

// --- DB Record types ---

export type CategoryDbRecord = Omit<Category, 'keywords' | 'children'> & { keywords: unknown, children?: CategoryDbRecord[] };

export type CompanyDbRecord = {
    id: string;
    name: string;
    description: string | null;
    address: string | null;
    phone: string | null;
    delivery: boolean;
    verified: boolean;
    logoUrl: string | null;
    baseCityId: string | null;
    deliveryRegions: unknown;
    ownerId: string | null;
    createdAt: Date;
};

export type OfferDbRecord = {
    id: string;
    productId: string | null;
    companyId: string;
    price: number;
    priceUnit: string;
    oldPrice: number | null;
    discountLabel: string | null;
    minOrder: number | null;
    stockStatus: string;
    leadTime: string | null;
    deliveryPrice: number | null;
    requestId: string | null;
    createdAt: Date;
    updatedAt: Date;
};

export type ProductDbRecord = {
    id: string;
    categoryId: string;
    name: string;
    description: string | null;
    slug: string | null;
    article: string | null;
    brand: string | null;
    imageUrl: string | null;
    additionalImages: unknown;
    technicalSpecs: unknown;
    marketingFeatures: unknown;
    tags: unknown;
    createdAt: Date;
    updatedAt: Date;
    offers?: OfferDbRecord[];
};

export type UserDbRecord = {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    createdAt: Date;
};

export type RequestDbRecord = {
    id: string;
    userId: string;
    categoryId: string | null;
    query: string;
    parsedCategory: string | null;
    parsedVolume: string | null;
    parsedCity: string | null;
    deliveryNeeded: boolean | null;
    address: string | null;
    deadline: string | null;
    status: string;
    createdAt: Date;
};

// --- Mappers ---

export const mapRegion = (r: Region): Region => r;

export const mapCategory = (c: CategoryDbRecord): Category => {
    let keywords: string[] = [];
    if (Array.isArray(c.keywords)) {
        keywords = c.keywords as string[];
    } else if (typeof c.keywords === 'string') {
        try {
            keywords = JSON.parse(c.keywords);
        } catch {
            keywords = c.keywords.split(',').map((k: string) => k.trim());
        }
    }

    return {
        ...c,
        keywords,
        parentId: c.parentId || null,
        description: (c as any).description || undefined,
        slug: (c as any).slug || undefined,
        icon: c.icon || undefined,
        children: c.children ? c.children.map(mapCategory) : undefined
    };
};

export const mapCompany = (c: CompanyDbRecord): Company => {
    let deliveryRegions: string[] | undefined;
    if (Array.isArray(c.deliveryRegions)) {
        deliveryRegions = c.deliveryRegions as string[];
    }

    return {
        ...c,
        description: c.description || undefined,
        address: c.address || undefined,
        phone: c.phone || undefined,
        logoUrl: c.logoUrl || undefined,
        baseCityId: c.baseCityId || undefined,
        ownerId: c.ownerId || undefined,
        deliveryRegions,
        createdAt: c.createdAt.toISOString(),
    };
};

function safeJsonObject(raw: unknown): Record<string, unknown> | undefined {
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        return raw as Record<string, unknown>;
    }
    return undefined;
}

function safeJsonArray(raw: unknown): string[] | undefined {
    if (Array.isArray(raw)) {
        return raw.filter(item => typeof item === 'string');
    }
    return undefined;
}

export const mapOffer = (o: OfferDbRecord): Offer => ({
    ...o,
    productId: o.productId || undefined,
    oldPrice: o.oldPrice || undefined,
    discountLabel: o.discountLabel || undefined,
    minOrder: o.minOrder || undefined,
    leadTime: o.leadTime || undefined,
    deliveryPrice: o.deliveryPrice ?? undefined,
    requestId: o.requestId || undefined,
    stockStatus: o.stockStatus as Offer['stockStatus'],
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt ? o.updatedAt.toISOString() : undefined,
});

export const mapProduct = (p: ProductDbRecord): Product => {
    const offers = p.offers ? p.offers.map(mapOffer) : undefined;

    return {
        id: p.id,
        categoryId: p.categoryId,
        name: p.name,
        slug: p.slug || undefined,
        description: p.description || undefined,
        article: p.article || undefined,
        brand: p.brand || undefined,
        imageUrl: p.imageUrl || undefined,
        additionalImages: safeJsonArray(p.additionalImages),
        technicalSpecs: safeJsonObject(p.technicalSpecs),
        marketingFeatures: safeJsonObject(p.marketingFeatures),
        tags: safeJsonArray(p.tags),
        offers,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
    };
};

export const mapUser = (u: UserDbRecord): User => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role as User['role'],
});

export const mapRequest = (r: RequestDbRecord): Request => ({
    id: r.id,
    userId: r.userId,
    categoryId: r.categoryId || '',
    query: r.query,
    parsedCategory: r.parsedCategory || '',
    parsedVolume: r.parsedVolume || undefined,
    parsedCity: r.parsedCity || '',
    deliveryNeeded: Boolean(r.deliveryNeeded),
    address: r.address || undefined,
    deadline: r.deadline || undefined,
    status: r.status as Request['status'],
    createdAt: r.createdAt.toISOString(),
});
