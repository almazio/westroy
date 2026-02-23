// ============================================
// WESTROY — DB Type Mappers
// ============================================

import { Region, Category, Company, Product, User, Request, Offer } from '../types';

// --- DB Record types ---

export type CategoryDbRecord = Omit<Category, 'keywords'> & { keywords: string };

export type CompanyDbRecord = {
    id: string;
    name: string;
    description: string;
    categoryId: string;
    regionId: string;
    address: string;
    phone: string;
    delivery: boolean;
    verified: boolean;
    logoUrl: string | null;
    createdAt: Date;
};

export type ProductDbRecord = {
    id: string;
    companyId: string;
    categoryId: string;
    name: string;
    description: string;
    unit: string;
    priceFrom: number;
    priceUnit: string;
    inStock: boolean;
    createdAt: Date;
    updatedAt: Date;
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
    categoryId: string;
    query: string;
    parsedCategory: string;
    parsedVolume: string | null;
    parsedCity: string;
    deliveryNeeded: boolean;
    address: string | null;
    deadline: string | null;
    status: string;
    createdAt: Date;
};

export type OfferDbRecord = {
    id: string;
    requestId: string;
    companyId: string;
    price: number;
    priceUnit: string;
    comment: string;
    deliveryIncluded: boolean;
    deliveryPrice: number | null;
    validUntil: string;
    status: string;
    createdAt: Date;
};

// --- Mappers ---

export const mapRegion = (r: Region): Region => r;

export const mapCategory = (c: CategoryDbRecord): Category => {
    let keywords: string[] = [];
    try {
        keywords = JSON.parse(c.keywords);
    } catch {
        keywords = c.keywords ? c.keywords.split(',').map((k: string) => k.trim()) : [];
    }
    return { ...c, keywords };
};

export const mapCompany = (c: CompanyDbRecord): Company => ({
    ...c,
    logoUrl: c.logoUrl || undefined,
    createdAt: c.createdAt.toISOString(),
});

export const mapProduct = (p: ProductDbRecord): Product => ({
    id: p.id,
    companyId: p.companyId,
    categoryId: p.categoryId,
    name: p.name,
    description: p.description,
    unit: p.unit,
    priceFrom: p.priceFrom,
    priceUnit: p.priceUnit,
    inStock: p.inStock,
    updatedAt: p.updatedAt.toISOString(),
});

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
    categoryId: r.categoryId,
    query: r.query,
    parsedCategory: r.parsedCategory,
    parsedVolume: r.parsedVolume || undefined,
    parsedCity: r.parsedCity,
    deliveryNeeded: r.deliveryNeeded,
    address: r.address || undefined,
    deadline: r.deadline || undefined,
    status: r.status as Request['status'],
    createdAt: r.createdAt.toISOString(),
});

export const mapOffer = (o: OfferDbRecord): Offer => ({
    id: o.id,
    requestId: o.requestId,
    companyId: o.companyId,
    price: o.price,
    priceUnit: o.priceUnit,
    comment: o.comment,
    deliveryIncluded: o.deliveryIncluded,
    deliveryPrice: o.deliveryPrice ?? undefined,
    validUntil: o.validUntil,
    status: o.status as Offer['status'],
    createdAt: o.createdAt.toISOString(),
});
