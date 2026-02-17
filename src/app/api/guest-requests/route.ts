import { NextRequest, NextResponse } from 'next/server';
import { notifyOps } from '@/lib/notifications';

interface GuestRequestBody {
    name?: string;
    phone?: string;
    quantity?: string;
    address?: string;
    query?: string;
    companyName?: string;
    productName?: string;
    city?: string;
}

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json()) as GuestRequestBody;

        if (!body.name || !body.phone || !body.query) {
            return NextResponse.json(
                { error: 'Missing required fields: name, phone, query' },
                { status: 400 }
            );
        }

        const message = [
            `Имя: ${body.name}`,
            `Телефон: ${body.phone}`,
            `Запрос: ${body.query}`,
            body.quantity ? `Количество: ${body.quantity}` : null,
            body.address ? `Адрес: ${body.address}` : null,
            body.companyName ? `Поставщик: ${body.companyName}` : null,
            body.productName ? `Товар: ${body.productName}` : null,
            body.city ? `Город: ${body.city}` : null,
        ]
            .filter(Boolean)
            .join('\n');

        await notifyOps(
            'Новая гостевая заявка',
            `${message}\n\nИсточник: /search (guest inline flow)`,
            { source: 'guest_request' }
        );

        return NextResponse.json({ ok: true }, { status: 201 });
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to create guest request', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}

