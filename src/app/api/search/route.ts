import { NextRequest, NextResponse } from 'next/server';
import { parseQuery, parseQueryRegex } from '@/lib/ai-parser';
import { search } from '@/lib/search';
import type { SearchFilters } from '@/lib/types';

const PARSER_TIMEOUT_MS = 1800;
const CATEGORY_LABELS: Record<string, string> = {
    concrete: 'Бетон',
    aggregates: 'Инертные материалы',
    blocks: 'Кирпич и блоки',
    rebar: 'Арматура и металлопрокат',
    cement: 'Цемент',
    machinery: 'Спецтехника',
    'pvc-profiles': 'ПВХ профили и подоконники',
    'general-materials': 'Общестроительные материалы',
    'painting-tools': 'Малярный инструмент',
    'hand-tools': 'Ручной инструмент',
    fasteners: 'Крепеж и метизы',
    electrical: 'Электрика',
    plumbing: 'Сантехника и трубы',
    safety: 'СИЗ и безопасность',
    'adhesives-sealants': 'Клеи и герметики',
};

async function parseWithTimeout(query: string) {
    if (!query.trim()) {
        return parseQueryRegex(query);
    }

    const llmParsed = await Promise.race([
        parseQuery(query),
        new Promise<ReturnType<typeof parseQueryRegex>>((resolve) =>
            setTimeout(() => resolve(parseQueryRegex(query)), PARSER_TIMEOUT_MS)
        ),
    ]);

    const regexParsed = parseQueryRegex(query);
    if (regexParsed.categoryId && llmParsed.categoryId !== regexParsed.categoryId) {
        return {
            ...llmParsed,
            categoryId: regexParsed.categoryId,
            category: regexParsed.category,
            suggestions: regexParsed.suggestions,
        };
    }

    return llmParsed;
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
        : await parseWithTimeout(q);

    // Override category if explicitly provided
    if (categoryId) {
        parsed = { ...parsed, categoryId, category: CATEGORY_LABELS[categoryId] || categoryId };
    }

    // Search
    const results = await search(parsed, filters);

    return NextResponse.json(results);
}
