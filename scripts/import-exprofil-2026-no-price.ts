import { execSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

type ParsedItem = {
  article?: string;
  name: string;
  boxQuantity?: number;
  imageUrl?: string;
  categoryId?: string;
};

const prisma = new PrismaClient();

const DEFAULT_CATEGORY_ID = 'general-materials';
const REGION_ID = 'shymkent';
const COMPANY_NAME = 'ExProfil';

const PDF_PATH = process.argv[2] || '/Users/almaz/Downloads/экспроф 2026.pdf';

const CONTROL_WORDS = new Set([
  'артикул',
  'характеристики',
  'количество',
  'в коробке',
]);

const CATEGORY_DEFS = [
  {
    id: 'painting-tools',
    name: 'painting-tools',
    nameRu: 'Малярный инструмент',
    icon: '🖌️',
    keywords: ['валик', 'кисть', 'шпатель', 'маляр', 'краск', 'терка', 'кельма'],
  },
  {
    id: 'hand-tools',
    name: 'hand-tools',
    nameRu: 'Ручной инструмент',
    icon: '🧰',
    keywords: ['молот', 'рулет', 'уров', 'нож', 'ножов', 'пассатиж', 'плоскогуб', 'отверт', 'ключ', 'кусач'],
  },
  {
    id: 'fasteners',
    name: 'fasteners',
    nameRu: 'Крепеж и метизы',
    icon: '🔩',
    keywords: ['саморез', 'дюбел', 'гвозд', 'болт', 'гайк', 'шайб', 'анкер', 'шуруп', 'метиз'],
  },
  {
    id: 'electrical',
    name: 'electrical',
    nameRu: 'Электрика',
    icon: '⚡',
    keywords: ['кабель', 'провод', 'розет', 'выключат', 'лампа', 'автомат', 'удлинител', 'гофра'],
  },
  {
    id: 'plumbing',
    name: 'plumbing',
    nameRu: 'Сантехника и трубы',
    icon: '🚿',
    keywords: ['труба', 'муфта', 'фитинг', 'кран', 'смесител', 'шланг', 'сифон', 'канализац'],
  },
  {
    id: 'safety',
    name: 'safety',
    nameRu: 'СИЗ и безопасность',
    icon: '🦺',
    keywords: ['перчат', 'очки', 'маск', 'респиратор', 'каска', 'защит'],
  },
  {
    id: 'adhesives-sealants',
    name: 'adhesives-sealants',
    nameRu: 'Клеи и герметики',
    icon: '🧪',
    keywords: ['клей', 'герметик', 'пена', 'монтаж', 'силикон', 'эпокс'],
  },
] as const;

const EXPROFIL_IMAGES_DIR = path.join(process.cwd(), 'public/images/exprofil/pdf');
const FALLBACK_CATEGORY_IMAGES: Record<string, string> = {
  concrete: '/images/catalog/concrete.jpg',
  aggregates: '/images/catalog/aggregates.jpg',
  blocks: '/images/catalog/tile.jpg',
  rebar: '/images/catalog/materials.jpg',
  cement: '/images/catalog/concrete.jpg',
  machinery: '/images/catalog/materials.jpg',
  'pvc-profiles': '/images/catalog/pvc-profile.jpg',
  'general-materials': '/images/catalog/materials.jpg',
  'painting-tools': '/images/catalog/materials.jpg',
  'hand-tools': '/images/catalog/materials.jpg',
  fasteners: '/images/catalog/materials.jpg',
  electrical: '/images/catalog/pipes.jpg',
  plumbing: '/images/catalog/pipes.jpg',
  safety: '/images/catalog/materials.jpg',
  'adhesives-sealants': '/images/catalog/drywall.jpg',
};

const CATEGORY_RULES: Array<{ categoryId: string; needles: string[] }> = [
  { categoryId: 'painting-tools', needles: ['валик', 'кисть', 'шпатель', 'маляр', 'кельм', 'терк', 'скреб'] },
  { categoryId: 'hand-tools', needles: ['молот', 'рулет', 'уров', 'нож', 'ножов', 'пассатиж', 'плоскогуб', 'отвертк', 'ключ', 'кусач', 'стамес'] },
  { categoryId: 'fasteners', needles: ['саморез', 'дюбел', 'гвозд', 'болт', 'гайк', 'шайб', 'анкер', 'шуруп', 'заклеп'] },
  { categoryId: 'electrical', needles: ['кабель', 'провод', 'розет', 'выключат', 'лампа', 'автомат', 'удлинител', 'гофра'] },
  { categoryId: 'plumbing', needles: ['труба', 'муфта', 'фитинг', 'кран', 'смесител', 'шланг', 'сифон', 'канализац'] },
  { categoryId: 'safety', needles: ['перчат', 'очки', 'маск', 'респиратор', 'каск', 'защит'] },
  { categoryId: 'adhesives-sealants', needles: ['клей', 'герметик', 'пена', 'монтаж', 'силикон', 'эпокс'] },
  { categoryId: 'pvc-profiles', needles: ['пвх', 'профил', 'подокон', 'штапик', 'ламбри'] },
  { categoryId: 'cement', needles: ['цемент', 'пц400', 'пц500'] },
  { categoryId: 'blocks', needles: ['кирпич', 'блок', 'газобетон', 'пеноблок'] },
  { categoryId: 'aggregates', needles: ['песок', 'щеб', 'грав', 'отсев', 'пгс'] },
  { categoryId: 'rebar', needles: ['арматур', 'швеллер', 'метал'] },
];

function normalizeLine(value: string): string {
  return value
    .replaceAll('\u00A0', ' ')
    .replaceAll('ﬁ', 'fi')
    .replaceAll('ﬂ', 'fl')
    .replace(/\s+/g, ' ')
    .trim();
}

function isPageMarker(line: string): boolean {
  return /^-\d+-$/.test(line);
}

function isArticleCode(line: string): boolean {
  return /^\d{3,6}$/.test(line);
}

function isLikelyProductName(line: string): boolean {
  if (!line || line.length < 3) return false;
  if (CONTROL_WORDS.has(line.toLowerCase())) return false;
  if (isPageMarker(line)) return false;
  if (isArticleCode(line)) return false;
  if (/^[.,:;()\-]+$/.test(line)) return false;
  if (!/[A-Za-zА-Яа-яЁё]/.test(line)) return false;
  return true;
}

function canonicalName(value: string): string {
  return value
    .toLowerCase()
    .replaceAll('ё', 'е')
    .replace(/[^\p{L}\p{N}#+\-/()., ]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isNoisyName(item: ParsedItem): boolean {
  const raw = item.name.trim();
  const name = canonicalName(raw);
  if (!name) return true;

  if (/^[-–—]?\d+[-–—]?$/.test(name)) return true;
  if (/^\d+[.,]?\d*\s?(кг|г|мм|см|м|л|литр|литра)$/.test(name) && !item.article) return true;
  if (/^\(?иран\)?$/.test(name) && !item.article) return true;

  const tokens = name.split(' ').filter(Boolean);
  if (!item.article && tokens.length === 1 && tokens[0].length <= 6) return true;

  const blockedSingles = new Set(['extra', 'navato', 'панда', 'мастер', 'попугай', 'насадок', 'держак', 'губка']);
  if (!item.article && tokens.length === 1 && blockedSingles.has(tokens[0])) return true;

  if (!/[a-zа-я]/i.test(name)) return true;
  if (!item.article && name.length < 8) return true;

  return false;
}

function scoreItem(item: ParsedItem): number {
  let score = 0;
  if (item.article) score += 3;
  if (item.boxQuantity && item.boxQuantity > 0) score += 2;
  score += Math.min(item.name.length / 20, 2);
  return score;
}

function resolveCategoryId(name: string): string {
  const normalized = canonicalName(name);
  for (const rule of CATEGORY_RULES) {
    if (rule.needles.some((needle) => normalized.includes(needle))) {
      return rule.categoryId;
    }
  }
  return DEFAULT_CATEGORY_ID;
}

function getPdfImageSet(): Set<string> {
  try {
    return new Set(
      readdirSync(EXPROFIL_IMAGES_DIR).filter((file) => file.endsWith('.png'))
    );
  } catch {
    return new Set<string>();
  }
}

function resolveImageUrl(article: string | undefined, name: string, categoryId: string, imageSet: Set<string>) {
  const normalizedArticle = (article || '').replace(/\D/g, '');
  if (normalizedArticle) {
    const articleCandidates = [
      `exprof-${normalizedArticle}.png`,
      `exprof-${normalizedArticle.padStart(3, '0')}.png`,
      `exprof-${normalizedArticle.padStart(4, '0')}.png`,
      `exprof-${normalizedArticle.padStart(5, '0')}.png`,
    ];

    for (const file of articleCandidates) {
      if (imageSet.has(file)) {
        return `/images/exprofil/pdf/${file}`;
      }
    }
  }

  const normalizedName = canonicalName(name);
  if (normalizedName.includes('труба') || normalizedName.includes('муфта') || normalizedName.includes('фитинг')) {
    return '/images/catalog/pipes.jpg';
  }
  if (normalizedName.includes('пвх') || normalizedName.includes('профил') || normalizedName.includes('подокон')) {
    return '/images/catalog/pvc-profile.jpg';
  }
  if (normalizedName.includes('клей') || normalizedName.includes('герметик') || normalizedName.includes('пена')) {
    return '/images/catalog/drywall.jpg';
  }
  if (normalizedName.includes('щеб') || normalizedName.includes('песок') || normalizedName.includes('грав')) {
    return '/images/catalog/aggregates.jpg';
  }
  if (normalizedName.includes('цемент') || normalizedName.includes('бетон')) {
    return '/images/catalog/concrete.jpg';
  }
  if (normalizedName.includes('кабель') || normalizedName.includes('провод') || normalizedName.includes('розет')) {
    return '/images/catalog/pipes.jpg';
  }
  if (normalizedName.includes('кирпич') || normalizedName.includes('блок')) {
    return '/images/catalog/tile.jpg';
  }

  return FALLBACK_CATEGORY_IMAGES[categoryId] || FALLBACK_CATEGORY_IMAGES[DEFAULT_CATEGORY_ID];
}

function extractItemsFromText(rawText: string): ParsedItem[] {
  const lines = rawText
    .split('\n')
    .map(normalizeLine)
    .filter(Boolean);

  const items: ParsedItem[] = [];
  const imageSet = getPdfImageSet();

  for (let i = 0; i < lines.length; i += 1) {
    const current = lines[i].toLowerCase();
    if (current !== 'характеристики') continue;

    let articleStart = -1;
    for (let j = i - 1; j >= Math.max(0, i - 35); j -= 1) {
      if (lines[j].toLowerCase() === 'артикул') {
        articleStart = j + 1;
        break;
      }
    }

    const articles: string[] = [];
    if (articleStart >= 0) {
      for (let j = articleStart; j < i; j += 1) {
        if (isArticleCode(lines[j])) {
          articles.push(lines[j]);
        }
      }
    }

    const names: string[] = [];
    for (let j = i + 1; j < Math.min(lines.length, i + 80); j += 1) {
      const line = lines[j];
      const lower = line.toLowerCase();
      if (CONTROL_WORDS.has(lower) || isPageMarker(line)) break;
      if (isLikelyProductName(line)) {
        names.push(line);
      }
    }

    if (names.length === 0) continue;

    let quantities: number[] = [];
    let quantityStart = -1;
    for (let j = i + 1; j < Math.min(lines.length, i + 120); j += 1) {
      if (lines[j].toLowerCase() === 'количество' && lines[j + 1]?.toLowerCase() === 'в коробке') {
        quantityStart = j + 2;
        break;
      }
    }

    if (quantityStart >= 0) {
      for (let j = quantityStart; j < Math.min(lines.length, quantityStart + 80); j += 1) {
        const line = lines[j];
        if (CONTROL_WORDS.has(line.toLowerCase()) || isPageMarker(line)) break;
        if (/^\d{1,6}$/.test(line)) quantities.push(Number(line));
      }
    }

    const pairCount = Math.max(names.length, articles.length);
    for (let k = 0; k < pairCount; k += 1) {
      const name = names[k] || names[names.length - 1];
      if (!isLikelyProductName(name)) continue;
      const categoryId = resolveCategoryId(name);
      items.push({
        article: articles[k],
        name,
        categoryId,
        boxQuantity: quantities[k] || undefined,
        imageUrl: resolveImageUrl(articles[k], name, categoryId, imageSet),
      });
    }
  }

  const byNameArticle = new Map<string, ParsedItem>();
  for (const item of items) {
    if (isNoisyName(item)) continue;
    const key = `${canonicalName(item.name)}::${item.article || ''}`;
    const prev = byNameArticle.get(key);
    if (!prev) {
      byNameArticle.set(key, item);
      continue;
    }
    byNameArticle.set(key, scoreItem(item) >= scoreItem(prev) ? item : prev);
  }

  const byName = new Map<string, ParsedItem>();
  for (const item of byNameArticle.values()) {
    const key = canonicalName(item.name);
    const prev = byName.get(key);
    if (!prev) {
      byName.set(key, item);
      continue;
    }
    byName.set(key, scoreItem(item) >= scoreItem(prev) ? item : prev);
  }

  return [...byName.values()];
}

function extractPdfText(pdfPath: string): string {
  const tempDir = mkdtempSync(path.join(tmpdir(), 'westroy-exprofil-'));
  const txtPath = path.join(tempDir, 'catalog.txt');
  try {
    execSync(`pdftotext ${JSON.stringify(pdfPath)} ${JSON.stringify(txtPath)}`, { stdio: 'pipe' });
    return readFileSync(txtPath, 'utf8');
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

async function ensureCategories() {
  for (const category of CATEGORY_DEFS) {
    await prisma.category.upsert({
      where: { id: category.id },
      update: {
        name: category.name,
        nameRu: category.nameRu,
        icon: category.icon,
        keywords: JSON.stringify(category.keywords),
      },
      create: {
        id: category.id,
        name: category.name,
        nameRu: category.nameRu,
        icon: category.icon,
        keywords: JSON.stringify(category.keywords),
      },
    });
  }
}

async function ensureCompany() {
  const existing = await prisma.company.findFirst({
    where: {
      OR: [{ name: COMPANY_NAME }, { phone: '+7 700 000 00 00' }],
    },
  });

  if (existing) return existing;

  return prisma.company.create({
    data: {
      name: COMPANY_NAME,
      description:
        'Каталог ExProfil 2026. Цены в источнике не указаны, отправляйте запрос для уточнения стоимости и наличия.',
      address: 'Шымкент, Казахстан',
      phone: '+7 700 000 00 00',
      delivery: true,
      verified: true,
      categoryId: DEFAULT_CATEGORY_ID,
      regionId: REGION_ID,
    },
  });
}

function pickDominantCategory(items: ParsedItem[]): string {
  const counts = new Map<string, number>();
  for (const item of items) {
    const id = item.categoryId || DEFAULT_CATEGORY_ID;
    counts.set(id, (counts.get(id) || 0) + 1);
  }

  let bestId = DEFAULT_CATEGORY_ID;
  let bestCount = 0;
  for (const [id, count] of counts.entries()) {
    if (count > bestCount) {
      bestId = id;
      bestCount = count;
    }
  }
  return bestId;
}

async function run() {
  console.log(`Reading PDF: ${PDF_PATH}`);
  const rawText = extractPdfText(PDF_PATH);
  const parsedItems = extractItemsFromText(rawText);
  if (parsedItems.length === 0) {
    throw new Error('Не удалось извлечь позиции из PDF');
  }

  await ensureCategories();
  const company = await ensureCompany();

  const payload = parsedItems.map((item) => {
    const categoryId = item.categoryId || DEFAULT_CATEGORY_ID;
    return {
      name: item.name,
      description: [
        item.article ? `Артикул: ${item.article}.` : null,
        'Источник: каталог ExProfil 2026.',
        'Цена по запросу.',
      ]
        .filter(Boolean)
        .join(' '),
      unit: 'шт',
      priceFrom: 0,
      priceUnit: 'цена по запросу',
      inStock: true,
      article: item.article || null,
      brand: 'ExProfil',
      boxQuantity: item.boxQuantity ?? null,
      imageUrl: item.imageUrl || null,
      source: 'Экспроф 2026 (PDF)',
      specsJson: item.boxQuantity ? JSON.stringify({ boxQuantity: item.boxQuantity }) : null,
      companyId: company.id,
      categoryId,
    };
  });

  const deleted = await prisma.product.deleteMany({ where: { companyId: company.id } });

  const createdBatch = await prisma.product.createMany({
    data: payload,
    skipDuplicates: true,
  });

  const dominantCategoryId = pickDominantCategory(parsedItems);
  await prisma.company.update({
    where: { id: company.id },
    data: { categoryId: dominantCategoryId },
  });

  const grouped = await prisma.product.groupBy({
    by: ['categoryId'],
    where: { companyId: company.id },
    _count: { _all: true },
  });

  const total = await prisma.product.count({ where: { companyId: company.id } });
  console.log(`Import complete. Company: ${company.name} (${company.id})`);
  console.log(
    `Parsed: ${parsedItems.length}, Deleted old: ${deleted.count}, Created: ${createdBatch.count}, Total company products: ${total}`
  );
  console.log('Category distribution:', grouped);
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
