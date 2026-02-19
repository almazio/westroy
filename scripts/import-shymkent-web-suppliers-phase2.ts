import { PrismaClient } from '@prisma/client';
import { findExistingCompanySmart } from './import-utils';

type SupplierInput = {
  name: string;
  description: string;
  address: string;
  phone: string;
  delivery: boolean;
  verified: boolean;
  categoryId: string;
  regionId: string;
  products: Array<{
    name: string;
    description: string;
    unit: string;
    priceFrom: number;
    priceUnit: string;
    inStock?: boolean;
  }>;
};

const prisma = new PrismaClient();

const suppliers: SupplierInput[] = [
  {
    name: 'Beton Commerce3',
    description: 'Производство и доставка товарного бетона по Шымкенту. Источник: https://shymkent.beton.com.kz/',
    address: 'Шымкент',
    phone: '+7 775 614 33 33',
    delivery: true,
    verified: true,
    categoryId: 'concrete',
    regionId: 'shymkent',
    products: [
      { name: 'Бетон товарный (миксер 5-10 м³)', description: 'Доставка на объект, цена уточняется (источник: shymkent.beton.com.kz)', unit: 'м³', priceFrom: 0, priceUnit: 'цена по запросу' },
      { name: 'Услуги автобетононасоса', description: 'Подача бетона на высоту и труднодоступные точки (источник: shymkent.beton.com.kz)', unit: 'смена', priceFrom: 0, priceUnit: 'цена по запросу' },
      { name: 'ЖБИ продукция', description: 'ЖБИ от производителя, по заявке (источник: shymkent.beton.com.kz)', unit: 'шт', priceFrom: 0, priceUnit: 'цена по запросу' },
    ],
  },
  {
    name: 'ST GROUP',
    description: 'Асфальтобетонный завод в Шымкенте. Источник: https://st-group.kz/contacts',
    address: 'Шымкент, ул. Акша-тау 303в',
    phone: '+7 707 677 75 55',
    delivery: true,
    verified: true,
    categoryId: 'concrete',
    regionId: 'shymkent',
    products: [
      { name: 'Асфальтобетонная смесь', description: 'С завода ST GROUP (источник: st-group.kz)', unit: 'т', priceFrom: 0, priceUnit: 'цена по запросу' },
      { name: 'Продажа и укладка асфальта', description: 'Комплексные работы (источник: st-group.kz)', unit: 'м²', priceFrom: 0, priceUnit: 'цена по запросу' },
      { name: 'Доставка асфальтобетона', description: 'Логистика до объекта (источник: st-group.kz)', unit: 'рейс', priceFrom: 0, priceUnit: 'цена по запросу' },
    ],
  },

  {
    name: 'МетТрансТерминал Шымкент',
    description: 'Металлопрокат и арматура в Шымкенте. Источник: https://mtt-shymkent.kz/armatura',
    address: 'Шымкент, ул. Байтурсынова, 18',
    phone: '+7 7252 61 22 82',
    delivery: true,
    verified: true,
    categoryId: 'rebar',
    regionId: 'shymkent',
    products: [
      { name: 'Арматура А500С', description: 'Стальная арматура, цена за метр и тонну (источник: mtt-shymkent.kz)', unit: 'т', priceFrom: 0, priceUnit: 'цена по запросу' },
      { name: 'Арматура 12 мм', description: 'Рифленая арматура (источник: mtt-shymkent.kz)', unit: 'т', priceFrom: 0, priceUnit: 'цена по запросу' },
      { name: 'Арматура 16 мм', description: 'Стальная арматура (источник: mtt-shymkent.kz)', unit: 'т', priceFrom: 0, priceUnit: 'цена по запросу' },
    ],
  },
  {
    name: 'TPA Group Шымкент',
    description: 'Промышленная трубопроводная и запорная арматура. Источник: https://tpa-group.kz/shymkent/',
    address: 'Шымкент',
    phone: '+7 727 310 80 42',
    delivery: true,
    verified: true,
    categoryId: 'rebar',
    regionId: 'shymkent',
    products: [
      { name: 'Краны шаровые (латунные/стальные/чугунные)', description: 'Промышленная запорная арматура (источник: tpa-group.kz)', unit: 'шт', priceFrom: 0, priceUnit: 'цена по запросу' },
      { name: 'Задвижки и затворы дисковые', description: 'Трубопроводная арматура (источник: tpa-group.kz)', unit: 'шт', priceFrom: 0, priceUnit: 'цена по запросу' },
      { name: 'Клапаны запорные и комплектующие', description: 'Промышленная арматура (источник: tpa-group.kz)', unit: 'шт', priceFrom: 0, priceUnit: 'цена по запросу' },
    ],
  },

  {
    name: 'Шымкентцемент',
    description: 'Продажа цемента в Шымкенте. Источник: https://yandex.kz/maps/ru/org/shymkenttsement/89554164173/',
    address: 'Шымкент, ул. Койкелди Батыра, 22',
    phone: '+7 701 766 24 61',
    delivery: true,
    verified: true,
    categoryId: 'cement',
    regionId: 'shymkent',
    products: [
      { name: 'Цемент М450', description: 'Цемент для стяжки и общестроительных работ (источник: yandex maps карточка Шымкентцемент)', unit: 'т', priceFrom: 0, priceUnit: 'цена по запросу' },
      { name: 'Цемент навалом', description: 'Отгрузка оптом (источник: yandex maps карточка Шымкентцемент)', unit: 'т', priceFrom: 0, priceUnit: 'цена по запросу' },
      { name: 'Цемент в мешках', description: 'Розничная и оптовая продажа (источник: yandex maps карточка Шымкентцемент)', unit: 'мешок', priceFrom: 0, priceUnit: 'цена по запросу' },
    ],
  },
  {
    name: 'Цемент (optoviki.kz)',
    description: 'Реализация цемента АО «Шымкентцемент». Источник: https://www.optoviki.kz/4132',
    address: 'Шымкент, ул. Павлова, 2',
    phone: '+7 707 784 54 45',
    delivery: true,
    verified: false,
    categoryId: 'cement',
    regionId: 'shymkent',
    products: [
      { name: 'Цемент АО Шымкентцемент (навал)', description: 'Цена зависит от объема (источник: optoviki.kz)', unit: 'т', priceFrom: 0, priceUnit: 'цена по запросу' },
      { name: 'Цемент АО Шымкентцемент (в мешках)', description: 'Поставка в таре (источник: optoviki.kz)', unit: 'мешок', priceFrom: 0, priceUnit: 'цена по запросу' },
      { name: 'Поставка цемента оптом', description: 'Индивидуальные условия (источник: optoviki.kz)', unit: 'партия', priceFrom: 0, priceUnit: 'цена по запросу' },
    ],
  },

  {
    name: 'ARRENDODATEL',
    description: 'Аренда спецтехники в Казахстане, контакты в Шымкенте. Источник: https://arendodatel.kz/contacts',
    address: 'Шымкент, ул. Момынова 8',
    phone: '+7 775 404 88 77',
    delivery: true,
    verified: true,
    categoryId: 'machinery',
    regionId: 'shymkent',
    products: [
      { name: 'Аренда компрессоров', description: 'Прокат компрессоров (источник: arendodatel.kz)', unit: 'сутки', priceFrom: 0, priceUnit: 'цена по запросу' },
      { name: 'Аренда подъемников', description: 'Подъемная техника (источник: arendodatel.kz)', unit: 'сутки', priceFrom: 0, priceUnit: 'цена по запросу' },
      { name: 'Аренда электростанций', description: 'Промышленные генераторы (источник: arendodatel.kz)', unit: 'сутки', priceFrom: 0, priceUnit: 'цена по запросу' },
    ],
  },
  {
    name: 'ATT Kazakhstan',
    description: 'Аренда и продажа спецтехники. Источник: https://att.kz/contact-us/',
    address: 'Шымкент, ул. Шевченко 165б, офис 201',
    phone: '+7 777 717 17 73',
    delivery: true,
    verified: true,
    categoryId: 'machinery',
    regionId: 'shymkent',
    products: [
      { name: 'Аренда спецтехники', description: 'Строительная и подъемная техника (источник: att.kz)', unit: 'смена', priceFrom: 0, priceUnit: 'цена по запросу' },
      { name: 'Продажа спецтехники', description: 'Продажа техники под заказ (источник: att.kz)', unit: 'шт', priceFrom: 0, priceUnit: 'цена по запросу' },
      { name: 'Сервис и консультации по технике', description: 'Подбор техники под проект (источник: att.kz)', unit: 'услуга', priceFrom: 0, priceUnit: 'цена по запросу' },
    ],
  },
];

