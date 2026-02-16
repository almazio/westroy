import { NextResponse } from 'next/server';
import { notificationService } from '@/lib/notifications';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

type PartnerApplication = {
    id: string;
    name: string;
    email: string;
    phone: string;
    companyName: string;
    category: string;
    city: string;
    message: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
};

export async function GET() {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const applications = await prisma.partnerApplication.findMany({
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(applications);
    } catch (error) {
        console.error('Failed to fetch partner applications:', error);
        return NextResponse.json({ error: 'Не удалось загрузить заявки' }, { status: 500 });
    }
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
            status: 'pending',
            createdAt: new Date().toISOString(),
        };

        await prisma.partnerApplication.create({
            data: {
                name: application.name,
                email: application.email,
                phone: application.phone,
                companyName: application.companyName,
                category: application.category,
                city: application.city,
                message: application.message,
                status: application.status,
            },
        });

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
