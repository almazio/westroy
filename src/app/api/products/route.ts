
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';

// GET /api/products - List products
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const categoryId = searchParams.get('categoryId');

    try {
        const where: { companyId?: string; categoryId?: string } = {};
        if (companyId) where.companyId = companyId;
        if (categoryId) where.categoryId = categoryId;

        const products = await prisma.product.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                category: true,
            }
        });

        return NextResponse.json(products);
    } catch (error) {
        console.error('Failed to fetch products:', error);
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
        const { name, description, categoryId, priceFrom, unit, priceUnit, inStock } = body;

        // Validation
        if (!name || !categoryId || !priceFrom || !unit) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const product = await prisma.product.create({
            data: {
                name,
                description: description || '',
                categoryId,
                priceFrom: Number(priceFrom),
                unit,
                priceUnit: priceUnit || `за ${unit}`,
                inStock: inStock ?? true,
                companyId: company.id,
            }
        });

        return NextResponse.json(product, { status: 201 });
    } catch (error) {
        console.error('Failed to create product:', error);
        return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
    }
}
