import { NextRequest, NextResponse } from 'next/server';
import { parseQuery, parseQueryRegex } from '@/lib/ai-parser';
import { search } from '@/lib/search';

const PARSER_TIMEOUT_MS = 1800;

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

    if (!q && !categoryId) {
        return NextResponse.json({ error: 'Query parameter "q" or "category" is required' }, { status: 400 });
    }

    // Parse query with LLM, but do not block search on slow provider
    let parsed = await parseWithTimeout(q);

    // Override category if explicitly provided
    if (categoryId && !parsed.categoryId) {
        parsed = { ...parsed, categoryId, category: categoryId };
    }

    // Search
    const results = await search(parsed);

    return NextResponse.json(results);
}
