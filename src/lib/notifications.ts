
import nodemailer, { type Transporter } from 'nodemailer';
import fs from 'fs';
import path from 'path';

export interface NotificationPayload {
    to: string;
    subject: string;
    message: string;
    type: 'request_new' | 'offer_new' | 'offer_accepted' | 'offer_rejected';
    metadata?: Record<string, unknown>;
}

export interface NotificationTransport {
    send(payload: NotificationPayload): Promise<void>;
}

class ConsoleTransport implements NotificationTransport {
    async send(payload: NotificationPayload) {
        const logEntry = `[${new Date().toISOString()}] ${payload.type.toUpperCase()} | To: ${payload.to} | Subject: ${payload.subject}\nMessage: ${payload.message}\n---\n`;
        const logPath = path.join(process.cwd(), 'notifications.log');
        try {
            fs.appendFileSync(logPath, logEntry);
        } catch (e) {
            console.error('Failed to write to notifications.log', e);
        }
        console.log(`[Notification Console] To: ${payload.to} | Subject: ${payload.subject}`);
    }
}

class EmailTransport implements NotificationTransport {
    private transporter: Transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }

    async send(payload: NotificationPayload) {
        if (!process.env.SMTP_HOST) return;
        try {
            await this.transporter.sendMail({
                from: process.env.SMTP_FROM || '"WESTROY" <noreply@westroy.kz>',
                to: payload.to,
                subject: payload.subject,
                text: payload.message,
                html: `
                    <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                        <h2 style="color: #333;">${payload.subject}</h2>
                        <p style="white-space: pre-wrap;">${payload.message}</p>
                        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                        <footer style="font-size: 12px; color: #888;">
                            Это автоматическое уведомление от платформы WESTROY.
                        </footer>
                    </div>
                `,
            });
        } catch (error) {
            console.error('[EmailTransport Error]:', error);
        }
    }
}

export class NotificationService {
    private transports: NotificationTransport[] = [];

    constructor() {
        // Always include console for dev monitoring
        this.transports.push(new ConsoleTransport());

        if (process.env.SMTP_HOST) {
            this.transports.push(new EmailTransport());
            console.log('[NotificationService] Email transport initialized');
        } else {
            console.log('[NotificationService] SMTP_HOST not set, using console fallback only');
        }
    }

    async notify(payload: NotificationPayload) {
        // Fire and forget or await all? 
        // Awaiting all ensures they are sent before the request finishes, 
        // but might slow down the API.
        // For constructed constructor logic, Promise.all is fine.
        await Promise.all(this.transports.map(t => t.send(payload)));
    }
}

// Singleton instance
export const notificationService = new NotificationService();

import { prisma } from './db';

function getAppBaseUrl() {
    return process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

export async function notifyProducersOfRequest(requestId: string) {
    try {
        const request = await prisma.request.findUnique({
            where: { id: requestId },
            include: { category: true }
        });

        if (!request) return;

        const producers = await prisma.company.findMany({
            where: { categoryId: request.categoryId },
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

        if (!offer || !offer.request.user.email) return;

        await notificationService.notify({
            to: offer.request.user.email,
            subject: `Новое предложение по запросу "${offer.request.parsedCategory}"`,
            message: `Компания "${offer.company.name}" отправила вам предложение.\n\nЦена: ${offer.price} ₸ ${offer.priceUnit}\nКомментарий: ${offer.comment}\n\nПосмотреть предложение: ${getAppBaseUrl()}/dashboard/client`,
            type: 'offer_new',
            metadata: { offerId, requestId: offer.requestId }
        });
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

        if (!offer || !offer.company.owner?.email) return;

        const statusText = offer.status === 'accepted' ? 'ПРИНЯТО' : 'ОТКЛОНЕНО';

        await notificationService.notify({
            to: offer.company.owner.email,
            subject: `Ваше предложение ${statusText}`,
            message: `Клиент ${offer.status === 'accepted' ? 'принял' : 'отклонил'} ваше предложение по запросу "${offer.request.parsedCategory}".\n\nСтатус: ${statusText}\n\nПосмотреть детали: ${getAppBaseUrl()}/dashboard/producer`,
            type: offer.status === 'accepted' ? 'offer_accepted' : 'offer_rejected',
            metadata: { offerId, requestId: offer.requestId }
        });
    } catch (error) {
        console.error('Failed to notify producer of offer status:', error);
    }
}
