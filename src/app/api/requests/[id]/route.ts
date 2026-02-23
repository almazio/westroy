
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { createLogger } from '@/lib/logger';

const log = createLogger('api');

// PUT /api/requests/[id] - Update request status
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await auth();

    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const existingRequest = await prisma.request.findUnique({
            where: { id },
        });

        if (!existingRequest) {
            return NextResponse.json({ error: 'Request not found' }, { status: 404 });
        }

        // Authorization: Only owner can update status
        if (existingRequest.userId !== session.user.id && session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { status } = body; // 'active' | 'in_progress' | 'completed' | 'cancelled'

        if (!['active', 'in_progress', 'completed', 'cancelled'].includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        const updatedRequest = await prisma.request.update({
            where: { id },
            data: { status },
        });

        return NextResponse.json(updatedRequest);
    } catch (error) {
        log.error('Failed to update request:', error);
        return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
    }
}
