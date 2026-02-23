import { prisma } from '../db';
import { Company, Product } from '../types';
import { mapCompany, mapProduct } from './mappers';

function hasConfiguredDatabaseUrl() {
    return Boolean(process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL);
}

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
