import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { slugifyKnowledgeTitle, type KnowledgeItemStatus, type KnowledgeItemType, type KnowledgeSourceType } from '@/lib/knowledge-base';
import { createLogger } from '@/lib/logger';

const log = createLogger('api');

interface EntrySourceInput {
    type?: KnowledgeSourceType;
    title?: string;
    url?: string;
    publisher?: string;
    notes?: string;
}

interface EntryInput {
    title?: string;
    slug?: string;
    type?: KnowledgeItemType;
    status?: KnowledgeItemStatus;
    topic?: string;
    summary?: string;
    contentMd?: string;
    formula?: string;
    inputSchemaJson?: string;
    outputSchemaJson?: string;
    tags?: string[] | string;
    regionCode?: string;
    sourceName?: string;
    sourceUrl?: string;
    verificationNote?: string;
    market?: string;
    sources?: EntrySourceInput[];
}

type NormalizedSource = {
    type: KnowledgeSourceType;
    title: string;
    url?: string;
    publisher?: string;
    notes?: string;
};

const ALLOWED_TYPES = new Set<KnowledgeItemType>(['standard', 'snippet', 'calculation', 'measurement', 'hack']);
const ALLOWED_STATUS = new Set<KnowledgeItemStatus>(['draft', 'reviewed', 'published', 'archived']);
const ALLOWED_SOURCE_TYPES = new Set<KnowledgeSourceType>(['standard', 'law', 'article', 'vendor', 'internal']);

function normalizeTags(tags: EntryInput['tags']): string[] {
    if (Array.isArray(tags)) {
        return tags.map((tag) => String(tag).trim()).filter(Boolean);
    }

    if (typeof tags === 'string') {
        return tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean);
    }

    return [];
}

function normalizeSources(sources: EntrySourceInput[] | undefined): NormalizedSource[] {
    if (!Array.isArray(sources)) {
        return [];
    }

    const normalized: NormalizedSource[] = [];
    for (const source of sources) {
        const title = String(source.title || '').trim();
        if (!title) continue;

        const type = String(source.type || 'standard') as KnowledgeSourceType;
        normalized.push({
            type: ALLOWED_SOURCE_TYPES.has(type) ? type : 'standard',
            title,
            url: source.url ? String(source.url).trim() : undefined,
            publisher: source.publisher ? String(source.publisher).trim() : undefined,
            notes: source.notes ? String(source.notes).trim() : undefined,
        });
    }

    return normalized;
}

export async function GET() {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const items = await prisma.knowledgeBaseItem.findMany({
        include: {
            sources: {
                orderBy: { createdAt: 'asc' },
            },
            createdBy: {
                select: { id: true, name: true, email: true },
            },
            updatedBy: {
                select: { id: true, name: true, email: true },
            },
        },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json(items);
}

export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const body = (await request.json()) as EntryInput;

        const title = String(body.title || '').trim();
        const contentMd = String(body.contentMd || '').trim();
        const slug = String(body.slug || slugifyKnowledgeTitle(title)).trim();
        const type = String(body.type || 'snippet') as KnowledgeItemType;
        const status = String(body.status || 'draft') as KnowledgeItemStatus;

        if (!title || !contentMd || !slug) {
            return NextResponse.json({ error: 'title, slug и contentMd обязательны' }, { status: 400 });
        }

        if (!ALLOWED_TYPES.has(type)) {
            return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
        }

        if (!ALLOWED_STATUS.has(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        const tags = normalizeTags(body.tags);
        const sources = normalizeSources(body.sources);

        const created = await prisma.knowledgeBaseItem.create({
            data: {
                title,
                slug,
                type,
                status,
                topic: body.topic ? String(body.topic).trim() : null,
                summary: body.summary ? String(body.summary).trim() : null,
                contentMd,
                formula: body.formula ? String(body.formula).trim() : null,
                inputSchemaJson: body.inputSchemaJson ? JSON.parse(String(body.inputSchemaJson)) : Object.create(null),
                outputSchemaJson: body.outputSchemaJson ? JSON.parse(String(body.outputSchemaJson)) : Object.create(null),
                tagsJson: JSON.parse(JSON.stringify(tags)),
                regionCode: body.regionCode ? String(body.regionCode).trim() : null,
                sourceName: body.sourceName ? String(body.sourceName).trim() : null,
                sourceUrl: body.sourceUrl ? String(body.sourceUrl).trim() : null,
                verificationNote: body.verificationNote ? String(body.verificationNote).trim() : null,
                market: body.market ? String(body.market).trim().toLowerCase() : 'kz',
                createdById: session.user.id,
                updatedById: session.user.id,
                sources: {
                    create: sources,
                },
            },
            include: {
                sources: true,
            },
        });

        return NextResponse.json(created, { status: 201 });
    } catch (error) {
        log.error('Failed to create knowledge base item:', error);

        if (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'P2002') {
            return NextResponse.json({ error: 'slug уже существует' }, { status: 409 });
        }

        return NextResponse.json({ error: 'Failed to create knowledge base item' }, { status: 500 });
    }
}
