import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { slugifyKnowledgeTitle, STARTER_KZ_KNOWLEDGE_BASE } from '@/lib/knowledge-base';
import { createLogger } from '@/lib/logger';

const log = createLogger('api');

export async function POST() {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const result = await prisma.$transaction(async (tx) => {
            let created = 0;
            let updated = 0;

            for (const entry of STARTER_KZ_KNOWLEDGE_BASE) {
                const slug = slugifyKnowledgeTitle(entry.title);
                const existing = await tx.knowledgeBaseItem.findUnique({ where: { slug }, select: { id: true } });

                if (existing) {
                    await tx.knowledgeSource.deleteMany({ where: { itemId: existing.id } });

                    await tx.knowledgeBaseItem.update({
                        where: { id: existing.id },
                        data: {
                            title: entry.title,
                            type: entry.type,
                            status: entry.status,
                            topic: entry.topic,
                            summary: entry.summary,
                            contentMd: entry.contentMd,
                            formula: entry.formula || null,
                            inputSchemaJson: entry.inputSchemaJson ? JSON.parse(entry.inputSchemaJson) : undefined,
                            outputSchemaJson: entry.outputSchemaJson ? JSON.parse(entry.outputSchemaJson) : undefined,
                            tagsJson: entry.tags ? JSON.parse(JSON.stringify(entry.tags)) : undefined,
                            regionCode: entry.regionCode || null,
                            sourceName: entry.sourceName || null,
                            sourceUrl: entry.sourceUrl || null,
                            verificationNote: entry.verificationNote || null,
                            updatedById: session.user.id,
                            sources: {
                                create: entry.sources,
                            },
                        },
                    });

                    updated += 1;
                    continue;
                }

                await tx.knowledgeBaseItem.create({
                    data: {
                        title: entry.title,
                        slug,
                        market: 'kz',
                        type: entry.type,
                        status: entry.status,
                        topic: entry.topic,
                        summary: entry.summary,
                        contentMd: entry.contentMd,
                        formula: entry.formula || null,
                        inputSchemaJson: entry.inputSchemaJson ? JSON.parse(entry.inputSchemaJson) : undefined,
                        outputSchemaJson: entry.outputSchemaJson ? JSON.parse(entry.outputSchemaJson) : undefined,
                        tagsJson: entry.tags ? JSON.parse(JSON.stringify(entry.tags)) : undefined,
                        regionCode: entry.regionCode || null,
                        sourceName: entry.sourceName || null,
                        sourceUrl: entry.sourceUrl || null,
                        verificationNote: entry.verificationNote || null,
                        createdById: session.user.id,
                        updatedById: session.user.id,
                        sources: {
                            create: entry.sources,
                        },
                    },
                });

                created += 1;
            }

            return { created, updated, total: STARTER_KZ_KNOWLEDGE_BASE.length };
        });

        return NextResponse.json({ ok: true, ...result });
    } catch (error) {
        log.error('Failed to seed knowledge base:', error);
        if (typeof error === 'object' && error !== null && 'code' in error) {
            const code = String((error as { code?: string }).code || '');
            if (code === 'P2021') {
                return NextResponse.json(
                    { error: 'Knowledge tables are missing. Run Prisma migrations first (npx prisma migrate deploy).' },
                    { status: 500 }
                );
            }
        }

        return NextResponse.json({ error: 'Failed to seed knowledge base', details: String(error) }, { status: 500 });
    }
}
