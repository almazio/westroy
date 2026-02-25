import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { createLogger } from '@/lib/logger';

const log = createLogger('api');

// GET /api/orders — list orders for current user (client or producer)
export async function GET() {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const role = session.user.role;
        const where = role === 'admin'
            ? {}
            : role === 'producer'
                ? { company: { ownerId: session.user.id } }
                : { clientId: session.user.id };

        const orders = await prisma.order.findMany({
            where,
            include: {
                offer: { include: { request: true } },
                company: { select: { id: true, name: true, phone: true } },
                review: { select: { id: true, rating: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(orders);
    } catch (error) {
        log.error('Failed to fetch orders:', error);
        return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }
}
