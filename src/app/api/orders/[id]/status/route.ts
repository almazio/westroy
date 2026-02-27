import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) return new NextResponse('Unauthorized', { status: 401 });

    try {
        const body = await request.json();
        const { status } = body;

        if (!['delivering', 'delivered', 'completed', 'cancelled'].includes(status)) {
            return new NextResponse('Invalid status', { status: 400 });
        }

        const order = await prisma.order.findUnique({
            where: { id },
            include: { company: true },
        });

        if (!order) return new NextResponse('Not found', { status: 404 });

        // Ensure user is either the client or the producer
        const isClient = order.clientId === session.user.id;
        const isProducer = order.company.ownerId === session.user.id;

        if (!isClient && !isProducer) {
            return new NextResponse('Forbidden', { status: 403 });
        }

        // Only clients can complete
        if (status === 'completed' && !isClient) {
            return new NextResponse('Only clients can complete orders', { status: 403 });
        }

        // Producers can do delivering and delivered
        if (['delivering', 'delivered'].includes(status) && !isProducer) {
            return new NextResponse('Only producers can update delivery status', { status: 403 });
        }

        const updateData: { status: string; completedAt?: Date } = { status };
        if (status === 'completed') {
            updateData.completedAt = new Date();
        }

        const updatedOrder = await prisma.order.update({
            where: { id },
            data: updateData,
        });

        // Also update the original request status if order is completed
        if (status === 'completed') {
            const offer = await prisma.offer.findUnique({
                where: { id: order.offerId }
            });
            if (offer && offer.requestId) {
                await prisma.request.update({
                    where: { id: offer.requestId },
                    data: { status: 'completed' }
                });
            }
        }

        return NextResponse.json(updatedOrder);
    } catch (error) {
        console.error('[ORDER_STATUS_PUT]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
