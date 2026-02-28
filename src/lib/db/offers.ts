import { prisma } from '../db';
import { Offer } from '../types';
import { mapOffer, OfferDbRecord } from './mappers';

export async function getOffers(): Promise<Offer[]> {
    const offers = await prisma.offer.findMany();
    return offers.map(mapOffer);
}

export async function getOffersByRequest(requestId: string): Promise<Offer[]> {
    const offers = await prisma.offer.findMany({ where: { requestId } });
    return offers.map(mapOffer);
}

export async function getOffersByCompany(companyId: string): Promise<Offer[]> {
    const offers = await prisma.offer.findMany({ where: { companyId } });
    return offers.map(mapOffer);
}

export async function getOffersByProduct(productId: string): Promise<Offer[]> {
    const offers = await prisma.offer.findMany({
        where: { productId },
        include: { company: true }
    });
    return offers.map(mapOffer);
}

export async function addOffer(data: Offer): Promise<Offer> {
    const offer = await prisma.offer.create({
        data: {
            id: data.id,
            productId: data.productId || null,
            requestId: data.requestId || null,
            companyId: data.companyId,
            price: data.price,
            priceUnit: data.priceUnit,
            oldPrice: data.oldPrice || null,
            discountLabel: data.discountLabel || null,
            minOrder: data.minOrder || null,
            stockStatus: data.stockStatus || 'IN_STOCK',
            leadTime: data.leadTime || null,
            deliveryPrice: data.deliveryPrice ?? null,
            createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
        },
    });
    return mapOffer(offer as unknown as OfferDbRecord);
}

export async function getCompanyMarketStats(
    companyIds: string[]
): Promise<Record<string, { completedOrders: number; avgResponseMinutes: number | null; rating: number; reviewCount: number }>> {
    if (companyIds.length === 0) return {};

    const orders = await prisma.order.findMany({
        where: { companyId: { in: companyIds } },
        select: {
            companyId: true,
            status: true,
            createdAt: true,
        },
    });

    const stats: Record<string, { completedOrders: number; totalResponseMinutes: number; responseCount: number }> = {};
    for (const companyId of companyIds) {
        stats[companyId] = { completedOrders: 0, totalResponseMinutes: 0, responseCount: 0 };
    }

    for (const order of orders) {
        const bucket = stats[order.companyId];
        if (!bucket) continue;

        if (order.status === 'completed' || order.status === 'delivered') { // Assumed statuses based on common implementations
            bucket.completedOrders += 1;
        }

        // Response time logic removed for Orders as it doesn't align perfectly, 
        // can be added back if we link Orders to Requests with response tracking.
    }

    const result: Record<string, { completedOrders: number; avgResponseMinutes: number | null; rating: number; reviewCount: number }> = {};
    for (const [companyId, value] of Object.entries(stats)) {
        result[companyId] = {
            completedOrders: value.completedOrders,
            avgResponseMinutes: value.responseCount > 0
                ? Math.round(value.totalResponseMinutes / value.responseCount)
                : null,
            rating: 0,
            reviewCount: 0,
        };
    }

    const reviews = await prisma.review.findMany({
        where: { companyId: { in: companyIds } },
        select: { companyId: true, rating: true },
    });

    for (const review of reviews) {
        if (result[review.companyId]) {
            result[review.companyId].rating += review.rating;
            result[review.companyId].reviewCount += 1;
        }
    }

    // Convert accumulated rating to average
    for (const companyId of Object.keys(result)) {
        if (result[companyId].reviewCount > 0) {
            result[companyId].rating = Math.round((result[companyId].rating / result[companyId].reviewCount) * 10) / 10;
        } else {
            result[companyId].rating = 5.0; // Default rating if no reviews
        }
    }

    return result;
}
