import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { slugifyKnowledgeTitle, type KnowledgeItemStatus, type KnowledgeItemType, type KnowledgeSourceType } from '@/lib/knowledge-base';

interface EntrySourceInput {
    type?: KnowledgeSourceType;
    title?: string;
    url?: string;
    publisher?: string;
    notes?: string;
}

interface UpdateInput {
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

function normalizeTags(tags: UpdateInput['tags']): string[] {
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

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const { id } = await params;
        const body = (await request.json()) as UpdateInput;

        const current = await prisma.knowledgeBaseItem.findUnique({ where: { id } });
        if (!current) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        const title = body.title !== undefined ? String(body.title).trim() : current.title;
        const slug = body.slug !== undefined ? String(body.slug).trim() : slugifyKnowledgeTitle(title);

        const type = body.type !== undefined ? String(body.type) as KnowledgeItemType : current.type;
        const status = body.status !== undefined ? String(body.status) as KnowledgeItemStatus : current.status;

        if (!title || !slug) {
            return NextResponse.json({ error: 'title и slug обязательны' }, { status: 400 });
        }

        if (!ALLOWED_TYPES.has(type)) {
            return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
        }

        if (!ALLOWED_STATUS.has(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        const nextContent = body.contentMd !== undefined ? String(body.contentMd).trim() : current.contentMd;
        if (!nextContent) {
            return NextResponse.json({ error: 'contentMd обязателен' }, { status: 400 });
        }

        const hasTagsUpdate = body.tags !== undefined;
        const hasSourceUpdate = body.sources !== undefined;

        const result = await prisma.$transaction(async (tx) => {
            if (hasSourceUpdate) {
                await tx.knowledgeSource.deleteMany({ where: { itemId: id } });
            }

            const updated = await tx.knowledgeBaseItem.update({
                where: { id },
                data: {
                    title,
                    slug,
                    type,
                    status,
                    topic: body.topic !== undefined ? String(body.topic || '').trim() || null : undefined,
                    summary: body.summary !== undefined ? String(body.summary || '').trim() || null : undefined,
                    contentMd: nextContent,
                    formula: body.formula !== undefined ? String(body.formula || '').trim() || null : undefined,
                    inputSchemaJson: body.inputSchemaJson !== undefined ? String(body.inputSchemaJson || '').trim() || null : undefined,
                    outputSchemaJson: body.outputSchemaJson !== undefined ? String(body.outputSchemaJson || '').trim() || null : undefined,
                    tagsJson: hasTagsUpdate ? JSON.stringify(normalizeTags(body.tags)) : undefined,
                    regionCode: body.regionCode !== undefined ? String(body.regionCode || '').trim() || null : undefined,
                    sourceName: body.sourceName !== undefined ? String(body.sourceName || '').trim() || null : undefined,
                    sourceUrl: body.sourceUrl !== undefined ? String(body.sourceUrl || '').trim() || null : undefined,
                    verificationNote: body.verificationNote !== undefined ? String(body.verificationNote || '').trim() || null : undefined,
                    market: body.market !== undefined ? String(body.market || '').trim().toLowerCase() || 'kz' : undefined,
                    updatedById: session.user.id,
                    sources: hasSourceUpdate
                        ? {
                            create: normalizeSources(body.sources),
                        }
                        : undefined,
                },
                include: {
                    sources: true,
                },
            });

            return updated;
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('Failed to update knowledge base item:', error);
        if (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'P2002') {
            return NextResponse.json({ error: 'slug уже существует' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Failed to update knowledge base item' }, { status: 500 });
    }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const { id } = await params;
        await prisma.knowledgeBaseItem.delete({ where: { id } });
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('Failed to delete knowledge base item:', error);
        return NextResponse.json({ error: 'Failed to delete knowledge base item' }, { status: 500 });
    }
}
