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

export async function addOffer(data: Offer): Promise<Offer> {
    const offer = await prisma.offer.create({
        data: {
            id: data.id,
            requestId: data.requestId,
            companyId: data.companyId,
            price: data.price,
            priceUnit: data.priceUnit,
            comment: data.comment,
            deliveryIncluded: data.deliveryIncluded,
            deliveryPrice: data.deliveryPrice ?? null,
            validUntil: data.validUntil,
            status: data.status,
            createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
        },
    });
    return mapOffer(offer as unknown as OfferDbRecord);
}

export async function getCompanyMarketStats(
    companyIds: string[]
): Promise<Record<string, { completedOrders: number; avgResponseMinutes: number | null }>> {
    if (companyIds.length === 0) return {};

    const offers = await prisma.offer.findMany({
        where: { companyId: { in: companyIds } },
        select: {
            companyId: true,
            status: true,
            createdAt: true,
            request: {
                select: {
                    createdAt: true,
                },
            },
        },
    });

    const stats: Record<string, { completedOrders: number; totalResponseMinutes: number; responseCount: number }> = {};
    for (const companyId of companyIds) {
        stats[companyId] = { completedOrders: 0, totalResponseMinutes: 0, responseCount: 0 };
    }

    for (const offer of offers) {
        const bucket = stats[offer.companyId];
        if (!bucket) continue;

        if (offer.status === 'accepted') {
            bucket.completedOrders += 1;
        }

        const requestCreatedAt = offer.request?.createdAt;
        if (requestCreatedAt) {
            const responseMinutes = Math.max(
                0,
                Math.round((offer.createdAt.getTime() - requestCreatedAt.getTime()) / (1000 * 60))
            );
            bucket.totalResponseMinutes += responseMinutes;
            bucket.responseCount += 1;
        }
    }

    const result: Record<string, { completedOrders: number; avgResponseMinutes: number | null }> = {};
    for (const [companyId, value] of Object.entries(stats)) {
        result[companyId] = {
            completedOrders: value.completedOrders,
            avgResponseMinutes: value.responseCount > 0
                ? Math.round(value.totalResponseMinutes / value.responseCount)
                : null,
        };
    }

    return result;
}
