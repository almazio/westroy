
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { createLogger } from '@/lib/logger';

const log = createLogger('api');

// PUT /api/products/[id] - Update product
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await auth();

    if (!session?.user || !['producer', 'admin'].includes(session.user.role as string)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const product = await prisma.product.findUnique({
            where: { id: id },
        });

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        // Verify ownership via company Offer presence
        const company = await prisma.company.findUnique({
            where: { ownerId: session.user.id }
        });

        if (!company) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const offer = await prisma.offer.findFirst({
            where: { productId: id, companyId: company.id }
        });

        if (!offer && session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden: You do not own this product' }, { status: 403 });
        }

        const body = await request.json();
        const {
            name,
            description,
            priceFrom,
            unit,
            inStock,
            article,
            brand,
            boxQuantity,
            imageUrl,
            source,
            specs,
        } = body;

        const normalizedPrice = Number(priceFrom);
        if (!Number.isFinite(normalizedPrice) || normalizedPrice < 0) {
            return NextResponse.json({ error: 'Invalid priceFrom value' }, { status: 400 });
        }

        const updatedProduct = await prisma.product.update({
            where: { id: id },
            data: {
                name,
                description,
                article: typeof article === 'string' && article.trim() ? article.trim() : null,
                brand: typeof brand === 'string' && brand.trim() ? brand.trim() : null,
                imageUrl: typeof imageUrl === 'string' && imageUrl.trim() ? imageUrl.trim() : null,
                technicalSpecs: specs && typeof specs === 'object' ? { ...specs, boxQuantity, unit, source } : { boxQuantity, unit, source },
                offers: {
                    updateMany: {
                        where: { companyId: company.id },
                        data: {
                            price: normalizedPrice,
                            stockStatus: inStock === false ? 'OUT_OF_STOCK' : 'IN_STOCK'
                        }
                    }
                }
            }
        });

        return NextResponse.json(updatedProduct);
    } catch (error) {
        log.error('Failed to update product:', error);
        return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
    }
}

// DELETE /api/products/[id] - Delete product
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await auth();

    if (!session?.user || !['producer', 'admin'].includes(session.user.role as string)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const product = await prisma.product.findUnique({
            where: { id: id },
        });

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        // Verify ownership
        const company = await prisma.company.findUnique({
            where: { ownerId: session.user.id }
        });

        if (!company) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const offer = await prisma.offer.findFirst({
            where: { productId: id, companyId: company.id }
        });

        if (!offer && session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        if (offer) {
            await prisma.offer.delete({
                where: { id: offer.id },
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        log.error('Failed to delete product:', error);
        return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
    }
}
