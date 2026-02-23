
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { notifyProducerOfOfferStatus } from '@/lib/notifications';
import { createLogger } from '@/lib/logger';

const log = createLogger('api');

// PUT /api/offers/[id] - Accept/Reject offer
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await auth();

    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const offer = await prisma.offer.findUnique({
            where: { id: id },
            include: { request: true },
        });

        if (!offer) {
            return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
        }

        if (offer.request.userId !== session.user.id && session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { status } = body; // 'accepted' | 'rejected'

        if (!['accepted', 'rejected'].includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        const updatedOffer = await prisma.$transaction(async (tx) => {
            const nextOffer = await tx.offer.update({
                where: { id },
                data: { status },
            });

            if (status === 'accepted') {
                // Reject all other pending offers
                await tx.offer.updateMany({
                    where: {
                        requestId: offer.requestId,
                        id: { not: id },
                        status: 'pending'
                    },
                    data: { status: 'rejected' }
                });
                // Move request to in_progress
                await tx.request.update({
                    where: { id: offer.requestId },
                    data: { status: 'in_progress' }
                });
                // Auto-create Order
                await tx.order.create({
                    data: {
                        offerId: id,
                        clientId: offer.request.userId,
                        companyId: offer.companyId,
                        totalPrice: offer.price + (offer.deliveryPrice || 0),
                        deliveryPrice: offer.deliveryPrice,
                        deliveryAddress: offer.request.address,
                        status: 'confirmed',
                    },
                });
            }

            return nextOffer;
        });

        // Notify the producer who made the offer
        notifyProducerOfOfferStatus(id).catch(err => log.error('Notify error', err));

        return NextResponse.json(updatedOffer);

    } catch (error) {
        log.error('Failed to update offer:', error);
        return NextResponse.json({ error: 'Failed to update offer' }, { status: 500 });
    }
}
