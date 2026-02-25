import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) return new NextResponse('Unauthorized', { status: 401 });

    try {
        const body = await request.json();
        const { rating, comment } = body;

        if (typeof rating !== 'number' || rating < 1 || rating > 5) {
            return new NextResponse('Invalid rating', { status: 400 });
        }

        const order = await prisma.order.findUnique({
            where: { id },
            include: { review: true },
        });

        if (!order) return new NextResponse('Not found', { status: 404 });

        if (order.clientId !== session.user.id) {
            return new NextResponse('Forbidden', { status: 403 });
        }

        if (order.status !== 'completed') {
            return new NextResponse('Order must be completed to leave a review', { status: 400 });
        }

        if (order.review) {
            return new NextResponse('Review already exists for this order', { status: 400 });
        }

        const review = await prisma.review.create({
            data: {
                rating,
                comment: comment || null,
                orderId: order.id,
                clientId: order.clientId,
                companyId: order.companyId,
            }
        });

        return NextResponse.json(review);
    } catch (error) {
        console.error('[ORDER_REVIEW_POST]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
