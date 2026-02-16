import { NextRequest, NextResponse } from 'next/server';
import { parseQuery } from '@/lib/ai-parser';
import { search } from '@/lib/search';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const categoryId = searchParams.get('category') || undefined;

    if (!q && !categoryId) {
        return NextResponse.json({ error: 'Query parameter "q" or "category" is required' }, { status: 400 });
    }

    // Parse the query with AI parser
    let parsed = await parseQuery(q);

    // Override category if explicitly provided
    if (categoryId && !parsed.categoryId) {
        parsed = { ...parsed, categoryId, category: categoryId };
    }

    // Search
    const results = await search(parsed);

    return NextResponse.json(results);
}
