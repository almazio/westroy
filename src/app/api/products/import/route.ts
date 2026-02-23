import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import {
    CATALOG_CSV_TEMPLATE,
    normalizeUnit,
    parseCsvCatalog,
    toPriceUnit,
    type ImportedCatalogRow
} from '@/lib/catalog';
import { createLogger } from '@/lib/logger';

const log = createLogger('api');

type InputRow = Partial<{
    name: string;
    description: string;
    categoryId: string;
    category: string;
    priceFrom: number | string;
    unit: string;
    priceUnit: string;
    inStock: boolean | string | number;
    article: string;
    brand: string;
    boxQuantity: number | string;
    imageUrl: string;
    source: string;
}>;

function boolValue(value: unknown) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value > 0;
    if (typeof value === 'string') {
        return ['1', 'true', 'yes', 'да', 'y', 'in_stock', 'instock'].includes(value.trim().toLowerCase());
    }
    return true;
}

interface PreparedImportRow {
    row: number;
    data: ImportedCatalogRow;
}

interface ImportPreviewItem {
    row: number;
    name: string;
    categoryRef: string;
    action: 'create' | 'update' | 'skip';
    reason?: string;
}

export async function GET() {
    return new NextResponse(CATALOG_CSV_TEMPLATE, {
        headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': 'attachment; filename="westroy-catalog-template.csv"'
        }
    });
}

