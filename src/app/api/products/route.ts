
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { createLogger } from '@/lib/logger';

const log = createLogger('api');

// GET /api/products - List products
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const categoryId = searchParams.get('categoryId');
    const inStockOnly = searchParams.get('inStock') === 'true';
    const withImageOnly = searchParams.get('withImage') === 'true';
    const brand = searchParams.get('brand')?.trim();

    try {
        const where: {
            categoryId?: string;
            imageUrl?: { not: null };
            brand?: { contains: string; mode: 'insensitive' };
            offers?: { some: { companyId?: string, stockStatus?: 'IN_STOCK' } };
        } = {};

        const offerFilters: any = {};
        if (companyId) offerFilters.companyId = companyId;
        if (inStockOnly) offerFilters.stockStatus = 'IN_STOCK';

        if (Object.keys(offerFilters).length > 0) {
            where.offers = { some: offerFilters };
        }

        if (categoryId) where.categoryId = categoryId;
        if (withImageOnly) where.imageUrl = { not: null };
        if (brand) where.brand = { contains: brand, mode: 'insensitive' };

        const products = await prisma.product.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                category: true,
                offers: true
            }
        });

        return NextResponse.json(products);
    } catch (error) {
        log.error('Failed to fetch products:', error);
        return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }
}

// POST /api/products - Create product
export async function POST(request: Request) {
    const session = await auth();

    if (!session?.user || session.user.role !== 'producer') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure user has a company
    const company = await prisma.company.findUnique({
        where: { ownerId: session.user.id }
    });

    if (!company) {
        return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    try {
        const body = await request.json();
        const {
            name,
            description,
            categoryId,
            priceFrom,
            unit,
            priceUnit,
            inStock,
            article,
            brand,
            boxQuantity,
            imageUrl,
            source,
            specs,
        } = body;

        // Validation
        if (!name || !categoryId || priceFrom == null || !unit) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const normalizedPrice = Number(priceFrom);
        if (!Number.isFinite(normalizedPrice) || normalizedPrice < 0) {
            return NextResponse.json({ error: 'Invalid priceFrom value' }, { status: 400 });
        }

        const product = await prisma.product.create({
            data: {
                name,
                description: description || '',
                categoryId,
                article: typeof article === 'string' && article.trim() ? article.trim() : null,
                brand: typeof brand === 'string' && brand.trim() ? brand.trim() : null,
                imageUrl: typeof imageUrl === 'string' && imageUrl.trim() ? imageUrl.trim() : null,
                technicalSpecs: specs && typeof specs === 'object' ? { ...specs, boxQuantity, unit, source } : { boxQuantity, unit, source },
                offers: {
                    create: {
                        companyId: company.id,
                        price: normalizedPrice,
                        priceUnit: priceUnit || `за ${unit || 'шт'}`,
                        stockStatus: inStock === false ? 'OUT_OF_STOCK' : 'IN_STOCK'
                    }
                }
            }
        });

        return NextResponse.json(product, { status: 201 });
    } catch (error) {
        log.error('Failed to create product:', error);
        return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
    }
}
