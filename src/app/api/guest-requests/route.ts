import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { notifyOps } from '@/lib/notifications';
import { checkRateLimit, getClientIp, rateLimits } from '@/lib/rate-limit';
import { GuestRequestSchema, parseBody } from '@/lib/schemas';

interface GuestRequestBody {
    name?: string;
    phone?: string;
    quantity?: string;
    address?: string;
    query?: string;
    companyName?: string;
    productName?: string;
    sellerName?: string;
    city?: string;
}

export async function POST(request: NextRequest) {
    try {
        const rl = checkRateLimit(getClientIp(request), rateLimits.guestForm);
        if (!rl.success) {
            return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
        }

        const raw = await request.json();
        const parsed = parseBody(GuestRequestSchema, raw);
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error }, { status: 400 });
        }
        const body = parsed.data;

        // Persist to DB first — never lose a lead
        const saved = await prisma.guestRequest.create({
            data: {
                name: body.name,
                phone: body.phone,
                query: body.query,
                quantity: body.quantity || null,
                address: body.address || null,
                companyName: body.companyName || null,
                productName: body.productName || null,
                sellerName: body.sellerName || null,
                city: body.city || null,
            },
        });

        // Notify ops (best-effort, don't fail if notification fails)
        const message = [
            `Имя: ${body.name}`,
            `Телефон: ${body.phone}`,
            `Запрос: ${body.query}`,
            body.quantity ? `Количество: ${body.quantity}` : null,
            body.address ? `Адрес: ${body.address}` : null,
            body.companyName ? `Поставщик: ${body.companyName}` : null,
            body.productName ? `Товар: ${body.productName}` : null,
            body.sellerName ? `Канал продажи: ${body.sellerName}` : null,
            body.city ? `Город: ${body.city}` : null,
        ]
            .filter(Boolean)
            .join('\n');

        notifyOps(
            'Новая гостевая заявка',
            `${message}\n\nИсточник: /search (guest inline flow)`,
            { source: 'guest_request', guestRequestId: saved.id }
        ).catch(() => { /* notification failure is non-critical */ });

        return NextResponse.json({ ok: true }, { status: 201 });
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to create guest request', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
