import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function slugify(text: string) {
    const ru: { [key: string]: string } = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e', 'ж': 'zh',
        'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
        'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'c',
        'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ь': '', 'ы': 'y', 'ъ': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
        ' ': '-', '(': '', ')': '', ',': ''
    };
    return text.toLowerCase().split('').map(char => ru[char] !== undefined ? ru[char] : char).join('').replace(/-+/g, '-').replace(/[^a-z0-9-]/g, '');
}

async function main() {
    console.log('Seeding category hierarchy from CSV data...');

    // The desired top-level and mid-level categories from the CSV
    const newCategories = [
        { id: slugify('Строительные материалы'), nameRu: 'Строительные материалы', icon: '🏗️', parentId: null },
        { id: slugify('Отделочные материалы'), nameRu: 'Отделочные материалы', icon: '🎨', parentId: null },
        { id: slugify('Пиломатериалы'), nameRu: 'Пиломатериалы', icon: '🪵', parentId: slugify('Строительные материалы') },
        { id: slugify('Кровельные материалы'), nameRu: 'Кровельные материалы', icon: '🏠', parentId: slugify('Строительные материалы') },
        { id: slugify('Листовые материалы'), nameRu: 'Листовые материалы', icon: '📜', parentId: slugify('Строительные материалы') },
        { id: slugify('Стеновые материалы'), nameRu: 'Стеновые материалы', icon: '🧱', parentId: slugify('Строительные материалы') },
        { id: slugify('Металлопрокат'), nameRu: 'Металлопрокат', icon: '🔩', parentId: slugify('Строительные материалы') },
        { id: slugify('Сыпучие и инертные'), nameRu: 'Сыпучие и инертные', icon: '⛰️', parentId: slugify('Строительные материалы') },
        { id: slugify('Фасады'), nameRu: 'Фасады', icon: '🏢', parentId: slugify('Отделочные материалы') },
    ];

    for (const c of newCategories) {
        await prisma.category.upsert({
            where: { id: c.id },
            update: { nameRu: c.nameRu, name: c.id, icon: c.icon, parentId: c.parentId },
            create: { id: c.id, nameRu: c.nameRu, name: c.id, icon: c.icon, keywords: '[]', parentId: c.parentId },
        });
        console.log(`Upserted category: ${c.nameRu}`);
    }

    // Now, update existing legacy categories to be nested under these new parents
    // concrete -> Строительные материалы -> (root for concrete) or directly under Строительные материалы
    await prisma.category.updateMany({
        where: { id: 'concrete' }, // Бетон
        data: { parentId: slugify('Строительные материалы') }
    });

    await prisma.category.updateMany({
        where: { id: 'blocks' }, // Блоки и кирпич
        data: { parentId: slugify('Стеновые материалы') }
    });

    await prisma.category.updateMany({
        where: { id: 'rebar' }, // Арматура
        data: { parentId: slugify('Металлопрокат') }
    });

    await prisma.category.updateMany({
        where: { id: 'aggregates' }, // Инертные
        data: { parentId: slugify('Сыпучие и инертные') }
    });

    // machinery (Спецтехника) probably makes sense to stay at the root level, so we don't update its parentId

    console.log('Hierarchy applied to existing legacy categories successfully!');
}

main().then(() => prisma.$disconnect()).catch(e => { console.error(e); process.exit(1); });
