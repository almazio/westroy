import nodemailer, { type Transporter } from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { createLogger } from '../logger';

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

export function escapeHtml(input: string) {
    return input
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');
}

class ConsoleTransport implements NotificationTransport {
    private log = createLogger('ConsoleTransport');

    async send(payload: NotificationPayload) {
        const logEntry = `[${new Date().toISOString()}] ${payload.type.toUpperCase()} | To: ${payload.to} | Subject: ${payload.subject}\nMessage: ${payload.message}\n---\n`;
        const logPath = path.join(process.cwd(), 'notifications.log');
        try {
            fs.appendFileSync(logPath, logEntry);
        } catch (e) {
            this.log.error('Failed to write to notifications.log', e);
        }
        this.log.info(`To: ${payload.to} | Subject: ${payload.subject}`);
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
                        <h2 style="color: #333;">${escapeHtml(payload.subject)}</h2>
                        <p style="white-space: pre-wrap;">${escapeHtml(payload.message)}</p>
                        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                        <footer style="font-size: 12px; color: #888;">
                            Это автоматическое уведомление от платформы WESTROY.
                        </footer>
                    </div>
                `,
            });
        } catch (error) {
            createLogger('EmailTransport').error('Failed to send email', error);
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
                    createLogger('TelegramTransport').error('Send failed', null, { status: response.status, body });
                }
            } catch (error) {
                createLogger('TelegramTransport').error('Send failed', error);
            }
        }));
    }
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
    private log = createLogger('NotificationService');

    constructor() {
        // Always include console for dev monitoring
        this.transports.push(new ConsoleTransport());

        if (process.env.SMTP_HOST) {
            this.transports.push(new EmailTransport());
            this.log.info('Email transport initialized');
        } else {
            this.log.info('SMTP_HOST not set, using console fallback only');
        }

        const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
        const telegramChatIds = getTelegramChatIds();
        if (telegramBotToken && telegramChatIds.length > 0) {
            this.transports.push(new TelegramTransport(telegramBotToken, telegramChatIds));
            this.log.info('Telegram transport initialized');
        } else {
            this.log.info('Telegram not configured');
        }
    }

    async notify(payload: NotificationPayload) {
        await Promise.all(this.transports.map(t => t.send(payload)));
    }
}

export const notificationService = new NotificationService();
