import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { notificationService } from '@/lib/notifications';
import { auth } from '@/auth';

type PartnerApplication = {
    id: string;
    name: string;
    email: string;
    phone: string;
    companyName: string;
    category: string;
    city: string;
    message: string;
    createdAt: string;
};

const isVercel = Boolean(process.env.VERCEL);
const storageDir = isVercel ? '/tmp' : path.join(process.cwd(), 'data');
const storageFile = path.join(storageDir, 'partner-applications.json');

async function readApplications(): Promise<PartnerApplication[]> {
    try {
        const raw = await fs.readFile(storageFile, 'utf8');
        const parsed = JSON.parse(raw) as unknown;
        return Array.isArray(parsed) ? (parsed as PartnerApplication[]) : [];
    } catch {
        return [];
    }
}

async function writeApplications(applications: PartnerApplication[]) {
    await fs.mkdir(storageDir, { recursive: true });
    await fs.writeFile(storageFile, JSON.stringify(applications, null, 2), 'utf8');
}

export async function GET() {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const applications = await readApplications();
    return NextResponse.json(applications);
}

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as Partial<PartnerApplication>;
        const name = String(body.name || '').trim();
        const email = String(body.email || '').trim().toLowerCase();
        const phone = String(body.phone || '').trim();
        const companyName = String(body.companyName || '').trim();
        const category = String(body.category || '').trim();
        const city = String(body.city || '').trim();
        const message = String(body.message || '').trim();

        if (!name || !email || !phone || !companyName || !category || !city) {
            return NextResponse.json({ error: 'Заполните обязательные поля' }, { status: 400 });
        }

        const application: PartnerApplication = {
            id: crypto.randomUUID(),
            name,
            email,
            phone,
            companyName,
            category,
            city,
            message,
            createdAt: new Date().toISOString(),
        };

        // On Vercel, filesystem is ephemeral/read-only outside /tmp.
        // We persist when possible, but don't fail submission if storage write fails.
        try {
            const applications = await readApplications();
            applications.unshift(application);
            await writeApplications(applications);
        } catch (storageError) {
            console.error('Partner application storage warning:', storageError);
        }

        const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.SMTP_USER;
        if (adminEmail) {
            await notificationService.notify({
                to: adminEmail,
                subject: `Новая заявка партнера: ${companyName}`,
                message:
                    `Компания: ${companyName}\n` +
                    `Контакт: ${name}\n` +
                    `Email: ${email}\n` +
                    `Телефон: ${phone}\n` +
                    `Категория: ${category}\n` +
                    `Город: ${city}\n` +
                    `Комментарий: ${message || '—'}`,
                type: 'request_new',
                metadata: { applicationId: application.id },
            });
        }

        return NextResponse.json({ ok: true, received: true }, { status: 201 });
    } catch (error) {
        console.error('Failed to submit partner application:', error);
        return NextResponse.json({ error: 'Не удалось отправить заявку' }, { status: 500 });
    }
}
