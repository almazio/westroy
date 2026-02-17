import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

function isValidStatus(value: string): value is 'pending' | 'approved' | 'rejected' {
    return value === 'pending' || value === 'approved' || value === 'rejected';
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    try {
        const body = await request.json();
        const status = String(body.status || '').trim();
        if (!isValidStatus(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        const updated = await prisma.partnerApplication.update({
            where: { id },
            data: { status },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Failed to update partner application:', error);
        return NextResponse.json({ error: 'Failed to update partner application' }, { status: 500 });
    }
}
