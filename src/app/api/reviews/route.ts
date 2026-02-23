import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { createLogger } from '@/lib/logger';
import { z } from 'zod';
import { parseBody } from '@/lib/schemas';

const log = createLogger('api');

const ReviewCreateSchema = z.object({
    orderId: z.string().min(1),
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(2000).optional().nullable(),
});

// POST /api/reviews — submit a review for a completed order
export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const raw = await request.json();
        const parsed = parseBody(ReviewCreateSchema, raw);
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error }, { status: 400 });
        }
        const body = parsed.data;

        // Verify order exists, belongs to client, and is completed
        const order = await prisma.order.findUnique({
            where: { id: body.orderId },
            include: { review: { select: { id: true } } },
        });

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }
        if (order.clientId !== session.user.id && session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        if (order.status !== 'completed') {
            return NextResponse.json({ error: 'Can only review completed orders' }, { status: 400 });
        }
        if (order.review) {
            return NextResponse.json({ error: 'Review already exists' }, { status: 409 });
        }

        const review = await prisma.review.create({
            data: {
                orderId: body.orderId,
                clientId: session.user.id!,
                companyId: order.companyId,
                rating: body.rating,
                comment: body.comment || null,
            },
        });

        return NextResponse.json(review, { status: 201 });
    } catch (error) {
        log.error('Failed to create review:', error);
        return NextResponse.json({ error: 'Failed to create review' }, { status: 500 });
    }
}

// GET /api/reviews?companyId=xxx — get reviews for a company
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
        return NextResponse.json({ error: 'companyId required' }, { status: 400 });
    }

    try {
        const reviews = await prisma.review.findMany({
            where: { companyId },
            include: {
                client: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });

        // Calculate aggregate
        const count = reviews.length;
        const avgRating = count > 0
            ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / count) * 10) / 10
            : 0;

        return NextResponse.json({
            reviews,
            stats: { count, avgRating },
        });
    } catch (error) {
        log.error('Failed to fetch reviews:', error);
        return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
    }
}
