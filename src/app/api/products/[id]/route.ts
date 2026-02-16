
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';

// PUT /api/products/[id] - Update product
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await auth();

    if (!session?.user || session.user.role !== 'producer') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const product = await prisma.product.findUnique({
            where: { id: id },
        });

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        // Verify ownership via company
        const company = await prisma.company.findUnique({
            where: { ownerId: session.user.id }
        });

        if (!company || company.id !== product.companyId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { name, description, priceFrom, unit, inStock } = body;

        const updatedProduct = await prisma.product.update({
            where: { id: id },
            data: {
                name,
                description,
                priceFrom: Number(priceFrom),
                unit,
                inStock,
            }
        });

        return NextResponse.json(updatedProduct);
    } catch (error) {
        console.error('Failed to update product:', error);
        return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
    }
}

// DELETE /api/products/[id] - Delete product
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await auth();

    if (!session?.user || session.user.role !== 'producer') {
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

        if (!company || company.id !== product.companyId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await prisma.product.delete({
            where: { id: id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete product:', error);
        return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
    }
}
