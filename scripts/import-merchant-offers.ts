import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient, OfferStockStatus } from '@prisma/client';

const prisma = new PrismaClient();

// Утилита для валидного парсинга CSV с кавычками
function parseCsvLine(text: string): string[] {
    const re_value = /(?!\s*$)\s*(?:'([^'\\]*(?:\\[\s\S][^'\\]*)*)'|"([^"\\]*(?:\\[\s\S][^"\\]*)*)"|([^,'"\s\\]*(?:\s+[^,'"\s\\]+)*))\s*(?:,|$)/g;
    const array: string[] = [];
    text.replace(re_value, (m0, m1, m2, m3) => {
        if (m1 !== undefined) array.push(m1.replace(/\\'/g, "'"));
        else if (m2 !== undefined) array.push(m2.replace(/\\"/g, '"'));
        else if (m3 !== undefined) array.push(m3);
        return '';
    });
    // Удаляем пустой элемент, если строка заканчивается запятой или переходом строки
    if (array.length > 0 && !array[array.length - 1]) {
        array.pop();
    }
    return array.map(val => (val || '').trim());
}

function generateSlug(text: string): string {
    const a = 'а-б-в-г-д-е-ё-ж-з-и-й-к-л-м-н-о-п-р-с-т-у-ф-х-ц-ч-ш-щ-ъ-ы-ь-э-ю-я'.split('-');
    const b = 'a-b-v-g-d-e-yo-zh-z-i-y-k-l-m-n-o-p-r-s-t-u-f-h-ts-ch-sh-shch---y---e-yu-ya'.split('-');
    let res = text.toLowerCase();
    for (let i = 0; i < a.length; i++) {
        res = res.split(a[i]).join(b[i]);
    }
    return res.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

async function main() {
    console.log('Starting Merchant Offers Import...');

    const csvPath = path.join(process.cwd(), 'public', 'westroy_merchant_offers_v1.csv');
    if (!fs.existsSync(csvPath)) {
        console.error(`ERROR: File not found at ${csvPath}`);
        process.exit(1);
    }

    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim().length > 0);

    if (lines.length < 2) {
        console.error('File is empty or contains only headers.');
        process.exit(1);
    }

    const headers = parseCsvLine(lines[0]);
    console.log(`Parsed Headers: ${headers.join(', ')}`);

    let successCount = 0;
    let skipCount = 0;

    for (let i = 1; i < lines.length; i++) {
        const row = parseCsvLine(lines[i]);
        if (row.length < headers.length) {
            console.warn(`Skipping line ${i + 1} due to insufficient columns.`);
            skipCount++;
            continue;
        }

        const data = headers.reduce((acc, header, index) => {
            acc[header.trim()] = row[index];
            return acc;
        }, {} as Record<string, string>);

        const sku = data.productSku;
        const companyName = data.companyName;
        if (!sku || !companyName) {
            console.warn(`Skipping line ${i + 1}: Missing productSku or companyName.`);
            skipCount++;
            continue;
        }

        const skuToSlugMapping: Record<string, string> = {
            'WD-BR-100': 'osb-3-9mm',
            'GB-D500-600': 'gazoblok-d500-600-300-200',
            'ARM-12-A500C': 'armatura-a3-12mm',
            'MC-MON-8017': 'metal-monterrey-8017',
            'CEM-M400-50': 'cement-m400-shymkent',
            'KN-ROT-30': 'knauf-rotband-30kg'
        };

        const mappedSku = skuToSlugMapping[sku] || sku;

        // 1. Поиск Товара (Product)
        const product = await prisma.product.findFirst({
            where: {
                OR: [
                    { article: mappedSku },
                    { slug: mappedSku },
                    { id: mappedSku },
                    { article: sku },
                    { slug: sku }
                ]
            }
        });

        if (!product) {
            console.warn(`[WARN] Product not found for sku/article: ${sku}. Skipping offer from ${companyName}.`);
            skipCount++;
            continue;
        }

        // 2. Поиск или Создание Компании (Company)
        let company = await prisma.company.findFirst({
            where: { name: companyName }
        });

        if (!company) {
            console.log(`[Company] Creating new company: ${companyName}`);
            company = await prisma.company.create({
                data: {
                    name: companyName,
                    slug: generateSlug(companyName),
                    description: `Поставщик: ${companyName}`,
                    baseCityId: 'shymkent',
                    delivery: !!data.deliveryPrice,
                    verified: true,
                }
            });
        }

        // 3. Формирование Offer
        const offerId = `offer_${company.id}_${product.id}`;
        const price = parseFloat(data.price);
        const minOrder = data.minOrder ? parseFloat(data.minOrder) : null;
        const deliveryPrice = data.deliveryPrice ? parseFloat(data.deliveryPrice) : null;

        // Маппинг stockStatus
        let stockStatus: OfferStockStatus = OfferStockStatus.IN_STOCK;
        if (data.stockStatus) {
            const rawStatus = data.stockStatus.toUpperCase();
            if (rawStatus === 'ON_ORDER') stockStatus = OfferStockStatus.ON_ORDER;
            else if (rawStatus === 'OUT_OF_STOCK') stockStatus = OfferStockStatus.OUT_OF_STOCK;
        }

        if (isNaN(price)) {
            console.warn(`[WARN] Invalid price for ${sku} - ${companyName}. Skipping.`);
            skipCount++;
            continue;
        }

        await prisma.offer.upsert({
            where: { id: offerId },
            update: {
                price,
                priceUnit: data.priceUnit || 'шт',
                minOrder,
                stockStatus,
                leadTime: data.leadTime || null,
                deliveryPrice: isNaN(deliveryPrice!) ? null : deliveryPrice,
            },
            create: {
                id: offerId,
                productId: product.id,
                companyId: company.id,
                price,
                priceUnit: data.priceUnit || 'шт',
                minOrder,
                stockStatus,
                leadTime: data.leadTime || null,
                deliveryPrice: isNaN(deliveryPrice!) ? null : deliveryPrice,
            }
        });

        console.log(`[Offer] Upserted offer for ${sku} from ${companyName} (Price: ${price})`);
        successCount++;
    }

    console.log(`\nImport completed! Processed successfully: ${successCount}. Skipped: ${skipCount}.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
