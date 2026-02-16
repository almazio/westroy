// ============================================
// WESTROY — Search Engine
// ============================================

import { ParsedQuery, SearchResult, SearchResponse } from './types';
import { getCompaniesByCategory, getProductsByCategory, getProductsByCompany, getCompanies } from './db';

export async function search(parsed: ParsedQuery): Promise<SearchResponse> {
    const { categoryId, grade, delivery } = parsed;

    if (!categoryId) {
        // No category found — return all companies with basic scoring
        const allCompanies = await getCompanies();
        const results: SearchResult[] = await Promise.all(allCompanies.map(async company => {
            const products = await getProductsByCompany(company.id);
            const minPrice = products.length > 0 ? Math.min(...products.map(p => p.priceFrom)) : 0;
            const priceUnit = products.length > 0 ? products[0].priceUnit : '';
            return {
                company,
                products,
                priceFrom: minPrice,
                priceUnit,
                relevanceScore: 0.3,
            };
        }));

        return {
            parsed,
            results: results.sort((a, b) => b.relevanceScore - a.relevanceScore),
            totalResults: results.length,
        };
    }

    // Get companies and products for the category
    const companies = await getCompaniesByCategory(categoryId);
    const categoryProducts = await getProductsByCategory(categoryId);

    const results: SearchResult[] = companies.map(company => {
        const companyProducts = categoryProducts.filter(p => p.companyId === company.id);
        let relevanceScore = 0.5; // Base score for category match

        // Filter/rank by grade if provided
        let matchedProducts = companyProducts;
        if (grade) {
            const gradeProducts = companyProducts.filter(p =>
                p.name.toLowerCase().includes(grade.toLowerCase()) ||
                p.description.toLowerCase().includes(grade.toLowerCase())
            );
            if (gradeProducts.length > 0) {
                matchedProducts = gradeProducts;
                relevanceScore += 0.3;
            }
        }

        // Boost for delivery
        if (delivery && company.delivery) {
            relevanceScore += 0.1;
        }

        // Boost for verified
        if (company.verified) {
            relevanceScore += 0.1;
        }

        // Get minimum price
        const priceFrom = matchedProducts.length > 0
            ? Math.min(...matchedProducts.map(p => p.priceFrom))
            : 0;
        const priceUnit = matchedProducts.length > 0 ? matchedProducts[0].priceUnit : '';

        return {
            company,
            products: matchedProducts,
            priceFrom,
            priceUnit,
            relevanceScore: Math.min(relevanceScore, 1),
        };
    });

    // Sort by relevance, then by price
    results.sort((a, b) => {
        if (Math.abs(a.relevanceScore - b.relevanceScore) > 0.1) {
            return b.relevanceScore - a.relevanceScore;
        }
        return a.priceFrom - b.priceFrom;
    });

    return {
        parsed,
        results,
        totalResults: results.length,
    };
}
