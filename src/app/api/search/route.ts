import { NextRequest, NextResponse } from 'next/server';
import { parseQueryRegex } from '@/lib/ai-parser';
import { parseQueryLLM } from '@/lib/llm-parser';
import { search } from '@/lib/search';
import { CATEGORY_LABELS } from '@/lib/constants';
import { getCategoryById } from '@/lib/db';
import type { ParsedQuery, SearchFilters, Category } from '@/lib/types';

const LLM_TIMEOUT_MS = 1500;

/**
 * Regex-first strategy:
 * 1. Parse with regex instantly → start search immediately
 * 2. In parallel, run LLM parser with timeout
 * 3. If LLM returns a DIFFERENT categoryId, re-search with LLM results
 * 4. Otherwise, enrich regex results with LLM data (grade, city)
 */
async function parseSmartWithRegexFirst(query: string): Promise<ParsedQuery> {
    if (!query.trim()) {
        return parseQueryRegex(query);
    }

    const regexParsed = parseQueryRegex(query);

    // If regex is confident, use it but try to enrich with LLM
    const llmPromise = Promise.race([
        parseQueryLLM(query).catch(() => null),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), LLM_TIMEOUT_MS)),
    ]);

    const llmParsed = await llmPromise;

    if (!llmParsed) {
        // LLM timed out or failed — regex is good enough
        return regexParsed;
    }

    // Regex categoryId takes priority (it's rule-based, more predictable)
    if (regexParsed.categoryId) {
        return {
            ...regexParsed,
            grade: llmParsed.grade || regexParsed.grade,
            city: llmParsed.city || regexParsed.city,
            delivery: llmParsed.delivery ?? regexParsed.delivery,
            confidence: Math.max(regexParsed.confidence, llmParsed.confidence),
        };
    }

    // Regex couldn't detect category but LLM did
    if (llmParsed.categoryId) {
        return llmParsed;
    }

    return regexParsed;
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const categoryId = searchParams.get('category') || undefined;
    const filters: SearchFilters = {
        inStockOnly: searchParams.get('inStock') === 'true',
        withImageOnly: searchParams.get('withImage') === 'true',
        withArticleOnly: searchParams.get('withArticle') === 'true',
        brand: searchParams.get('brand') || undefined,
    };

    if (!q && !categoryId) {
        return NextResponse.json({ error: 'Query parameter "q" or "category" is required' }, { status: 400 });
    }

    const isCategoryBrowse = Boolean(categoryId && !q.trim());
    let parsed = isCategoryBrowse
        ? {
            category: categoryId ? (CATEGORY_LABELS[categoryId] || categoryId) : null,
            categoryId: categoryId || null,
            volume: null,
            unit: null,
            city: 'Шымкент',
            delivery: null,
            grade: null,
            confidence: 1,
            suggestions: [],
            originalQuery: '',
        }
        : await parseSmartWithRegexFirst(q);

    // Override category if explicitly provided
    if (categoryId) {
        parsed = { ...parsed, categoryId, category: CATEGORY_LABELS[categoryId] || categoryId };
    }

    // Search
    const searchResponse = await search(parsed, filters);

    // Fetch subcategories if browsing by a specific category
    let subCategories: Category[] = [];
    if (parsed.categoryId) {
        const cat = await getCategoryById(parsed.categoryId);
        if (cat?.children && cat.children.length > 0) {
            subCategories = cat.children;
        }
    }

    return NextResponse.json({
        ...searchResponse,
        subCategories,
    });
}

