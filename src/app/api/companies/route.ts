
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { createLogger } from '@/lib/logger';

const log = createLogger('api');

export async function GET() {
    const session = await auth();

    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const companies = await prisma.company.findMany({
            include: {
                category: true,
                region: true,
                owner: {
                    select: { id: true, name: true, email: true }
                },
                _count: {
                    select: {
                        products: true,
                        offers: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(companies);
    } catch (error) {
        log.error('Failed to fetch companies:', error);
        return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await auth();

    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'producer' && session.user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { name, description, phone, address, delivery, regionId, categoryId } = body;

        if (!name || !phone || !address) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Check if user already has a company
        const existing = await prisma.company.findUnique({
            where: { ownerId: session.user.id }
        });

        if (existing) {
            return NextResponse.json({ error: 'Company already exists' }, { status: 400 });
        }

        const defaultCategory = categoryId
            ? await prisma.category.findUnique({ where: { id: categoryId } })
            : await prisma.category.findFirst();

        if (!defaultCategory) {
            return NextResponse.json({ error: 'No categories found' }, { status: 500 });
        }

        const newCompany = await prisma.company.create({
            data: {
                name,
                description: description || '',
                phone,
                address,
                delivery: delivery || false,
                ownerId: session.user.id,
                regionId: regionId || 'kz-shim', // Default region
                categoryId: defaultCategory.id
            }
        });

        return NextResponse.json(newCompany, { status: 201 });

    } catch (error) {
        log.error('Failed to create company:', error);
        return NextResponse.json({ error: 'Failed to create company' }, { status: 500 });
    }
}
