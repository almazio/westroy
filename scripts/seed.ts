import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Start seeding ...')

    // 1. Regions
    const regions = [
        { id: 'shymkent', name: 'Shymkent', nameRu: 'Шымкент' },
        { id: 'turkestan', name: 'Turkestan', nameRu: 'Туркестан' },
    ]

    for (const r of regions) {
        await prisma.region.upsert({
            where: { id: r.id },
            update: {},
            create: r,
        })
    }

    // 2. Categories
    const categories = [
        {
            id: 'concrete',
            name: 'Concrete',
            nameRu: 'Бетон',
            icon: '🏗️',
            keywords: JSON.stringify(['бетон', 'раствор', 'м100', 'м150', 'м200', 'м250', 'м300', 'м350', 'м400', 'м500', 'бетонный']),
        },
        {
            id: 'aggregates',
            name: 'Aggregates',
            nameRu: 'Инертные материалы',
            icon: '⛰️',
            keywords: JSON.stringify(['песок', 'щебень', 'гравий', 'отсев', 'пгс', 'инертные', 'инертных']),
        },
        {
            id: 'blocks',
            name: 'Blocks & Bricks',
            nameRu: 'Кирпич и блоки',
            icon: '🧱',
            keywords: JSON.stringify(['кирпич', 'газоблок', 'пеноблок', 'блок', 'газобетон', 'пенобетон', 'шлакоблок', 'керамзитоблок']),
        },
        {
            id: 'rebar',
            name: 'Rebar & Metal',
            nameRu: 'Арматура и металлопрокат',
            icon: '🔩',
            keywords: JSON.stringify(['арматура', 'металл', 'прокат', 'металлопрокат', 'швеллер', 'уголок', 'труба', 'лист', 'балка', 'сетка']),
        },
        {
            id: 'machinery',
            name: 'Machinery',
            nameRu: 'Спецтехника',
            icon: '🚜',
            keywords: JSON.stringify(['спецтехника', 'экскаватор', 'кран', 'бульдозер', 'погрузчик', 'автокран', 'миксер', 'самосвал', 'техника']),
        },
    ]

    for (const c of categories) {
        await prisma.category.upsert({
            where: { id: c.id },
            update: {},
            create: c,
        })
    }

    // 3. Users
    const users = [
        { id: 'u1', name: 'Асылбек Нурланов', email: 'client@demo.kz', phone: '+7 700 111 2233', role: 'client' },
        { id: 'u2', name: 'Бауыржан Серіков', email: 'producer@demo.kz', phone: '+7 700 444 5566', role: 'producer' }, // Linked to company later
        { id: 'u3', name: 'Админ WESTROY', email: 'admin@demo.kz', phone: '+7 700 000 0000', role: 'admin' },
    ]

    for (const u of users) {
        await prisma.user.upsert({
            where: { email: u.email },
            update: {},
            create: u,
        })
    }

    // 4. Companies
    const companies = [
        {
            id: 'beton-shymkent',
            name: 'БетонШымкент',
            description: 'Крупнейший производитель товарного бетона в Шымкенте.',
            baseCityId: 'shymkent',
            address: 'ул. Промышленная, 45, Шымкент',
            phone: '+7 (725) 123-45-67',
            delivery: true,
            verified: true,
            ownerId: 'u2', // Linked to producer user
            createdAt: new Date('2024-01-15'),
        },
        {
            id: 'mega-beton',
            name: 'МегаБетон',
            description: 'Производство бетона всех марок.',
            baseCityId: 'shymkent',
            address: 'пр. Тауке хана, 120, Шымкент',
            phone: '+7 (725) 234-56-78',
            delivery: true,
            verified: true,
            createdAt: new Date('2024-02-20'),
        },
    ]

    for (const c of companies) {
        await prisma.company.upsert({
            where: { id: c.id },
            update: {},
            create: c,
        })
    }

    // 5. Products & Offers
    const productsData = [
        {
            id: 'p1', categoryId: 'concrete', name: 'Бетон М200 (B15)', description: 'Товарный бетон марки М200, класс B15.',
            offers: [
                { id: 'o1', companyId: 'beton-shymkent', price: 24000, priceUnit: 'за м³', stockStatus: 'IN_STOCK' },
                { id: 'o2', companyId: 'mega-beton', price: 23500, priceUnit: 'за м³', stockStatus: 'IN_STOCK' }
            ]
        },
        {
            id: 'p2', categoryId: 'concrete', name: 'Бетон М300 (B22.5)', description: 'Товарный бетон марки М300, класс B22.5.',
            offers: [
                { id: 'o3', companyId: 'beton-shymkent', price: 28000, priceUnit: 'за м³', stockStatus: 'IN_STOCK' }
            ]
        }
    ]

    for (const pd of productsData) {
        const product = await prisma.product.upsert({
            where: { id: pd.id },
            update: {},
            create: {
                id: pd.id,
                categoryId: pd.categoryId,
                name: pd.name,
                description: pd.description,
            },
        })

        for (const offerData of pd.offers) {
            await prisma.offer.upsert({
                where: { id: offerData.id },
                update: {},
                create: {
                    id: offerData.id,
                    productId: product.id,
                    companyId: offerData.companyId,
                    price: offerData.price,
                    priceUnit: offerData.priceUnit,
                    stockStatus: offerData.stockStatus as any,
                },
            })
        }
    }

    // 6. Requests
    const requests = [
        {
            id: 'r1', userId: 'u1', categoryId: 'concrete',
            query: 'Нужен бетон М300 20 кубов с доставкой',
            parsedCategory: 'Бетон', parsedVolume: '20 м³', parsedCity: 'Шымкент',
            deliveryNeeded: true, address: 'ул. Абая, 100, Шымкент', deadline: '2024-12-20',
            status: 'active', createdAt: new Date('2024-12-15T10:30:00'),
        },
    ]

    for (const r of requests) {
        await prisma.request.upsert({
            where: { id: r.id },
            update: {},
            create: r,
        })
    }

    console.log('Seeding finished.')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
