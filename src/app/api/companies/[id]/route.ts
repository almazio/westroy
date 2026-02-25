
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { createLogger } from '@/lib/logger';
import { CompanyUpdateSchema, parseBody } from '@/lib/schemas';

const log = createLogger('api');

// GET /api/companies/[id] - Get company details
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const company = await prisma.company.findUnique({
            where: { id: id },
            include: {
                category: true,
                region: true,
            }
        });

        if (!company) {
            return NextResponse.json({ error: 'Company not found' }, { status: 404 });
        }

        return NextResponse.json(company);
    } catch (error) {
        log.error('Failed to fetch company:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

// PUT /api/companies/[id] - Update company profile
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await auth();

    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const company = await prisma.company.findUnique({
            where: { id: id },
        });

        if (!company) {
            return NextResponse.json({ error: 'Company not found' }, { status: 404 });
        }

        // Authorization: User must be owner OR admin
        if (company.ownerId !== session.user.id && session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const raw = await request.json();
        const parsed = parseBody(CompanyUpdateSchema, raw);
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error }, { status: 400 });
        }

        const { name, description, address, phone, delivery } = parsed.data;

        const updatedCompany = await prisma.company.update({
            where: { id: id },
            data: {
                name,
                description,
                address,
                phone,
                delivery,
                // website? Schema didn't have website, but maybe later.
                // Let's stick to schema fields.
            }
        });

        return NextResponse.json(updatedCompany);
    } catch (error) {
        log.error('Failed to update company:', error);
        return NextResponse.json({ error: 'Failed to update company' }, { status: 500 });
    }
}

// DELETE /api/companies/[id] - Delete company
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await auth();

    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const company = await prisma.company.findUnique({
            where: { id: id },
        });

        if (!company) {
            return NextResponse.json({ error: 'Company not found' }, { status: 404 });
        }

        // Authorization: User must be owner OR admin
        if (company.ownerId !== session.user.id && session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Transaction to delete related data? 
        // Prisma cascading delete should handle it if configured, otherwise manual.
        // Let's assume schema has Cascade or we do it here.
        // Deleting company should delete products, offers.

        // Manual cleanup for safety if cascade not set
        await prisma.product.deleteMany({ where: { companyId: id } });
        await prisma.offer.deleteMany({ where: { companyId: id } });

        await prisma.company.delete({
            where: { id: id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        log.error('Failed to delete company:', error);
        return NextResponse.json({ error: 'Failed to delete company' }, { status: 500 });
    }
}
