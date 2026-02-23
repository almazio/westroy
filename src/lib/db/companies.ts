import { prisma } from '../db';
import { Company, Product } from '../types';
import { mapCompany, mapProduct } from './mappers';

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
        const companies = await prisma.company.findMany();
        const mapped = companies.map(mapCompany);
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
    if (isCacheValid(productsCache)) return productsCache.data;
    const products = await prisma.product.findMany();
    const mapped = products.map(mapProduct);
    productsCache = { data: mapped, expiresAt: Date.now() + CACHE_TTL_MS };
    return mapped;
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
            orderBy: { priceFrom: 'asc' },
        });
        return products.map(mapProduct);
    } catch (error) {
        if (hasConfiguredDatabaseUrl()) throw error;
        console.warn('[DB] searchProductsByText fallback (no DB url):', error);
        return [];
    }
}
