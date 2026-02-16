
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
    try {
        // Seed Regions
        const regions = [
            { id: 'kz-shim', name: 'Shymkent', nameRu: 'Шымкент' },
            { id: 'kz-turk', name: 'Turkestan', nameRu: 'Туркестан' },
        ];

        for (const r of regions) {
            await prisma.region.upsert({
                where: { id: r.id },
                update: {},
                create: r
            });
        }

        // Seed Categories
        const categories = [
            { id: 'concrete', name: 'Concrete', nameRu: 'Бетон', icon: '🧱', keywords: '["бетон", "раствор", "м200", "м300", "м400"]' },
            { id: 'sand', name: 'Sand', nameRu: 'Песок', icon: '⌛', keywords: '["песок", "мытый", "барханный"]' },
            { id: 'stone', name: 'Crushed Stone', nameRu: 'Щебень', icon: '🪨', keywords: '["щебень", "гравий"]' },
            { id: 'brick', name: 'Brick', nameRu: 'Кирпич', icon: '🧱', keywords: '["кирпич", "жженый", "сырцовый"]' },
            { id: 'cement', name: 'Cement', nameRu: 'Цемент', icon: '🏗️', keywords: '["цемент", "м400", "м500"]' },
        ];

        for (const c of categories) {
            await prisma.category.upsert({
                where: { id: c.id },
                update: {},
                create: c
            });
        }

        return NextResponse.json({ success: true, message: 'Seeding completed' });
    } catch (error) {
        console.error('Seeding error:', error);
        return NextResponse.json({ error: 'Seeding failed', details: String(error) }, { status: 500 });
    }
}
