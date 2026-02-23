import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { createLogger } from '@/lib/logger';
import { notifyOps } from '@/lib/notifications';

const log = createLogger('api');

const VALID_TRANSITIONS: Record<string, string[]> = {
    confirmed: ['delivering', 'cancelled'],
    delivering: ['delivered', 'cancelled'],
    delivered: ['completed'],
    completed: [],
    cancelled: [],
};

// PATCH /api/orders/[id] — update order status
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await auth();

    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const order = await prisma.order.findUnique({
            where: { id },
            include: {
                offer: { include: { request: true } },
                company: { select: { name: true, ownerId: true } },
            },
        });

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Only client, company owner, or admin can update
        const isClient = order.clientId === session.user.id;
        const isProducer = order.company.ownerId === session.user.id;
        const isAdmin = session.user.role === 'admin';

        if (!isClient && !isProducer && !isAdmin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const newStatus = String(body.status).trim();

        const allowed = VALID_TRANSITIONS[order.status] || [];
        if (!allowed.includes(newStatus)) {
            return NextResponse.json(
                { error: `Cannot transition from '${order.status}' to '${newStatus}'` },
                { status: 400 }
            );
        }

        // Producers can mark delivering/delivered; clients mark completed
        if (newStatus === 'delivering' && !isProducer && !isAdmin) {
            return NextResponse.json({ error: 'Only producer can mark as delivering' }, { status: 403 });
        }
        if (newStatus === 'completed' && !isClient && !isAdmin) {
            return NextResponse.json({ error: 'Only client can mark as completed' }, { status: 403 });
        }

        const updated = await prisma.order.update({
            where: { id },
            data: {
                status: newStatus,
                ...(newStatus === 'completed' ? { completedAt: new Date() } : {}),
            },
        });

        // On completion, update request status too
        if (newStatus === 'completed') {
            await prisma.request.update({
                where: { id: order.offer.requestId },
                data: { status: 'completed' },
            });
        }

        await notifyOps(
            `Заказ ${newStatus}: ${order.company.name}`,
            `ID: ${id}\nСтатус: ${order.status} → ${newStatus}\nСумма: ${order.totalPrice} ₸`,
            { orderId: id }
        );

        return NextResponse.json(updated);
    } catch (error) {
        log.error('Failed to update order:', error);
        return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
    }
}

// GET /api/orders/[id]
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await auth();

    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const order = await prisma.order.findUnique({
            where: { id },
            include: {
                offer: { include: { request: true } },
                company: { select: { id: true, name: true, phone: true, address: true } },
                review: true,
            },
        });

        if (!order) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        return NextResponse.json(order);
    } catch (error) {
        log.error('Failed to fetch order:', error);
        return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
    }
}
