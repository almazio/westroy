
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
            description: 'Крупнейший производитель товарного бетона в Шымкенте. Работаем с 2010 года. Собственный парк миксеров для оперативной доставки.',
            categoryId: 'concrete',
            regionId: 'shymkent',
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
            description: 'Производство бетона всех марок. Лаборатория контроля качества. Доставка по городу и области.',
            categoryId: 'concrete',
            regionId: 'shymkent',
            address: 'пр. Тауке хана, 120, Шымкент',
            phone: '+7 (725) 234-56-78',
            delivery: true,
            verified: true,
            createdAt: new Date('2024-02-20'),
        },
        {
            id: 'yug-inertnye',
            name: 'ЮгИнертные',
            description: 'Добыча и продажа инертных материалов: песок речной, щебень фракции 5-20, 20-40, ПГС. Прямые поставки с карьера.',
            categoryId: 'aggregates',
            regionId: 'shymkent',
            address: 'Сайрамский район, карьер «Южный»',
            phone: '+7 (725) 345-67-89',
            delivery: true,
            verified: true,
            createdAt: new Date('2024-03-10'),
        },
        {
            id: 'shymkent-blok',
            name: 'ШымкентБлок',
            description: 'Производство газобетонных и пенобетонных блоков. Сертифицированная продукция. Скидки при объёмных заказах.',
            categoryId: 'blocks',
            regionId: 'shymkent',
            address: 'ул. Строителей, 78, Шымкент',
            phone: '+7 (725) 456-78-90',
            delivery: true,
            verified: true,
            createdAt: new Date('2024-04-05'),
        },
        {
            id: 'metall-yug',
            name: 'МеталлЮг',
            description: 'Арматура, швеллер, уголок, профильная труба. Широкий ассортимент металлопроката со склада в Шымкенте.',
            categoryId: 'rebar',
            regionId: 'shymkent',
            address: 'ул. Металлургов, 15, Шымкент',
            phone: '+7 (725) 567-89-01',
            delivery: true,
            verified: true,
            createdAt: new Date('2024-05-12'),
        },
        {
            id: 'tech-stroy',
            name: 'ТехСтрой Аренда',
            description: 'Аренда спецтехники: экскаваторы, автокраны, миксеры, самосвалы. Опытные операторы. Почасовая и посменная оплата.',
            categoryId: 'machinery',
            regionId: 'shymkent',
            address: 'ул. Индустриальная, 200, Шымкент',
            phone: '+7 (725) 678-90-12',
            delivery: false,
            verified: true,
            createdAt: new Date('2024-06-01'),
        },
        {
            id: 'beton-plus-shym',
            name: 'Бетон Плюс',
            description: 'Бетон, раствор, доставка миксером. Быстрое выполнение заказов. Гибкая система скидок.',
            categoryId: 'concrete',
            regionId: 'shymkent',
            address: 'ул. Байтурсынова, 55, Шымкент',
            phone: '+7 (725) 111-22-33',
            delivery: true,
            verified: false,
            createdAt: new Date('2024-07-15'),
        },
        {
            id: 'pesok-shymkent',
            name: 'ПесокШымкент',
            description: 'Песок мытый, карьерный. Щебень всех фракций. Доставка самосвалами от 10 тонн.',
            categoryId: 'aggregates',
            regionId: 'shymkent',
            address: 'Абайский район, Шымкент',
            phone: '+7 (725) 222-33-44',
            delivery: true,
            verified: true,
            createdAt: new Date('2024-08-20'),
        },
    ]

    for (const c of companies) {
        await prisma.company.upsert({
            where: { id: c.id },
            update: {},
            create: c,
        })
    }

    // 5. Products
    const products = [
        {
            id: 'p1', companyId: 'beton-shymkent', categoryId: 'concrete',
            name: 'Бетон М200 (B15)', description: 'Товарный бетон марки М200, класс B15. Подходит для фундаментов, стяжек.',
            unit: 'м³', priceFrom: 24000, priceUnit: 'за м³', inStock: true,
        },
        {
            id: 'p2', companyId: 'beton-shymkent', categoryId: 'concrete',
            name: 'Бетон М300 (B22.5)', description: 'Товарный бетон марки М300, класс B22.5. Для монолитных работ, перекрытий.',
            unit: 'м³', priceFrom: 28000, priceUnit: 'за м³', inStock: true,
        },
        {
            id: 'p3', companyId: 'beton-shymkent', categoryId: 'concrete',
            name: 'Бетон М400 (B30)', description: 'Высокопрочный бетон М400. Для ответственных конструкций.',
            unit: 'м³', priceFrom: 32000, priceUnit: 'за м³', inStock: true,
        },
        {
            id: 'p4', companyId: 'mega-beton', categoryId: 'concrete',
            name: 'Бетон М200', description: 'Бетон М200 с доставкой миксером. Лабораторный контроль каждой партии.',
            unit: 'м³', priceFrom: 23500, priceUnit: 'за м³', inStock: true,
        },
        {
            id: 'p5', companyId: 'mega-beton', categoryId: 'concrete',
            name: 'Бетон М300', description: 'Бетон М300, подвижность П3-П4. Идеален для фундаментов и плит.',
            unit: 'м³', priceFrom: 27500, priceUnit: 'за м³', inStock: true,
        },
        {
            id: 'p6', companyId: 'beton-plus-shym', categoryId: 'concrete',
            name: 'Бетон М300', description: 'Бетон М300 с ускоренной доставкой. Работаем по выходным.',
            unit: 'м³', priceFrom: 29000, priceUnit: 'за м³', inStock: true,
        },
        {
            id: 'p7', companyId: 'yug-inertnye', categoryId: 'aggregates',
            name: 'Песок речной мытый', description: 'Чистый речной песок для строительных работ. Модуль крупности 2.0-2.5.',
            unit: 'тонна', priceFrom: 3500, priceUnit: 'за тонну', inStock: true,
        },
        {
            id: 'p8', companyId: 'yug-inertnye', categoryId: 'aggregates',
            name: 'Щебень фр. 5-20', description: 'Гранитный щебень фракции 5-20 мм. Для бетонных работ и дорожного строительства.',
            unit: 'тонна', priceFrom: 5500, priceUnit: 'за тонну', inStock: true,
        },
        {
            id: 'p9', companyId: 'yug-inertnye', categoryId: 'aggregates',
            name: 'Щебень фр. 20-40', description: 'Щебень фракции 20-40 мм. Для фундаментов и подушек.',
            unit: 'тонна', priceFrom: 5000, priceUnit: 'за тонну', inStock: true,
        },
        {
            id: 'p10', companyId: 'pesok-shymkent', categoryId: 'aggregates',
            name: 'Песок карьерный', description: 'Карьерный песок для засыпки, планировки, подготовительных работ.',
            unit: 'тонна', priceFrom: 2800, priceUnit: 'за тонну', inStock: true,
        },
        {
            id: 'p11', companyId: 'shymkent-blok', categoryId: 'blocks',
            name: 'Газоблок 600×200×300', description: 'Газобетонный блок D500. Для несущих стен до 3 этажей.',
            unit: 'м³', priceFrom: 22000, priceUnit: 'за м³', inStock: true,
        },
        {
            id: 'p12', companyId: 'shymkent-blok', categoryId: 'blocks',
            name: 'Пеноблок 600×200×300', description: 'Пенобетонный блок D600. Хорошая теплоизоляция.',
            unit: 'м³', priceFrom: 18000, priceUnit: 'за м³', inStock: true,
        },
        {
            id: 'p13', companyId: 'shymkent-blok', categoryId: 'blocks',
            name: 'Кирпич рядовой М150', description: 'Керамический кирпич М150 для кладки стен.',
            unit: 'шт', priceFrom: 45, priceUnit: 'за шт', inStock: true,
        },
        {
            id: 'p14', companyId: 'metall-yug', categoryId: 'rebar',
            name: 'Арматура A500C ∅12', description: 'Арматура рифлёная А500С, диаметр 12 мм. ГОСТ 34028-2016.',
            unit: 'тонна', priceFrom: 320000, priceUnit: 'за тонну', inStock: true,
        },
        {
            id: 'p15', companyId: 'metall-yug', categoryId: 'rebar',
            name: 'Швеллер 12П', description: 'Швеллер горячекатаный 12П. Для каркасных конструкций.',
            unit: 'тонна', priceFrom: 380000, priceUnit: 'за тонну', inStock: true,
        },
        {
            id: 'p16', companyId: 'metall-yug', categoryId: 'rebar',
            name: 'Профильная труба 80×40×3', description: 'Профильная труба для металлоконструкций.',
            unit: 'тонна', priceFrom: 350000, priceUnit: 'за тонну', inStock: true,
        },
        {
            id: 'p17', companyId: 'tech-stroy', categoryId: 'machinery',
            name: 'Экскаватор-погрузчик JCB', description: 'Аренда экскаватора-погрузчика JCB 3CX с оператором.',
            unit: 'час', priceFrom: 12000, priceUnit: 'за час', inStock: true,
        },
        {
            id: 'p18', companyId: 'tech-stroy', categoryId: 'machinery',
            name: 'Автокран 25 тонн', description: 'Аренда автокрана грузоподъёмностью 25 тонн.',
            unit: 'смена', priceFrom: 80000, priceUnit: 'за смену', inStock: true,
        },
        {
            id: 'p19', companyId: 'tech-stroy', categoryId: 'machinery',
            name: 'Самосвал 20 тонн', description: 'Аренда самосвала для перевозки грунта и сыпучих.',
            unit: 'рейс', priceFrom: 25000, priceUnit: 'за рейс', inStock: true,
        },
    ]

    for (const p of products) {
        await prisma.product.upsert({
            where: { id: p.id },
            update: {},
            create: p,
        })
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
        {
            id: 'r2', userId: 'u1', categoryId: 'aggregates',
            query: 'Песок 30 тонн доставка на стройку',
            parsedCategory: 'Инертные материалы', parsedVolume: '30 тонн', parsedCity: 'Шымкент',
            deliveryNeeded: true, address: 'мкр. Нуртас, уч. 45', deadline: '2024-12-22',
            status: 'in_progress', createdAt: new Date('2024-12-14T14:00:00'),
        },
    ]

    for (const r of requests) {
        await prisma.request.upsert({
            where: { id: r.id },
            update: {},
            create: r,
        })
    }

    // 7. Offers
    const offers = [
        {
            id: 'o1', requestId: 'r1', companyId: 'beton-shymkent',
            price: 28000, priceUnit: 'за м³',
            comment: 'Доставим миксером в течение 2 часов после подтверждения.',
            deliveryIncluded: true, deliveryPrice: 0,
            validUntil: '2024-12-25', status: 'pending',
            createdAt: new Date('2024-12-15T11:00:00'),
        },
        {
            id: 'o2', requestId: 'r1', companyId: 'mega-beton',
            price: 27500, priceUnit: 'за м³',
            comment: 'Бетон с лабораторным контролем. Доставка бесплатная от 10 м³.',
            deliveryIncluded: true, deliveryPrice: 0,
            validUntil: '2024-12-25', status: 'pending',
            createdAt: new Date('2024-12-15T11:30:00'),
        },
        {
            id: 'o3', requestId: 'r2', companyId: 'yug-inertnye',
            price: 3500, priceUnit: 'за тонну',
            comment: 'Песок мытый, доставим самосвалом 20 тонн за рейс.',
            deliveryIncluded: true, deliveryPrice: 15000,
            validUntil: '2024-12-28', status: 'pending',
            createdAt: new Date('2024-12-14T15:00:00'),
        },
    ]

    for (const o of offers) {
        await prisma.offer.upsert({
            where: { id: o.id },
            update: {},
            create: o,
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
