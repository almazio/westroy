import { NextRequest, NextResponse } from 'next/server';
import { searchProductsByText } from '@/lib/db/companies';
import { parseQueryRegex } from '@/lib/ai-parser';
import { CATEGORY_LABELS } from '@/lib/constants';
import { createLogger } from '@/lib/logger';

const log = createLogger('api');

export interface SuggestItem {
    type: 'category' | 'product' | 'query';
    label: string;
    value: string;
    meta?: string; // price, company name, etc.
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();

    if (!q || q.length < 2) {
        return NextResponse.json({ suggestions: [] });
    }

    const suggestions: SuggestItem[] = [];

    // 1. Regex-parse for instant category detection
    const parsed = parseQueryRegex(q);
    if (parsed.categoryId && parsed.category) {
        suggestions.push({
            type: 'category',
            label: parsed.category,
            value: parsed.categoryId,
            meta: 'Категория',
        });
    }

    // 2. Also find fuzzy category matches from labels
    const qLower = q.toLowerCase();
    for (const [id, label] of Object.entries(CATEGORY_LABELS)) {
        if (id === parsed.categoryId) continue; // already added
        if (label.toLowerCase().includes(qLower) || qLower.includes(label.toLowerCase().slice(0, 3))) {
            suggestions.push({
                type: 'category',
                label,
                value: id,
                meta: 'Категория',
            });
        }
        if (suggestions.filter(s => s.type === 'category').length >= 3) break;
    }

    // 3. Search products by text (DB ILIKE, limited to 6)
    try {
        const products = await searchProductsByText(q, 6);
        for (const product of products) {
            const priceMeta = product.priceFrom > 0
                ? `от ${new Intl.NumberFormat('ru-RU').format(product.priceFrom)} ₸`
                : 'По запросу';
            suggestions.push({
                type: 'product',
                label: product.name,
                value: product.name,
                meta: priceMeta,
            });
        }
    } catch (error) {
        log.warn('Product search error', { error: String(error) });
    }

    // 4. Add original query as "search for" item
    suggestions.push({
        type: 'query',
        label: `Искать «${q}»`,
        value: q,
    });

    return NextResponse.json({ suggestions });
}
