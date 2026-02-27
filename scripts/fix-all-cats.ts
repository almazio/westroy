import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Reorganizing ALL legacy categories...');

    // 1. Moving everything that should belong to "Строительные материалы" -> "Стеновые материалы"
    await prisma.category.updateMany({
        where: { id: { in: ['bricks', 'blocks'] } }, // Кирпич, Блоки и кирпич
        data: { parentId: 'stenovye-materialy' }
    });

    // 2. Moving everything that should belong to "Строительные материалы" -> "Сыпучие и инертные"
    await prisma.category.updateMany({
        where: { id: { in: ['sand', 'crushed-stone', 'aggregates'] } }, // Песок, Щебень, Инертные
        data: { parentId: 'sypuchie-i-inertnye' }
    });

    // 3. Moving everything that should belong to "Строительные материалы" -> "Общестроительные материалы" (we create it or use concrete)
    // Actually, let's put Cement in "Сыпучие и инертные" or "Строительные материалы" directly
    await prisma.category.updateMany({
        where: { id: 'cement' }, // Цемент
        data: { parentId: 'sypuchie-i-inertnye' } // Or stroitelnye-materialy
    });

    // 4. Moving everything that should belong to "Отделочные материалы"
    await prisma.category.updateMany({
        where: { id: { in: ['finishing-materials', 'painters-tools', 'adhesives-sealants', 'plumbing', 'electrical', 'pvc-profiles', 'fasteners', 'hand-tools'] } },
        data: { parentId: 'otdelochnye-materialy' }
    });

    // 5. Machinery & Safety remain at root.
    // 'machinery'
    // 'safety'

    // Let's also clean up any duplicate root categories that exist. 
    // Wait, the screenshot shows "Кирпич", "Клеи", "Крепеж" at the root level.
    // That means their ID is 'bricks', 'adhesives-sealants', etc. and parentId is currently null.
    // My script above sets their parentId into the new tree.

    console.log('All legacy categories have been nested correctly!');
}

main().finally(() => prisma.$disconnect());
