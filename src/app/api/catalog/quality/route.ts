import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { ALLOWED_UNITS } from '@/lib/catalog';
import { createLogger } from '@/lib/logger';

const log = createLogger('api');

const STALE_DAYS = 14;

export async function GET() {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const [products, companies] = await Promise.all([
            prisma.product.findMany({
                include: {
                    offers: true
                }
            }),
            prisma.company.findMany({
                select: {
                    id: true,
                    name: true,
                    _count: { select: { offers: true } }
                }
            })
        ]);

        const staleThreshold = Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000;
        const staleProducts = products.filter((p) => new Date(p.updatedAt).getTime() < staleThreshold).length;
        const missingDescription = products.filter((p) => !p.description?.trim()).length;
        const missingPriceUnit = products.reduce((acc, p) => acc + p.offers.filter(o => !o.priceUnit?.trim()).length, 0);
        const invalidPrice = products.reduce((acc, p) => acc + p.offers.filter(o => !Number.isFinite(o.price) || o.price < 0).length, 0);
        const priceOnRequest = products.reduce((acc, p) => acc + p.offers.filter(o => Number.isFinite(o.price) && o.price === 0).length, 0);
        const invalidUnit = 0; // Legacy unit metric
        const outOfStock = products.reduce((acc, p) => acc + p.offers.filter((o) => o.stockStatus !== 'IN_STOCK').length, 0);
        const companiesWithoutProducts = companies.filter((c) => c._count.offers === 0);

        return NextResponse.json({
            totals: {
                products: products.length,
                companies: companies.length,
                companiesWithoutProducts: companiesWithoutProducts.length,
            },
            quality: {
                missingDescription,
                missingPriceUnit,
                invalidPrice,
                priceOnRequest,
                invalidUnit,
                staleProducts,
                outOfStock,
            },
            staleDays: STALE_DAYS,
            samples: {
                companiesWithoutProducts: companiesWithoutProducts.slice(0, 10).map((c) => ({
                    id: c.id,
                    name: c.name,
                })),
            }
        });
    } catch (error) {
        log.error('Failed to load catalog quality:', error);
        return NextResponse.json({ error: 'Failed to load catalog quality' }, { status: 500 });
    }
}
