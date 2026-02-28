import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient, OfferStockStatus } from '@prisma/client';

const prisma = new PrismaClient();

// Helper to reliably parse CSV lines with quoted values
function parseCsvLine(line: string): string[] {
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' && line[i + 1] === '"') {
            cur += '"';
            i++;
        } else if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(cur.trim());
            cur = '';
        } else {
            cur += char;
        }
    }
    result.push(cur.trim());
    return result;
}

function slugify(text: string) {
    const ru: { [key: string]: string } = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e', 'ж': 'zh',
        'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
        'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'cs',
        'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ь': '', 'ы': 'y', 'ъ': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
        ' ': '-', '(': '', ')': '', ',': '', '.': ''
    };
    return text.toLowerCase().split('').map(char => ru[char] !== undefined ? ru[char] : char).join('').replace(/-+/g, '-').replace(/[^a-z0-9-]/g, '');
}

async function getOrCreateCategoryPath(fullPath: string): Promise<string> {
    const parts = fullPath.split('>').map(p => p.trim()).filter(Boolean);
    let parentId: string | null = null;
    let lastCategoryId = '';

    for (let i = 0; i < parts.length; i++) {
        const nameRu = parts[i];
        const id = slugify(nameRu);

        const existing = await prisma.category.findUnique({ where: { id } });
        if (!existing) {
            await prisma.category.create({
                data: {
                    id,
                    name: id,
                    nameRu,
                    parentId,
                    keywords: '[]',
                }
            });
            console.log(`[Category] Created: ${nameRu} (${id})`);
        }
        parentId = id;
        lastCategoryId = id;
    }

    return lastCategoryId;
}

async function getOrCreateCompany(brand: string, city: string, deliveryRegions: string): Promise<string> {
    const id = `c_${slugify(brand || 'generic')}`;
    const name = brand || 'Многопрофильный поставщик';

    const existing = await prisma.company.findUnique({ where: { id } });
    if (!existing) {
        await prisma.company.create({
            data: {
                id,
                name,
                slug: id,
                description: `Официальный поставщик продукции ${name}`,
                baseCityId: slugify(city) || 'shymkent',
                delivery: true,
                verified: true,
                deliveryRegions: JSON.stringify(deliveryRegions.split(',').map(r => r.trim())),
            }
        });
        console.log(`[Company] Created: ${name} (${id})`);
    }
    return id;
}

async function main() {
    const csvPath = '/Users/almaz/Downloads/westroy_mega_catalog_100_rows.csv';
    if (!fs.existsSync(csvPath)) {
        throw new Error(`CSV file not found at ${csvPath}`);
    }

    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim().length > 0);
    const headers = parseCsvLine(lines[0]);

    console.log(`Starting import of ${lines.length - 1} rows...`);

    let count = 0;
    for (let i = 1; i < lines.length; i++) {
        const row = parseCsvLine(lines[i]);
        if (row.length < headers.length) continue;

        const data: any = {};
        headers.forEach((h, idx) => data[h] = row[idx]);

        try {
            const categoryId = await getOrCreateCategoryPath(data.fullPath);
            const companyId = await getOrCreateCompany(data.brand, data.city, data.deliveryRegions);

            const productId = data.slug;

            // Upsert Product
            await prisma.product.upsert({
                where: { id: productId },
                update: {
                    name: data.productName,
                    brand: data.brand,
                    article: data.article,
                    technicalSpecs: data.specsJson || '{}',
                    marketingFeatures: data.marketingFeatures || '{}',
                    imageUrl: data.imageUrl || null,
                    categoryId,
                },
                create: {
                    id: productId,
                    slug: productId,
                    name: data.productName,
                    brand: data.brand,
                    article: data.article,
                    technicalSpecs: data.specsJson || '{}',
                    marketingFeatures: data.marketingFeatures || '{}',
                    imageUrl: data.imageUrl || null,
                    categoryId,
                }
            });

            // Upsert Offer
            const price = parseFloat(data.price);
            if (!isNaN(price)) {
                await prisma.offer.upsert({
                    where: {
                        productId_companyId: {
                            productId,
                            companyId
                        }
                    },
                    update: {
                        price,
                        priceUnit: data.unit,
                        stockStatus: OfferStockStatus.IN_STOCK,
                    },
                    create: {
                        productId,
                        companyId,
                        price,
                        priceUnit: data.unit,
                        stockStatus: OfferStockStatus.IN_STOCK,
                    }
                });
            }

            count++;
            if (count % 10 === 0) console.log(`Processed ${count} items...`);

        } catch (err) {
            console.error(`Error processing row ${i}:`, err);
        }
    }

    console.log(`Successfully imported ${count} products and offers distributed across suppliers.`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
