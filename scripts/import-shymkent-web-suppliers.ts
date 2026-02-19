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
    name: 'Beton Shymkent',
    description: 'Производство и доставка товарного бетона по Шымкенту. Источник: https://beton-shymkent.kz/',
    address: 'Шымкент',
    phone: '+7 777 560 44 44',
    delivery: true,
    verified: true,
    categoryId: 'concrete',
    regionId: 'shymkent',
    products: [
      { name: 'Бетон М200', description: 'Товарный бетон от производителя (источник: beton-shymkent.kz)', unit: 'м³', priceFrom: 22000, priceUnit: 'тг за м³' },
      { name: 'Бетон М300', description: 'Товарный бетон от производителя (источник: beton-shymkent.kz)', unit: 'м³', priceFrom: 24500, priceUnit: 'тг за м³' },
      { name: 'Бетон М350', description: 'Товарный бетон от производителя (источник: beton-shymkent.kz)', unit: 'м³', priceFrom: 26000, priceUnit: 'тг за м³' },
    ],
  },
  {
    name: 'OKS Бетон',
    description: 'Собственный бетонный завод и доставка по Шымкенту. Источник: https://oks-beton.kz/',
    address: 'Шымкент, ул. Клара Цеткин 149/1',
    phone: '+7 701 701 17 00',
    delivery: true,
    verified: true,
    categoryId: 'concrete',
    regionId: 'shymkent',
    products: [
      { name: 'Товарный бетон М250', description: 'Бетон с доставкой, цена уточняется (источник: oks-beton.kz)', unit: 'м³', priceFrom: 0, priceUnit: 'цена по запросу' },
      { name: 'Товарный бетон М300', description: 'Бетон с доставкой, цена уточняется (источник: oks-beton.kz)', unit: 'м³', priceFrom: 0, priceUnit: 'цена по запросу' },
      { name: 'Товарный бетон М350', description: 'Бетон с доставкой, цена уточняется (источник: oks-beton.kz)', unit: 'м³', priceFrom: 0, priceUnit: 'цена по запросу' },
    ],
  },
  {
    name: 'TS Group Beton',
    description: 'Поставка бетона в Шымкенте. Источник: https://tsgroups.kz/',
    address: 'Шымкент, Алматинская трасса',
    phone: '+7 775 786 78 87',
    delivery: true,
    verified: true,
    categoryId: 'concrete',
    regionId: 'shymkent',
    products: [
      { name: 'Бетон М250', description: 'Марка М250 (источник: tsgroups.kz)', unit: 'м³', priceFrom: 22000, priceUnit: 'тг за м³' },
      { name: 'Бетон М300', description: 'Марка М300 (источник: tsgroups.kz)', unit: 'м³', priceFrom: 23000, priceUnit: 'тг за м³' },
      { name: 'Бетон М200', description: 'Марка М200 (источник: tsgroups.kz)', unit: 'м³', priceFrom: 20000, priceUnit: 'тг за м³' },
    ],
  },

  {
    name: 'Qutty Qurylys',
    description: 'Песок, щебень и гравий с доставкой по Шымкенту. Источник: https://qurylys.qutty.kz/',
    address: 'Шымкент',
    phone: '+7 778 090 54 22',
    delivery: true,
    verified: true,
    categoryId: 'aggregates',
    regionId: 'shymkent',
    products: [
      { name: 'Песок немытый', description: 'Песок строительный с доставкой (источник: qurylys.qutty.kz)', unit: 'м³', priceFrom: 3395, priceUnit: 'тг за м³' },
      { name: 'Песок мытый', description: 'Мытый песок (источник: qurylys.qutty.kz)', unit: 'м³', priceFrom: 5695, priceUnit: 'тг за м³' },
      { name: 'Щебень (гравий) 5-20 мм', description: 'Щебень/гравий с доставкой (источник: qurylys.qutty.kz)', unit: 'м³', priceFrom: 2395, priceUnit: 'тг за м³' },
    ],
  },
  {
    name: 'DALA CONSTRUCTION',
    description: 'Поставки инертных материалов и бетона в Шымкенте. Источник: https://dala-construction.kz/katalog-tovarov/inertnye-materialy.html',
    address: 'Шымкент, мкр. Кызыл-Жар, уч. 1177/1',
    phone: '+7 705 848 10 71',
    delivery: true,
    verified: true,
    categoryId: 'aggregates',
    regionId: 'shymkent',
    products: [
      { name: 'Щебень фракции 5-20', description: 'ГОСТ 30108-94, 8267-93 (источник: dala-construction.kz)', unit: 'м³', priceFrom: 0, priceUnit: 'цена по запросу' },
      { name: 'Песчано-гравийная смесь', description: 'ПГС, ГОСТ 30108-94 (источник: dala-construction.kz)', unit: 'м³', priceFrom: 0, priceUnit: 'цена по запросу' },
      { name: 'Песок фракции 0-5 мм', description: 'ГОСТ 8736-92, 30108-94 (источник: dala-construction.kz)', unit: 'м³', priceFrom: 0, priceUnit: 'цена по запросу' },
    ],
  },
  {
    name: 'TASYMA Market',
    description: 'Маркетплейс доставки инертных материалов по Шымкенту. Источник: https://tasyma.kz/',
    address: 'Шымкент',
    phone: '+7 777 838 77 10',
    delivery: true,
    verified: false,
    categoryId: 'aggregates',
    regionId: 'shymkent',
    products: [
      { name: 'Щебень 10-20 с доставкой', description: 'Маркетплейс-предложение (источник: tasyma.kz)', unit: 'м³', priceFrom: 3000, priceUnit: 'тг за м³' },
      { name: 'ПГС с доставкой', description: 'Песчано-гравийная смесь (источник: tasyma.kz)', unit: 'м³', priceFrom: 1200, priceUnit: 'тг за м³' },
      { name: 'Бутовые камни 150-300', description: 'С доставкой (источник: tasyma.kz)', unit: 'м³', priceFrom: 3800, priceUnit: 'тг за м³' },
    ],
  },

  {
    name: 'WUKO',
    description: 'Производство ПВХ профилей для окон и дверей, поставки по Казахстану. Источник: https://wuko.kz/',
    address: 'Шымкент',
    phone: '+7 771 501 74 94',
    delivery: true,
    verified: true,
    categoryId: 'pvc-profiles',
    regionId: 'shymkent',
    products: [
      { name: 'Профиль Wuko Prime 70 A class', description: 'Ширина 70 мм, 5 камер (источник: wuko.kz)', unit: 'хлыст', priceFrom: 0, priceUnit: 'цена по запросу' },
      { name: 'Профиль Wuko Effect 70 B class', description: 'Ширина 70 мм, 5 камер (источник: wuko.kz)', unit: 'хлыст', priceFrom: 0, priceUnit: 'цена по запросу' },
      { name: 'Профиль Wuko Evo 60 B class', description: 'Ширина 60 мм, 4 камеры (источник: wuko.kz)', unit: 'хлыст', priceFrom: 0, priceUnit: 'цена по запросу' },
    ],
  },
  {
    name: 'PROFLEX',
    description: 'Собственное производство ПВХ-профилей в Шымкенте. Источник: https://proflex.kz/',
    address: 'Шымкент, ул. Ломоносова 2А',
    phone: '+7 708 480 88 88',
    delivery: true,
    verified: true,
    categoryId: 'pvc-profiles',
    regionId: 'shymkent',
    products: [
      { name: 'ПВХ профиль PROFLEX (оконный)', description: 'ПВХ профиль для оконных систем (источник: proflex.kz)', unit: 'хлыст', priceFrom: 0, priceUnit: 'цена по запросу' },
      { name: 'ПВХ профиль PROFLEX (дверной)', description: 'ПВХ профиль для дверных систем (источник: proflex.kz)', unit: 'хлыст', priceFrom: 0, priceUnit: 'цена по запросу' },
      { name: 'Алюминиевый профиль EOSS', description: 'Профильные системы EOSS (источник: proflex.kz)', unit: 'хлыст', priceFrom: 0, priceUnit: 'цена по запросу' },
    ],
  },
  {
    name: 'SMART Window&Door Systems (Shymkent)',
    description: 'Оконные и дверные ПВХ системы в Шымкенте. Источник: https://shim.smartprof.kz/',
    address: 'Шымкент, ул. Акпан Батыра 111/6',
    phone: '+7 707 935 08 05',
    delivery: true,
    verified: true,
    categoryId: 'pvc-profiles',
    regionId: 'shymkent',
    products: [
      { name: 'ПВХ профиль SMART (оконный)', description: 'Премиальные оконные профильные системы (источник: shim.smartprof.kz)', unit: 'хлыст', priceFrom: 0, priceUnit: 'цена по запросу' },
      { name: 'ПВХ профиль SMART (дверной)', description: 'Дверные ПВХ системы (источник: shim.smartprof.kz)', unit: 'хлыст', priceFrom: 0, priceUnit: 'цена по запросу' },
      { name: 'Комплектующие для оконных систем SMART', description: 'Комплектующие, уточнять у поставщика (источник: shim.smartprof.kz)', unit: 'комплект', priceFrom: 0, priceUnit: 'цена по запросу' },
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
  await ensureCategory('concrete', {
    name: 'concrete',
    nameRu: 'Бетон',
    icon: '🧱',
    keywords: ['бетон', 'м200', 'м300', 'м350'],
  });
  await ensureCategory('aggregates', {
    name: 'aggregates',
    nameRu: 'Инертные материалы',
    icon: '⛰️',
    keywords: ['песок', 'щебень', 'пгс', 'гравий'],
  });
  await ensureCategory('pvc-profiles', {
    name: 'pvc',
    nameRu: 'ПВХ профили и подоконники',
    icon: '🪟',
    keywords: ['пвх', 'профиль', 'подоконник', 'окно', 'дверь'],
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
      where: {
        companyId: company.id,
        name: product.name,
        unit: product.unit,
      },
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
    const result = await upsertSupplier(supplier);
    createdTotal += result.created;
    updatedTotal += result.updated;
    console.log(`Supplier synced: ${supplier.name} (${result.companyId}) -> created ${result.created}, updated ${result.updated}`);
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
