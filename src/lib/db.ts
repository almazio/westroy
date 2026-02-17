
import { PrismaClient } from '@prisma/client';
import { Region, Category, Company, Product, User, Request, Offer } from './types';

// Compatibility bridge:
// - Vercel Supabase integration exposes POSTGRES_PRISMA_URL / POSTGRES_URL_NON_POOLING
// - local setups often use DATABASE_URL / DIRECT_URL
if (!process.env.POSTGRES_PRISMA_URL && process.env.DATABASE_URL) {
    process.env.POSTGRES_PRISMA_URL = process.env.DATABASE_URL;
}
if (!process.env.POSTGRES_URL_NON_POOLING && process.env.DIRECT_URL) {
    process.env.POSTGRES_URL_NON_POOLING = process.env.DIRECT_URL;
}

// Prisma Client Singleton for Next.js dev HMR
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// ============================================
// Data Access Layer (Prisma)
// ============================================

type CategoryDbRecord = Omit<Category, 'keywords'> & { keywords: string };
type CompanyDbRecord = {
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
type ProductDbRecord = {
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
type UserDbRecord = {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    createdAt: Date;
};
type RequestDbRecord = {
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
type OfferDbRecord = {
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

// Helpers for type mapping
const mapRegion = (r: Region): Region => r;

const mapCategory = (c: CategoryDbRecord): Category => {
    let keywords: string[] = [];
    try {
        keywords = JSON.parse(c.keywords);
    } catch {
        // Fallback to comma-separated if not JSON
        keywords = c.keywords ? c.keywords.split(',').map((k: string) => k.trim()) : [];
    }
    return {
        ...c,
        keywords,
    };
};

const mapCompany = (c: CompanyDbRecord): Company => ({
    ...c,
    logoUrl: c.logoUrl || undefined,
    createdAt: c.createdAt.toISOString(),
    // Remove extra fields if strict
});

const mapProduct = (p: ProductDbRecord): Product => {
    return {
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
    };
};

const mapUser = (u: UserDbRecord): User => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: (u.role as User['role']),
});

const mapRequest = (r: RequestDbRecord): Request => ({
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

const mapOffer = (o: OfferDbRecord): Offer => ({
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

function hasConfiguredDatabaseUrl() {
    return Boolean(process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL);
}

// ---- PUBLIC API ----

// Regions
export async function getRegions(): Promise<Region[]> {
    const regions = await prisma.region.findMany();
    return regions.map(mapRegion);
}

// Categories
export async function getCategories(): Promise<Category[]> {
    try {
        const categories = await prisma.category.findMany();
        return categories.map(mapCategory);
    } catch (error) {
        if (!hasConfiguredDatabaseUrl()) {
            console.warn('[DB] getCategories fallback (no DB url):', error);
            return [
                { id: 'concrete', name: 'concrete', nameRu: 'Бетон', icon: '🧱', keywords: ['бетон', 'м300'] },
                { id: 'rebar', name: 'rebar', nameRu: 'Арматура', icon: '🔩', keywords: ['арматура', 'a500'] },
                { id: 'aggregates', name: 'aggregates', nameRu: 'Инертные', icon: '⛰️', keywords: ['щебень', 'песок'] },
                { id: 'blocks', name: 'blocks', nameRu: 'Блоки и кирпич', icon: '🧱', keywords: ['блок', 'кирпич'] },
            ];
        }
        throw error;
    }
}

export async function getCategoryById(id: string): Promise<Category | undefined> {
    try {
        const category = await prisma.category.findUnique({ where: { id } });
        return category ? mapCategory(category) : undefined;
    } catch (error) {
        if (hasConfiguredDatabaseUrl()) throw error;
        console.warn('[DB] getCategoryById fallback (no DB url):', error);
        return (await getCategories()).find((c) => c.id === id);
    }
}

// Companies
export async function getCompanies(): Promise<Company[]> {
    try {
        const companies = await prisma.company.findMany();
        return companies.map(mapCompany);
    } catch (error) {
        if (hasConfiguredDatabaseUrl()) throw error;
        console.warn('[DB] getCompanies fallback (no DB url):', error);
        return [];
    }
}

export async function getCompanyById(id: string): Promise<Company | undefined> {
    try {
        const company = await prisma.company.findUnique({ where: { id } });
        return company ? mapCompany(company) : undefined;
    } catch (error) {
        if (hasConfiguredDatabaseUrl()) throw error;
        console.warn('[DB] getCompanyById fallback (no DB url):', error);
        return undefined;
    }
}

export async function getCompaniesByCategory(categoryId: string): Promise<Company[]> {
    const companies = await prisma.company.findMany({ where: { categoryId } });
    return companies.map(mapCompany);
}

// Products
export async function getProducts(): Promise<Product[]> {
    const products = await prisma.product.findMany();
    return products.map(mapProduct);
}

export async function getProductsByCompany(companyId: string): Promise<Product[]> {
    try {
        const products = await prisma.product.findMany({ where: { companyId } });
        return products.map(mapProduct);
    } catch (error) {
        if (hasConfiguredDatabaseUrl()) throw error;
        console.warn('[DB] getProductsByCompany fallback (no DB url):', error);
        return [];
    }
}

export async function getProductsByCategory(categoryId: string): Promise<Product[]> {
    const products = await prisma.product.findMany({ where: { categoryId } });
    return products.map(mapProduct);
}

// Users
export async function getUsers(): Promise<User[]> {
    const users = await prisma.user.findMany();
    return users.map(mapUser);
}

export async function getUserById(id: string): Promise<User | undefined> {
    const user = await prisma.user.findUnique({ where: { id } });
    return user ? mapUser(user) : undefined;
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
    const user = await prisma.user.findUnique({ where: { email } });
    return user ? mapUser(user) : undefined;
}

// Requests
export async function getRequests(): Promise<Request[]> {
    const requests = await prisma.request.findMany();
    return requests.map(mapRequest);
}

export async function getRequestById(id: string): Promise<Request | undefined> {
    const request = await prisma.request.findUnique({ where: { id } });
    return request ? mapRequest(request) : undefined;
}

export async function getRequestsByUser(userId: string): Promise<Request[]> {
    const requests = await prisma.request.findMany({ where: { userId } });
    return requests.map(mapRequest);
}

export async function getRequestsByCategory(categoryId: string): Promise<Request[]> {
    const requests = await prisma.request.findMany({ where: { categoryId } });
    return requests.map(mapRequest);
}

export async function addRequest(data: Request): Promise<Request> {
    const request = await prisma.request.create({
        data: {
            id: data.id,
            userId: data.userId,
            categoryId: data.categoryId,
            query: data.query,
            parsedCategory: data.parsedCategory,
            parsedVolume: data.parsedVolume || null,
            parsedCity: data.parsedCity,
            deliveryNeeded: data.deliveryNeeded,
            address: data.address || null,
            deadline: data.deadline || null,
            status: data.status,
            createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
        },
    });
    return mapRequest(request as unknown as RequestDbRecord);
}

// Offers
export async function getOffers(): Promise<Offer[]> {
    const offers = await prisma.offer.findMany();
    return offers.map(mapOffer);
}

export async function getOffersByRequest(requestId: string): Promise<Offer[]> {
    const offers = await prisma.offer.findMany({ where: { requestId } });
    return offers.map(mapOffer);
}

export async function getOffersByCompany(companyId: string): Promise<Offer[]> {
    const offers = await prisma.offer.findMany({ where: { companyId } });
    return offers.map(mapOffer);
}

export async function addOffer(data: Offer): Promise<Offer> {
    const offer = await prisma.offer.create({
        data: {
            id: data.id,
            requestId: data.requestId,
            companyId: data.companyId,
            price: data.price,
            priceUnit: data.priceUnit,
            comment: data.comment,
            deliveryIncluded: data.deliveryIncluded,
            deliveryPrice: data.deliveryPrice ?? null,
            validUntil: data.validUntil,
            status: data.status,
            createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
        },
    });
    return mapOffer(offer as unknown as OfferDbRecord);
}

export async function getCompanyMarketStats(
    companyIds: string[]
): Promise<Record<string, { completedOrders: number; avgResponseMinutes: number | null }>> {
    if (companyIds.length === 0) return {};

    const offers = await prisma.offer.findMany({
        where: { companyId: { in: companyIds } },
        select: {
            companyId: true,
            status: true,
            createdAt: true,
            request: {
                select: {
                    createdAt: true,
                },
            },
        },
    });

    const stats: Record<string, { completedOrders: number; totalResponseMinutes: number; responseCount: number }> = {};
    for (const companyId of companyIds) {
        stats[companyId] = { completedOrders: 0, totalResponseMinutes: 0, responseCount: 0 };
    }

    for (const offer of offers) {
        const bucket = stats[offer.companyId];
        if (!bucket) continue;

        if (offer.status === 'accepted') {
            bucket.completedOrders += 1;
        }

        const requestCreatedAt = offer.request?.createdAt;
        if (requestCreatedAt) {
            const responseMinutes = Math.max(
                0,
                Math.round((offer.createdAt.getTime() - requestCreatedAt.getTime()) / (1000 * 60))
            );
            bucket.totalResponseMinutes += responseMinutes;
            bucket.responseCount += 1;
        }
    }

    const result: Record<string, { completedOrders: number; avgResponseMinutes: number | null }> = {};
    for (const [companyId, value] of Object.entries(stats)) {
        result[companyId] = {
            completedOrders: value.completedOrders,
            avgResponseMinutes: value.responseCount > 0
                ? Math.round(value.totalResponseMinutes / value.responseCount)
                : null,
        };
    }

    return result;
}