export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user || (session.user.role !== 'producer' && session.user.role !== 'admin')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = (await request.json()) as {
            companyId?: string;
            rows?: InputRow[];
            csv?: string;
            dryRun?: boolean;
        };
        const dryRun = Boolean(body.dryRun);

        let companyId = '';
        if (session.user.role === 'admin') {
            companyId = String(body.companyId || '').trim();
            if (!companyId) {
                return NextResponse.json({ error: 'companyId required for admin import' }, { status: 400 });
            }
        } else {
            const company = await prisma.company.findUnique({
                where: { ownerId: session.user.id },
                select: { id: true }
            });
            if (!company) {
                return NextResponse.json({ error: 'Company not found' }, { status: 404 });
            }
            companyId = company.id;
        }

        const categories = await prisma.category.findMany({
            select: { id: true, name: true, nameRu: true }
        });
        const categoryMap = new Map<string, string>();
        for (const category of categories) {
            categoryMap.set(category.id.toLowerCase(), category.id);
            categoryMap.set(category.name.toLowerCase(), category.id);
            categoryMap.set(category.nameRu.toLowerCase(), category.id);
        }

        let preparedRows: PreparedImportRow[] = [];
        const rowErrors: Array<{ row: number; column?: string; message: string }> = [];
        const preview: ImportPreviewItem[] = [];

        if (typeof body.csv === 'string' && body.csv.trim()) {
            const parsed = parseCsvCatalog(body.csv);
            preparedRows = parsed.rows;
            rowErrors.push(...parsed.errors);
        } else if (Array.isArray(body.rows)) {
            preparedRows = body.rows.map((row, index) => {
                const rowNo = index + 1;
                const name = String(row.name || '').trim();
                const categoryRef = String(row.categoryId || row.category || '').trim();
                const unitRaw = String(row.unit || '').trim();
                const unit = normalizeUnit(unitRaw);
                const priceFrom = Number(row.priceFrom);

                if (!name) rowErrors.push({ row: rowNo, column: 'name', message: 'Пустое поле name' });
                if (!categoryRef) rowErrors.push({ row: rowNo, column: 'category', message: 'Пустое поле category/categoryId' });
                if (!Number.isFinite(priceFrom) || priceFrom < 0) {
                    rowErrors.push({ row: rowNo, column: 'priceFrom', message: `Некорректная цена: "${String(row.priceFrom || '')}"` });
                }
                if (!unit) rowErrors.push({ row: rowNo, column: 'unit', message: `Некорректная единица: "${unitRaw}"` });

                return {
                    row: rowNo,
                    data: {
                        name,
                        description: String(row.description || '').trim(),
                        categoryRef,
                        priceFrom,
                        unit: (unit || 'шт') as ImportedCatalogRow['unit'],
                        priceUnit: String(row.priceUnit || '').trim() || toPriceUnit((unit || 'шт') as ImportedCatalogRow['unit']),
                        inStock: boolValue(row.inStock),
                        article: String(row.article || '').trim() || undefined,
                        brand: String(row.brand || '').trim() || undefined,
                        boxQuantity: Number.isFinite(Number(row.boxQuantity)) ? Number(row.boxQuantity) : undefined,
                        imageUrl: String(row.imageUrl || '').trim() || undefined,
                        source: String(row.source || '').trim() || undefined,
                    }
                };
            }).filter((r) => {
                return r.data.name && r.data.categoryRef && r.data.priceFrom >= 0 && normalizeUnit(r.data.unit);
            });
        } else {
            return NextResponse.json({ error: 'Передайте csv или rows' }, { status: 400 });
        }

        if (preparedRows.length === 0) {
            return NextResponse.json({
                error: 'Нет валидных строк для импорта',
                errors: rowErrors,
                preview: rowErrors.slice(0, 100).map((error) => ({
                    row: error.row,
                    name: '',
                    categoryRef: '',
                    action: 'skip' as const,
                    reason: `${error.column ? `${error.column}: ` : ''}${error.message}`,
                })),
            }, { status: 400 });
        }

        const existingProducts = await prisma.product.findMany({
            where: { companyId },
            select: { id: true, name: true, unit: true }
        });
        const existingMap = new Map(existingProducts.map((p) => [`${p.name.toLowerCase()}::${p.unit.toLowerCase()}`, p.id]));

        let created = 0;
        let updated = 0;
        let skipped = rowErrors.length;

        for (const error of rowErrors) {
            preview.push({
                row: error.row,
                name: '',
                categoryRef: '',
                action: 'skip',
                reason: `${error.column ? `${error.column}: ` : ''}${error.message}`,
            });
        }

        for (const prepared of preparedRows) {
            const { row, data } = prepared;
            const categoryId = categoryMap.get(data.categoryRef.toLowerCase());
            if (!categoryId) {
                skipped += 1;
                rowErrors.push({ row, column: 'category', message: `Категория не найдена: "${data.categoryRef}"` });
                preview.push({
                    row,
                    name: data.name,
                    categoryRef: data.categoryRef,
                    action: 'skip',
                    reason: `category: Категория не найдена: "${data.categoryRef}"`,
                });
                continue;
            }

            const key = `${data.name.toLowerCase()}::${data.unit.toLowerCase()}`;
            const existingId = existingMap.get(key);

            if (dryRun) {
                if (existingId) {
                    updated += 1;
                    preview.push({
                        row,
                        name: data.name,
                        categoryRef: data.categoryRef,
                        action: 'update',
                        reason: 'Найден существующий товар (name + unit)',
                    });
                } else {
                    created += 1;
                    preview.push({
                        row,
                        name: data.name,
                        categoryRef: data.categoryRef,
                        action: 'create',
                        reason: 'Новый товар',
                    });
                }
                continue;
            }

            if (existingId) {
                await prisma.product.update({
                    where: { id: existingId },
                    data: {
                        description: data.description,
                        categoryId,
                        priceFrom: data.priceFrom,
                        unit: data.unit,
                        priceUnit: data.priceUnit,
                        inStock: data.inStock,
                        article: data.article || null,
                        brand: data.brand || null,
                        boxQuantity: data.boxQuantity ?? null,
                        imageUrl: data.imageUrl || null,
                        source: data.source || null,
                    },
                });
                updated += 1;
                preview.push({
                    row,
                    name: data.name,
                    categoryRef: data.categoryRef,
                    action: 'update',
                    reason: 'Обновлен существующий товар',
                });
            } else {
                await prisma.product.create({
                    data: {
                        companyId,
                        name: data.name,
                        description: data.description,
                        categoryId,
                        priceFrom: data.priceFrom,
                        unit: data.unit,
                        priceUnit: data.priceUnit,
                        inStock: data.inStock,
                        article: data.article || null,
                        brand: data.brand || null,
                        boxQuantity: data.boxQuantity ?? null,
                        imageUrl: data.imageUrl || null,
                        source: data.source || null,
                    },
                });
                created += 1;
                preview.push({
                    row,
                    name: data.name,
                    categoryRef: data.categoryRef,
                    action: 'create',
                    reason: 'Создан новый товар',
                });
            }
        }

        return NextResponse.json({
            ok: true,
            dryRun,
            created,
            updated,
            skipped,
            totalReceived: preparedRows.length,
            errors: rowErrors.slice(0, 50),
            preview: preview
                .sort((a, b) => a.row - b.row)
                .slice(0, 120),
        });
    } catch (error) {
        log.error('Failed to import products:', error);
        return NextResponse.json({ error: 'Failed to import products' }, { status: 500 });
    }
}
