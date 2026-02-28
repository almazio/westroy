import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

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
        ' ': '-', '(': '', ')': '', ',': ''
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
            console.log(`[Category] Created: ${nameRu} (${id}) under ${parentId || 'root'}`);
        }
        parentId = id;
        lastCategoryId = id;
    }

    return lastCategoryId;
}

async function main() {
    console.log('Starting Mega Catalog Import...');

    // 1. Ensure Region Shymkent exists as fallback
    let region = await prisma.region.findUnique({ where: { id: 'shymkent' } });
    if (!region) {
        region = await prisma.region.create({
            data: { id: 'shymkent', name: 'Shymkent', nameRu: 'Шымкент' }
        });
    }

    // Default Company for imports without hardcoded external mapping
    const defaultCompanyId = 'c_mega_import';
    const existingCompany = await prisma.company.findUnique({ where: { id: defaultCompanyId } });
    if (!existingCompany) {
        await prisma.company.create({
            data: {
                id: defaultCompanyId,
                name: 'Mega Import Supplier',
                description: 'Автоматически созданный поставщик для импорта',
                baseCityId: 'shymkent',
                deliveryRegions: ['Шымкент', 'Туркестанская обл', 'Весь Казахстан'],
                delivery: true,
                verified: true,
            }
        });
        console.log(`[Company] Created generic import company: Mega Import Supplier`);
    }

    const csvPath = path.join(process.cwd(), 'public', 'westroy_unified_mega_catalog.csv');
    if (!fs.existsSync(csvPath)) {
        throw new Error(`CSV file not found at ${csvPath}`);
    }

    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim().length > 0);

    // Headers expected:
    // fullPath,slug,productName,brand,price,unit,oldPrice,discountLabel,minOrder,tags,technicalSpecs,marketingFeatures,relatedSkus,source,city,deliveryRegions
    const headers = parseCsvLine(lines[0]);
    console.log(`Parsed Headers: ${headers.join(', ')}`);

    let processedCount = 0;

    for (let i = 1; i < lines.length; i++) {
        const row = parseCsvLine(lines[i]);
        if (row.length < 5) continue; // Skip malformed rows

        const data: Record<string, string> = {};
        headers.forEach((h, index) => {
            data[h] = row[index] || '';
        });

        const categoryId = await getOrCreateCategoryPath(data.fullPath);

        // Product
        const productId = data.slug || slugify(data.productName);

        const tagsJson = data.tags ? JSON.stringify(data.tags.split(',').map(t => t.trim())) : '[]';
        let techSpecs = '{}';
        try { if (data.technicalSpecs) techSpecs = data.technicalSpecs; JSON.parse(techSpecs); } catch (e) { techSpecs = '{}'; }

        let marketFeatures = '{}';
        try { if (data.marketingFeatures) marketFeatures = data.marketingFeatures; JSON.parse(marketFeatures); } catch (e) { marketFeatures = '{}'; }

        await prisma.product.upsert({
            where: { id: productId },
            update: {
                name: data.productName,
                categoryId,
                article: data.slug,
                brand: data.brand || null,
                tags: tagsJson,
                technicalSpecs: techSpecs,
                marketingFeatures: marketFeatures,
            },
            create: {
                id: productId,
                name: data.productName,
                categoryId,
                slug: data.slug,
                article: data.slug, // fallback
                brand: data.brand || null,
                tags: tagsJson,
                technicalSpecs: techSpecs,
                marketingFeatures: marketFeatures,
            }
        });

        // Offer
        const offerId = `offer_${defaultCompanyId}_${productId}`;
        const price = parseFloat(data.price);
        const oldPrice = data.oldPrice ? parseFloat(data.oldPrice) : null;
        const minOrder = data.minOrder ? parseFloat(data.minOrder) : null;

        if (!isNaN(price)) {
            await prisma.offer.upsert({
                where: { id: offerId },
                update: {
                    price,
                    priceUnit: data.unit || 'шт',
                    oldPrice,
                    discountLabel: data.discountLabel || null,
                    minOrder,
                },
                create: {
                    id: offerId,
                    productId,
                    companyId: defaultCompanyId,
                    price,
                    priceUnit: data.unit || 'шт',
                    oldPrice,
                    discountLabel: data.discountLabel || null,
                    minOrder,
                    stockStatus: 'IN_STOCK'
                }
            });
        }

        processedCount++;
    }

    console.log(`\nImport successful! Processed ${processedCount} products and offers.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
