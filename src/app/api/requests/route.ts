import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { notifyProducersOfRequest } from '@/lib/notifications';
import { checkRateLimit, getClientIp, rateLimits } from '@/lib/rate-limit';
import { auth } from '@/auth';

export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const categoryId = searchParams.get('categoryId');

    try {
        const role = session.user.role;

        const where = {
            ...(categoryId ? { categoryId } : {}),
            ...(role === 'admin'
                ? (userId ? { userId } : {})
                : role === 'client'
                    ? { userId: session.user.id }
                    : {})
        };

        const requests = await prisma.request.findMany({
            where,
            include: {
                _count: {
                    select: { offers: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const enriched = requests.map((r) => ({
            ...r,
            offerCount: r._count.offers
        }));

        return NextResponse.json(enriched);
    } catch (error) {
        console.error('Failed to fetch requests:', error);
        return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const rl = checkRateLimit(getClientIp(request), rateLimits.api);
        if (!rl.success) {
            return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
        }

        const session = await auth();
        const body = await request.json();

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!body.categoryId || !body.query || !body.parsedCategory) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const saved = await prisma.request.create({
            data: {
                userId: session.user.id,
                categoryId: body.categoryId,
                query: body.query,
                parsedCategory: body.parsedCategory,
                parsedVolume: body.parsedVolume || null,
                parsedCity: body.parsedCity || 'Шымкент',
                deliveryNeeded: Boolean(body.deliveryNeeded),
                address: body.address || null,
                deadline: body.deadline || null,
                status: 'active',
            },
        });

        // Notify matching producers (async)
        notifyProducersOfRequest(saved.id).catch(err => {
            console.error('[Notification Error] Failed to notify producers:', err);
        });

        return NextResponse.json(saved, { status: 201 });
    } catch (error) {
        console.error('[API Requests POST Error]:', error);
        return NextResponse.json(
            { error: 'Failed to create request', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
