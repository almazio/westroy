import { prisma } from '../db';
import { notificationService } from './transports';

function getAppBaseUrl() {
    return process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

export async function notifyOps(subject: string, message: string, metadata?: Record<string, unknown>) {
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.SMTP_USER || 'ops@westroy.local';
    await notificationService.notify({
        to: adminEmail,
        subject,
        message,
        type: 'system',
        metadata: { ...(metadata || {}), ops: true },
    });
}

export async function notifyProducersOfRequest(requestId: string) {
    try {
        const request = await prisma.request.findUnique({
            where: { id: requestId },
            include: { category: true }
        });

        if (!request || !request.category || !request.categoryId) return;

        const producers = await prisma.company.findMany({
            where: { categories: { some: { categoryId: request.categoryId } } },
            include: { owner: true }
        });

        for (const company of producers) {
            if (company.owner?.email) {
                await notificationService.notify({
                    to: company.owner.email,
                    subject: `Новый запрос: ${request.parsedCategory}`,
                    message: `Поступил новый запрос в категории "${request.category.nameRu}".\n\nТекст: "${request.query}"\nГород: ${request.parsedCity}\nОбъем: ${request.parsedVolume || 'Не указан'}\n\nПосмотреть в кабинете: ${getAppBaseUrl()}/dashboard/producer`,
                    type: 'request_new',
                    metadata: { requestId, companyId: company.id }
                });
            }
        }

        await notifyOps(
            `Новый клиентский запрос: ${request.parsedCategory}`,
            `Запрос: ${request.query}\nГород: ${request.parsedCity}\nКатегория: ${request.category.nameRu}\nID: ${request.id}\n\nОткрыть: ${getAppBaseUrl()}/admin`,
            { requestId: request.id }
        );
    } catch (error) {
        console.error('Failed to notify producers of request:', error);
    }
}

export async function notifyClientOfOffer(offerId: string) {
    try {
        const offer = await prisma.offer.findUnique({
            where: { id: offerId },
            include: {
                request: { include: { user: true } },
                company: true
            }
        });

        if (!offer || !offer.request || !offer.request.user?.email) return;

        await notificationService.notify({
            to: offer.request.user.email,
            subject: `Новое предложение по запросу "${offer.request.parsedCategory}"`,
            message: `Компания "${offer.company.name}" отправила вам предложение.\n\nЦена: ${offer.price} ₸ ${offer.priceUnit}\n\nПосмотреть предложение: ${getAppBaseUrl()}/dashboard/client`,
            type: 'offer_new',
            metadata: { offerId, requestId: offer.requestId }
        });

        await notifyOps(
            `Новое предложение от поставщика`,
            `Компания: ${offer.company.name}\nЗапрос: ${offer.request.query}\nЦена: ${offer.price} ₸ ${offer.priceUnit}\nID оффера: ${offer.id}\n\nОткрыть: ${getAppBaseUrl()}/admin`,
            { offerId: offer.id, requestId: offer.requestId }
        );
    } catch (error) {
        console.error('Failed to notify client of offer:', error);
    }
}

export async function notifyProducerOfOfferStatus(offerId: string) {
    try {
        const offer = await prisma.offer.findUnique({
            where: { id: offerId },
            include: {
                company: { include: { owner: true } },
                request: true
            }
        });

        if (!offer || !offer.request || !offer.company.owner?.email) return;

        // the "status" of the offer is not explicitly stored anymore, instead the associated Request gets finished
        const isAccepted = offer.request.status === 'completed';
        const statusText = isAccepted ? 'ПРИНЯТО' : 'ОТКЛОНЕНО';

        await notificationService.notify({
            to: offer.company.owner.email,
            subject: `Ваше предложение ${statusText}`,
            message: `Клиент ${isAccepted ? 'принял' : 'отклонил'} ваше предложение по запросу "${offer.request.parsedCategory}".\n\nСтатус: ${statusText}\n\nПосмотреть детали: ${getAppBaseUrl()}/dashboard/producer`,
            type: isAccepted ? 'offer_accepted' : 'offer_rejected',
            metadata: { offerId, requestId: offer.requestId }
        });

        await notifyOps(
            `Изменение статуса оффера: ${statusText}`,
            `Компания: ${offer.company.name}\nКатегория: ${offer.request.parsedCategory}\nСтатус: ${statusText}\nID оффера: ${offer.id}\n\nОткрыть: ${getAppBaseUrl()}/admin`,
            { offerId: offer.id, requestId: offer.requestId, status: isAccepted ? 'accepted' : 'rejected' }
        );
    } catch (error) {
        console.error('Failed to notify producer of offer status:', error);
    }
}
