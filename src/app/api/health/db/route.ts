import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

function redactDbUrl(url: string | undefined) {
    if (!url) return null;
    try {
        const parsed = new URL(url);
        return `${parsed.protocol}//${parsed.hostname}:${parsed.port}${parsed.pathname}`;
    } catch {
        return 'invalid-url';
    }
}

export async function GET() {
    const dbUrl = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL;
    const directUrl = process.env.POSTGRES_URL_NON_POOLING || process.env.DIRECT_URL;

    try {
        const [categories, companies, products, users, requests, offers] = await Promise.all([
            prisma.category.count(),
            prisma.company.count(),
            prisma.product.count(),
            prisma.user.count(),
            prisma.request.count(),
            prisma.offer.count(),
        ]);

        return NextResponse.json({
            ok: true,
            runtime: process.env.VERCEL ? 'vercel' : 'local',
            env: {
                hasDbUrl: Boolean(dbUrl),
                hasDirectUrl: Boolean(directUrl),
                dbUrl: redactDbUrl(dbUrl),
                directUrl: redactDbUrl(directUrl),
            },
            counts: {
                categories,
                companies,
                products,
                users,
                requests,
                offers,
            },
        });
    } catch (error) {
        return NextResponse.json(
            {
                ok: false,
                runtime: process.env.VERCEL ? 'vercel' : 'local',
                env: {
                    hasDbUrl: Boolean(dbUrl),
                    hasDirectUrl: Boolean(directUrl),
                    dbUrl: redactDbUrl(dbUrl),
                    directUrl: redactDbUrl(directUrl),
                },
                error: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}
