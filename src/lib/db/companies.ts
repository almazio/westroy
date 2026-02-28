import { prisma } from '../db';
import { Company, Product } from '../types';
import { mapCompany, mapProduct, CompanyDbRecord, ProductDbRecord } from './mappers';

function hasConfiguredDatabaseUrl() {
    return Boolean(process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL);
}

// ---- In-memory cache (TTL 5 min) ----

interface CacheEntry<T> {
    data: T;
    expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
let companiesCache: CacheEntry<Company[]> | null = null;
let productsCache: CacheEntry<Product[]> | null = null;

function isCacheValid<T>(entry: CacheEntry<T> | null): entry is CacheEntry<T> {
    return entry !== null && Date.now() < entry.expiresAt;
}

export async function getCompanies(): Promise<Company[]> {
    if (isCacheValid(companiesCache)) return companiesCache.data;
    try {
        const companies = await prisma.company.findMany({
            include: { categories: true }
        });
        const mapped = (companies as any[]).map(mapCompany);
        companiesCache = { data: mapped, expiresAt: Date.now() + CACHE_TTL_MS };
        return mapped;
    } catch (error) {
        if (hasConfiguredDatabaseUrl()) throw error;
        console.warn('[DB] getCompanies fallback (no DB url):', error);
        return [];
    }
}

export async function getCompanyById(id: string): Promise<Company | undefined> {
    try {
        const company = await prisma.company.findUnique({
            where: { id },
            include: { categories: true }
        });
        return company ? mapCompany(company as unknown as CompanyDbRecord) : undefined;
    } catch (error) {
        if (hasConfiguredDatabaseUrl()) throw error;
        console.warn('[DB] getCompanyById fallback (no DB url):', error);
        return undefined;
    }
}

export async function getCompaniesByCategory(categoryId: string): Promise<Company[]> {
    const companies = await prisma.company.findMany({
        where: { categories: { some: { categoryId } } },
        include: { categories: true }
    });
    return (companies as any[]).map(mapCompany);
}

// Products
export async function getProducts(): Promise<Product[]> {
    if (isCacheValid(productsCache)) return productsCache.data;
    const products = await prisma.product.findMany({
        include: { offers: true }
    });
    const mapped = products.map(p => mapProduct(p as any));
    productsCache = { data: mapped, expiresAt: Date.now() + CACHE_TTL_MS };
    return mapped;
}

export async function getProductsByCompany(companyId: string): Promise<Product[]> {
    try {
        const products = await prisma.product.findMany({
            where: { offers: { some: { companyId } } },
            include: { offers: { where: { companyId } } }
        });
        return products.map(p => mapProduct(p as unknown as ProductDbRecord));
    } catch (error) {
        if (hasConfiguredDatabaseUrl()) throw error;
        console.warn('[DB] getProductsByCompany fallback (no DB url):', error);
        return [];
    }
}

export async function getProductsByCategory(categoryId: string): Promise<Product[]> {
    // Получаем все категории, чтобы рекурсивно найти все дочерние
    const allCategories = await prisma.category.findMany({
        select: { id: true, parentId: true }
    });

    const descendantIds = new Set<string>();
    descendantIds.add(categoryId);

    let added = true;
    while (added) {
        added = false;
        for (const cat of allCategories as any[]) {
            if (cat.parentId && descendantIds.has(cat.parentId) && !descendantIds.has(cat.id)) {
                descendantIds.add(cat.id);
                added = true;
            }
        }
    }

    const categoryIds = Array.from(descendantIds);

    const products = await prisma.product.findMany({
        where: { categoryId: { in: categoryIds } },
        include: { offers: true }
    });
    return products.map(p => mapProduct(p as any));
}

// ---- Fast product search for suggestions ----

export async function searchProductsByText(query: string, limit: number = 8): Promise<Product[]> {
    if (!query.trim()) return [];
    try {
        const products = await prisma.product.findMany({
            where: {
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { brand: { contains: query, mode: 'insensitive' } },
                    { article: { contains: query, mode: 'insensitive' } },
                ],
            },
            take: limit,
            include: { offers: true }
        });

        // Custom sort by virtual lowest price logic locally due to JSON/Relation complexities
        const mapped = products.map(p => mapProduct(p as unknown as ProductDbRecord));
        return mapped.sort((a, b) => {
            const minA = a.offers?.length ? Math.min(...a.offers.map(o => o.price)) : Infinity;
            const minB = b.offers?.length ? Math.min(...b.offers.map(o => o.price)) : Infinity;
            return minA - minB;
        });
    } catch (error) {
        if (hasConfiguredDatabaseUrl()) throw error;
        console.warn('[DB] searchProductsByText fallback (no DB url):', error);
        return [];
    }
}

export async function getProductById(id: string): Promise<Product | null> {
    const product = await prisma.product.findUnique({
        where: { id },
        include: { offers: { include: { company: true } } }
    });
    return product ? mapProduct(product as any) : null;
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
    const product = await prisma.product.findFirst({
        where: {
            OR: [
                { slug: slug },
                { article: slug },
            ]
        },
        include: { offers: { include: { company: true } } }
    });
    return product ? mapProduct(product as any) : null;
}
