// ============================================
// WESTROY — Search Engine
// ============================================

import { ParsedQuery, SearchFilters, SearchResult, SearchResponse } from './types';
import {
    getCompanies,
    getProducts,
    getProductsByCategory,
    getCompanyMarketStats
} from './db';

function normalizeText(text: string): string {
    return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

const SEARCH_STOP_TOKENS = new Set([
    'шымкент',
    'шимкент',
    'туркестан',
    'казахстан',
    'нужно',
    'купить',
    'заказать',
    'цена',
    'цены',
    'доставка',
    'с',
    'в',
    'на',
    'и',
]);

function priceForSort(value: number): number {
    return value > 0 ? value : Number.MAX_SAFE_INTEGER;
}

function applyProductFilters(
    products: Awaited<ReturnType<typeof getProducts>>,
    filters: SearchFilters,
    companyId?: string
) {
    const brandNeedle = filters.brand?.trim().toLowerCase();
    return products.filter((product) => {
        let relevantOffers = product.offers || [];
        if (companyId) {
            relevantOffers = relevantOffers.filter(o => o.companyId === companyId);
        }
        if (relevantOffers.length === 0) return false;

        if (filters.inStockOnly && !relevantOffers.some(o => o.stockStatus === 'IN_STOCK')) return false;
        if (filters.withImageOnly && !product.imageUrl) return false;
        if (filters.withArticleOnly && !product.article) return false;
        if (brandNeedle && !(product.brand || '').toLowerCase().includes(brandNeedle)) return false;
        return true;
    });
}

function buildResult({
    company,
    products,
    grade,
    delivery,
    companyStats,
}: {
    company: Awaited<ReturnType<typeof getCompanies>>[number];
    products: Awaited<ReturnType<typeof getProducts>>;
    grade: string | null;
    delivery: boolean | null;
    companyStats: Awaited<ReturnType<typeof getCompanyMarketStats>>;
}): SearchResult {
    let relevanceScore = 0.5;
    let matchedProducts = products;

    if (grade) {
        const gradeNormalized = grade.toLowerCase();
        const gradeProducts = products.filter((p) =>
            p.name.toLowerCase().includes(gradeNormalized) ||
            (p.description || '').toLowerCase().includes(gradeNormalized)
        );
        if (gradeProducts.length > 0) {
            matchedProducts = gradeProducts;
            relevanceScore += 0.3;
        }
    }

    if (delivery && company.delivery) relevanceScore += 0.1;
    if (company.verified) relevanceScore += 0.1;

    const companyProducts = matchedProducts.map(p => {
        const offer = p.offers?.find(o => o.companyId === company.id);
        return { p, offer };
    }).filter(pair => pair.offer);

    const minPricedPair = companyProducts
        .filter(pair => pair.offer!.price > 0)
        .sort((a, b) => a.offer!.price - b.offer!.price)[0];

    return {
        company,
        products: matchedProducts,
        priceFrom: minPricedPair?.offer?.price ?? 0,
        priceUnit: minPricedPair?.offer?.priceUnit ?? (companyProducts[0]?.offer?.priceUnit || ''),
        relevanceScore: Math.min(relevanceScore, 1),
        stats: companyStats[company.id],
    };
}

function sortResults(results: SearchResult[]) {
    results.sort((a, b) => {
        if (Math.abs(a.relevanceScore - b.relevanceScore) > 0.1) {
            return b.relevanceScore - a.relevanceScore;
        }
        return priceForSort(a.priceFrom) - priceForSort(b.priceFrom);
    });
}

async function searchByCategory(parsed: ParsedQuery): Promise<SearchResult[]> {
    if (!parsed.categoryId) return [];

    const categoryProducts = await getProductsByCategory(parsed.categoryId);
    if (categoryProducts.length === 0) return [];

    const companyIds = [...new Set(categoryProducts.flatMap((product) => (product.offers || []).map(o => o.companyId)))];
    const companies = (await getCompanies()).filter((company) => companyIds.includes(company.id));
    const companyStats = await getCompanyMarketStats(companyIds);

    const results = companies
        .map((company) =>
            buildResult({
                company,
                products: categoryProducts.filter((p) => (p.offers || []).some(o => o.companyId === company.id)),
                grade: parsed.grade,
                delivery: parsed.delivery,
                companyStats,
            })
        )
        .filter((result) => result.products.length > 0);

    sortResults(results);
    return results;
}

async function searchByCategoryWithFilters(parsed: ParsedQuery, filters: SearchFilters): Promise<SearchResult[]> {
    if (!parsed.categoryId) return [];

    const categoryProducts = applyProductFilters(await getProductsByCategory(parsed.categoryId), filters);
    if (categoryProducts.length === 0) return [];

    const companyIds = [...new Set(categoryProducts.flatMap((product) => (product.offers || []).map(o => o.companyId)))];
    const companies = (await getCompanies()).filter((company) => companyIds.includes(company.id));
    const companyStats = await getCompanyMarketStats(companyIds);

    const results = companies
        .map((company) =>
            buildResult({
                company,
                products: categoryProducts.filter((p) => (p.offers || []).some(o => o.companyId === company.id)),
                grade: parsed.grade,
                delivery: parsed.delivery,
                companyStats,
            })
        )
        .filter((result) => result.products.length > 0);

    sortResults(results);
    return results;
}

async function searchByText(parsed: ParsedQuery, filters: SearchFilters): Promise<SearchResult[]> {
    const query = normalizeText(parsed.originalQuery || '');
    if (!query) return [];

    const tokens = query
        .split(' ')
        .map((t) => t.trim())
        .filter((t) => t.length >= 2 && !SEARCH_STOP_TOKENS.has(t));
    if (tokens.length === 0) return [];

    const [companies, rawProducts] = await Promise.all([getCompanies(), getProducts()]);
    const products = applyProductFilters(rawProducts, filters);
    const companyStats = await getCompanyMarketStats(companies.map((company) => company.id));

    const productMatches = products.filter((product) => {
        const haystack = normalizeText(`${product.name} ${product.description}`);
        return tokens.some((token) => haystack.includes(token));
    });

    const companyMatches = companies.filter((company) => {
        const haystack = normalizeText(`${company.name} ${company.description}`);
        return tokens.some((token) => haystack.includes(token));
    });

    const matchedCompanyIds = new Set<string>([
        ...productMatches.flatMap((p) => (p.offers || []).map(o => o.companyId)),
        ...companyMatches.map((c) => c.id),
    ]);

    const results: SearchResult[] = [];
    for (const company of companies) {
        if (!matchedCompanyIds.has(company.id)) continue;
        const productsForCompany = productMatches.filter((p) => (p.offers || []).some(o => o.companyId === company.id));
        const fallbackProducts = productsForCompany.length > 0
            ? productsForCompany
            : products.filter((p) => (p.offers || []).some(o => o.companyId === company.id)).slice(0, 6);

        const result = buildResult({
            company,
            products: fallbackProducts,
            grade: parsed.grade,
            delivery: parsed.delivery,
            companyStats,
        });

        if (companyMatches.some((c) => c.id === company.id)) {
            result.relevanceScore = Math.min(1, result.relevanceScore + 0.2);
        }
        if (productsForCompany.length > 0) {
            result.relevanceScore = Math.min(1, result.relevanceScore + 0.2);
        }

        results.push(result);
    }

    sortResults(results);
    return results;
}

export async function search(parsed: ParsedQuery, filters: SearchFilters = {}): Promise<SearchResponse> {
    let results = await searchByCategoryWithFilters(parsed, filters);
    if (results.length === 0) {
        results = await searchByCategory(parsed);
    }
    if (results.length === 0) {
        results = await searchByText(parsed, filters);
    }

    return {
        parsed,
        results,
        totalResults: results.length,
    };
}
