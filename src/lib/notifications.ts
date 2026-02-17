
import nodemailer, { type Transporter } from 'nodemailer';
import fs from 'fs';
import path from 'path';

export interface NotificationPayload {
    to: string;
    subject: string;
    message: string;
    type: 'request_new' | 'offer_new' | 'offer_accepted' | 'offer_rejected' | 'partner_application' | 'system';
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
        if (!payload.to.includes('@')) return;
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

class TelegramTransport implements NotificationTransport {
    private readonly botToken: string;
    private readonly chatIds: string[];

    constructor(botToken: string, chatIds: string[]) {
        this.botToken = botToken;
        this.chatIds = chatIds;
    }

    async send(payload: NotificationPayload) {
        if (!payload.metadata?.ops) return;

        const text = `<b>${escapeHtml(payload.subject)}</b>\n\n${escapeHtml(payload.message)}`;
        const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;

        await Promise.all(this.chatIds.map(async (chatId) => {
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text,
                        parse_mode: 'HTML',
                        disable_web_page_preview: true,
                    }),
                });

                if (!response.ok) {
                    const body = await response.text().catch(() => '');
                    console.error('[TelegramTransport Error]:', response.status, body);
                }
            } catch (error) {
                console.error('[TelegramTransport Error]:', error);
            }
        }));
    }
}

function escapeHtml(input: string) {
    return input
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');
}

function getTelegramChatIds() {
    const raw = process.env.TELEGRAM_CHAT_IDS || process.env.TELEGRAM_CHAT_ID || process.env.ADMIN_TELEGRAM_CHAT_ID || '';
    return raw
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
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

        const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
        const telegramChatIds = getTelegramChatIds();
        if (telegramBotToken && telegramChatIds.length > 0) {
            this.transports.push(new TelegramTransport(telegramBotToken, telegramChatIds));
            console.log('[NotificationService] Telegram transport initialized');
        } else {
            console.log('[NotificationService] Telegram not configured (TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_IDS)');
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

        if (!offer || !offer.request.user.email) return;

        await notificationService.notify({
            to: offer.request.user.email,
            subject: `Новое предложение по запросу "${offer.request.parsedCategory}"`,
            message: `Компания "${offer.company.name}" отправила вам предложение.\n\nЦена: ${offer.price} ₸ ${offer.priceUnit}\nКомментарий: ${offer.comment}\n\nПосмотреть предложение: ${getAppBaseUrl()}/dashboard/client`,
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

        if (!offer || !offer.company.owner?.email) return;

        const statusText = offer.status === 'accepted' ? 'ПРИНЯТО' : 'ОТКЛОНЕНО';

        await notificationService.notify({
            to: offer.company.owner.email,
            subject: `Ваше предложение ${statusText}`,
            message: `Клиент ${offer.status === 'accepted' ? 'принял' : 'отклонил'} ваше предложение по запросу "${offer.request.parsedCategory}".\n\nСтатус: ${statusText}\n\nПосмотреть детали: ${getAppBaseUrl()}/dashboard/producer`,
            type: offer.status === 'accepted' ? 'offer_accepted' : 'offer_rejected',
            metadata: { offerId, requestId: offer.requestId }
        });

        await notifyOps(
            `Изменение статуса оффера: ${statusText}`,
            `Компания: ${offer.company.name}\nКатегория: ${offer.request.parsedCategory}\nСтатус: ${statusText}\nID оффера: ${offer.id}\n\nОткрыть: ${getAppBaseUrl()}/admin`,
            { offerId: offer.id, requestId: offer.requestId, status: offer.status }
        );
    } catch (error) {
        console.error('Failed to notify producer of offer status:', error);
    }
}