async function ensureCategory(id: string, defaults: { name: string; nameRu: string; icon: string; keywords: string[] }) {
  const existing = await prisma.category.findUnique({ where: { id } });
  if (existing) return existing;
  return prisma.category.create({
    data: {
      id,
      name: defaults.name,
      nameRu: defaults.nameRu,
      icon: defaults.icon,
      keywords: JSON.stringify(defaults.keywords),
    },
  });
}

async function ensureCategories() {
  await ensureCategory('concrete', { name: 'concrete', nameRu: 'Бетон', icon: '🧱', keywords: ['бетон', 'м300'] });
  await ensureCategory('rebar', { name: 'rebar', nameRu: 'Арматура и металлопрокат', icon: '🔩', keywords: ['арматура', 'металлопрокат'] });
  await ensureCategory('cement', { name: 'cement', nameRu: 'Цемент', icon: '🏗️', keywords: ['цемент', 'портландцемент'] });
  await ensureCategory('machinery', { name: 'machinery', nameRu: 'Спецтехника', icon: '🚜', keywords: ['спецтехника', 'аренда'] });
}

async function upsertSupplier(supplier: SupplierInput) {
  const existing = await findExistingCompanySmart(prisma, {
    name: supplier.name,
    phone: supplier.phone,
    description: supplier.description,
  });

  const company = existing
    ? await prisma.company.update({
      where: { id: existing.id },
      data: {
        name: supplier.name,
        description: supplier.description,
        address: supplier.address,
        phone: supplier.phone,
        delivery: supplier.delivery,
        verified: supplier.verified,
        categoryId: supplier.categoryId,
        regionId: supplier.regionId,
      },
    })
    : await prisma.company.create({
      data: {
        name: supplier.name,
        description: supplier.description,
        address: supplier.address,
        phone: supplier.phone,
        delivery: supplier.delivery,
        verified: supplier.verified,
        categoryId: supplier.categoryId,
        regionId: supplier.regionId,
      },
    });

  let created = 0;
  let updated = 0;

  for (const product of supplier.products) {
    const existingProduct = await prisma.product.findFirst({
      where: { companyId: company.id, name: product.name, unit: product.unit },
      select: { id: true },
    });

    if (existingProduct) {
      await prisma.product.update({
        where: { id: existingProduct.id },
        data: {
          description: product.description,
          categoryId: supplier.categoryId,
          priceFrom: product.priceFrom,
          priceUnit: product.priceUnit,
          inStock: product.inStock ?? true,
        },
      });
      updated += 1;
    } else {
      await prisma.product.create({
        data: {
          name: product.name,
          description: product.description,
          unit: product.unit,
          priceFrom: product.priceFrom,
          priceUnit: product.priceUnit,
          inStock: product.inStock ?? true,
          companyId: company.id,
          categoryId: supplier.categoryId,
        },
      });
      created += 1;
    }
  }

  return { companyId: company.id, created, updated };
}

async function run() {
  await ensureCategories();
  let createdTotal = 0;
  let updatedTotal = 0;

  for (const supplier of suppliers) {
    const row = await upsertSupplier(supplier);
    createdTotal += row.created;
    updatedTotal += row.updated;
    console.log(`Supplier synced: ${supplier.name} (${row.companyId}) -> created ${row.created}, updated ${row.updated}`);
  }

  const totalCompanies = await prisma.company.count();
  const totalProducts = await prisma.product.count();
  console.log(`Done. Created products: ${createdTotal}, Updated products: ${updatedTotal}`);
  console.log(`DB totals -> companies: ${totalCompanies}, products: ${totalProducts}`);
}

run()
  .catch((error) => {
    console.error('Import failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
