import { prisma } from '../db';
import { Request } from '../types';
import { mapRequest, RequestDbRecord } from './mappers';

export async function getRequests(): Promise<Request[]> {
    const requests = await prisma.request.findMany();
    return requests.map(mapRequest);
}

export async function getRequestById(id: string): Promise<Request | undefined> {
    const request = await prisma.request.findUnique({ where: { id } });
    return request ? mapRequest(request) : undefined;
}

export async function getRequestsByUser(userId: string): Promise<Request[]> {
    const requests = await prisma.request.findMany({ where: { userId } });
    return requests.map(mapRequest);
}

export async function getRequestsByCategory(categoryId: string): Promise<Request[]> {
    const requests = await prisma.request.findMany({ where: { categoryId } });
    return requests.map(mapRequest);
}

export async function addRequest(data: Request): Promise<Request> {
    const request = await prisma.request.create({
        data: {
            id: data.id,
            userId: data.userId,
            categoryId: data.categoryId,
            query: data.query,
            parsedCategory: data.parsedCategory,
            parsedVolume: data.parsedVolume || null,
            parsedCity: data.parsedCity,
            deliveryNeeded: data.deliveryNeeded,
            address: data.address || null,
            deadline: data.deadline || null,
            status: data.status,
            createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
        },
    });
    return mapRequest(request as unknown as RequestDbRecord);
}
