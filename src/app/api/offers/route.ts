import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { notifyClientOfOffer } from '@/lib/notifications';
import { checkRateLimit, getClientIp, rateLimits } from '@/lib/rate-limit';
import { auth } from '@/auth';
import { createLogger } from '@/lib/logger';
import { OfferCreateSchema, parseBody } from '@/lib/schemas';

const log = createLogger('api');

export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('requestId');
    const companyId = searchParams.get('companyId');

    try {
        if (!requestId && !companyId && session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        if (requestId) {
            const requestEntity = await prisma.request.findUnique({
                where: { id: requestId },
                select: { userId: true }
            });
            if (!requestEntity) {
                return NextResponse.json({ error: 'Request not found' }, { status: 404 });
            }
            if (requestEntity.userId !== session.user.id && session.user.role !== 'admin') {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }

        if (companyId) {
            const company = await prisma.company.findUnique({
                where: { id: companyId },
                select: { ownerId: true }
            });
            if (!company) {
                return NextResponse.json({ error: 'Company not found' }, { status: 404 });
            }
            if (company.ownerId !== session.user.id && session.user.role !== 'admin') {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }

        const where = {
            ...(requestId ? { requestId } : {}),
            ...(companyId ? { companyId } : {}),
        };

        const offers = await prisma.offer.findMany({
            where,
            include: {
                request: true,
                company: true,
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(offers);
    } catch (error) {
        log.error('Failed to fetch offers:', error);
        return NextResponse.json({ error: 'Failed to fetch offers' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const rl = checkRateLimit(getClientIp(request), rateLimits.api);
    if (!rl.success) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'producer' && session.user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const raw = await request.json();
    const parsed = parseBody(OfferCreateSchema, raw);
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const body = parsed.data;

    const company = await prisma.company.findUnique({
        where: { ownerId: session.user.id }
    });
    if (!company && session.user.role !== 'admin') {
        return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const targetCompanyId = session.user.role === 'admin'
        ? body.companyId
        : company?.id;

    if (!targetCompanyId) {
        return NextResponse.json({ error: 'Invalid company' }, { status: 400 });
    }

    const existingOffer = await prisma.offer.findFirst({
        where: {
            requestId: body.requestId,
            companyId: targetCompanyId
        },
        select: { id: true }
    });
    if (existingOffer) {
        return NextResponse.json({ error: 'Offer already exists for this request' }, { status: 409 });
    }

    const saved = await prisma.offer.create({
        data: {
            requestId: body.requestId,
            companyId: targetCompanyId,
            price: Number(body.price),
            priceUnit: body.priceUnit || 'за м³',
            comment: body.comment || '',
            deliveryIncluded: Boolean(body.deliveryIncluded),
            deliveryPrice: body.deliveryPrice != null ? Number(body.deliveryPrice) : null,
            validUntil: body.validUntil || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'pending',
        },
    });

    // Notify the client who made the request
    notifyClientOfOffer(saved.id).catch(console.error);

    return NextResponse.json(saved, { status: 201 });
}
