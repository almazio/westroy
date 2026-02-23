import { NextResponse } from 'next/server';
import { notifyOps } from '@/lib/notifications';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { PartnerApplicationSchema, parseBody } from '@/lib/schemas';

const log = createLogger('api');

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
        log.error('Failed to fetch partner applications:', error);
        return NextResponse.json({ error: 'Не удалось загрузить заявки' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const raw = await request.json();
        const parsed = parseBody(PartnerApplicationSchema, raw);
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error }, { status: 400 });
        }
        const body = parsed.data;

        const application = await prisma.partnerApplication.create({
            data: {
                name: body.name,
                email: body.email,
                phone: body.phone,
                companyName: body.companyName,
                category: body.category,
                city: body.city,
                message: body.message || null,
                status: 'pending',
            },
        });

        await notifyOps(
            `Новая заявка на подключение: ${body.companyName}`,
            `Компания: ${body.companyName}\nКонтакт: ${body.name}\nEmail: ${body.email}\nТелефон: ${body.phone}\nКатегория: ${body.category}\nГород: ${body.city}\nКомментарий: ${body.message || '—'}\n\nОткрыть: /admin -> Партнеры`,
            { applicationId: application.id, type: 'partner_application' }
        );

        return NextResponse.json({ ok: true, received: true }, { status: 201 });
    } catch (error) {
        log.error('Failed to submit partner application:', error);
        return NextResponse.json({ error: 'Не удалось отправить заявку' }, { status: 500 });
    }
}
