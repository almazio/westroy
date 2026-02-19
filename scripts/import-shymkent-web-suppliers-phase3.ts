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
    name: 'СК Блок',
    description: 'Газоблок, пеноблок и полистиролбетонные блоки. Источник: https://www.skblok.kz/',
    address: 'Шымкент (доставка по городу)',
    phone: '+7 701 473 84 31',
    delivery: true,
    verified: true,
    categoryId: 'blocks',
    regionId: 'shymkent',
    products: [
      { name: 'Газоблок', description: 'Стеновые газоблоки (источник: skblok.kz)', unit: 'шт', priceFrom: 0, priceUnit: 'цена по запросу' },
      { name: 'Пеноблок', description: 'Пенобетонные блоки (источник: skblok.kz)', unit: 'шт', priceFrom: 0, priceUnit: 'цена по запросу' },
      { name: 'Полистиролбетонный блок', description: 'Теплоизоляционные блоки (источник: skblok.kz)', unit: 'шт', priceFrom: 0, priceUnit: 'цена по запросу' },
    ],
  },
  {
    name: 'PIR PANEL',
    description: 'Производство сэндвич-панелей в Шымкенте. Источник: https://pir-panel.kz/',
    address: 'Шымкент, пр. Кунаева 83/1',
    phone: '+7 775 026 10 27',
    delivery: true,
    verified: true,
    categoryId: 'blocks',
    regionId: 'shymkent',
    products: [
      { name: 'Кровельная сэндвич-панель PIR', description: 'Панели для кровли, производство в Шымкенте (источник: pir-panel.kz)', unit: 'м²', priceFrom: 0, priceUnit: 'цена по запросу' },
      { name: 'Стеновая сэндвич-панель PIR', description: 'Панели для стен (источник: pir-panel.kz)', unit: 'м²', priceFrom: 0, priceUnit: 'цена по запросу' },
      { name: 'Доборные элементы для сэндвич-панелей', description: 'Комплектующие (источник: pir-panel.kz)', unit: 'пог.м', priceFrom: 0, priceUnit: 'цена по запросу' },
    ],
  },
  {
    name: 'ASIAPAN',
    description: 'Сэндвич-панели и строительные панели. Источник: https://www.asiapan.kz/contacts',
    address: 'Шымкент',
    phone: '+7 701 929 99 99',
    delivery: true,
    verified: true,
    categoryId: 'blocks',
    regionId: 'shymkent',
    products: [
      { name: 'Сэндвич-панель стеновая', description: 'Стеновые панели (источник: asiapan.kz)', unit: 'м²', priceFrom: 0, priceUnit: 'цена по запросу' },
      { name: 'Сэндвич-панель кровельная', description: 'Кровельные панели (источник: asiapan.kz)', unit: 'м²', priceFrom: 0, priceUnit: 'цена по запросу' },
      { name: 'Комплектующие к сэндвич-панелям', description: 'Доборные элементы (источник: asiapan.kz)', unit: 'комплект', priceFrom: 0, priceUnit: 'цена по запросу' },
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
  await ensureCategory('blocks', {
    name: 'blocks',
    nameRu: 'Кирпич и блоки',
    icon: '🧱',
    keywords: ['блок', 'газоблок', 'пеноблок', 'кирпич', 'сэндвич-панель'],
  });
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

