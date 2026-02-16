export const ALLOWED_UNITS = ['м3', 'т', 'шт', 'м', 'кг', 'л', 'час', 'смена', 'рейс'] as const;

export type AllowedUnit = (typeof ALLOWED_UNITS)[number];

export interface ImportedCatalogRow {
    name: string;
    description: string;
    categoryRef: string;
    priceFrom: number;
    unit: AllowedUnit;
    priceUnit: string;
    inStock: boolean;
}

export interface CatalogRowError {
    row: number;
    column?: string;
    message: string;
}

export interface ParsedCatalogRow {
    row: number;
    data: ImportedCatalogRow;
}

export const CATALOG_CSV_TEMPLATE = `name,description,category,priceFrom,unit,priceUnit,inStock
Бетон М300,Тяжелый бетон,Бетон,28000,м3,за м3,true
Арматура A500C 12мм,Рифленая арматура,Арматура,345000,т,за т,true
Песок мытый,Фракция 0-5,Инертные,12000,т,за т,true
`;

function normalizeHeader(value: string) {
    return value.trim().toLowerCase();
}

export function normalizeUnit(value: string): AllowedUnit | null {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return null;

    const aliases: Record<string, AllowedUnit> = {
        'м3': 'м3',
        'м^3': 'м3',
        'м³': 'м3',
        'куб': 'м3',
        'куб.м': 'м3',
        'кубометр': 'м3',
        'тонн': 'т',
        'тонна': 'т',
        'тонны': 'т',
        'т': 'т',
        'шт': 'шт',
        'штук': 'шт',
        'метр': 'м',
        'метры': 'м',
        'м': 'м',
        'кг': 'кг',
        'килограмм': 'кг',
        'л': 'л',
        'литр': 'л',
        'час': 'час',
        'ч': 'час',
        'смена': 'смена',
        'рейс': 'рейс',
    };

    return aliases[normalized] || null;
}

export function toPriceUnit(unit: AllowedUnit) {
    return `за ${unit}`;
}

function parseBoolean(value: string) {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return true;
    return ['1', 'true', 'yes', 'да', 'y', 'in_stock', 'instock'].includes(normalized);
}

export function parseCsvCatalog(csv: string): { rows: ParsedCatalogRow[]; errors: CatalogRowError[] } {
    const lines = csv
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    if (lines.length < 2) {
        return { rows: [], errors: [{ row: 1, message: 'CSV должен содержать заголовки и минимум 1 строку данных' }] };
    }

    const separator = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(separator).map(normalizeHeader);
    const rows: ParsedCatalogRow[] = [];
    const errors: CatalogRowError[] = [];

    const idx = {
        name: headers.indexOf('name'),
        description: headers.indexOf('description'),
        category: headers.indexOf('category'),
        categoryId: headers.indexOf('categoryid'),
        priceFrom: headers.indexOf('pricefrom'),
        unit: headers.indexOf('unit'),
        priceUnit: headers.indexOf('priceunit'),
        inStock: headers.indexOf('instock'),
    };

    if (idx.name === -1 || idx.priceFrom === -1 || idx.unit === -1 || (idx.category === -1 && idx.categoryId === -1)) {
        return {
            rows: [],
            errors: [
                {
                    row: 1,
                    column: 'headers',
                    message: 'Требуемые колонки: name, priceFrom, unit и category/categoryId',
                },
            ],
        };
    }

    for (let i = 1; i < lines.length; i += 1) {
        const raw = lines[i].split(separator).map((v) => v.trim());
        const rowNo = i + 1;
        const name = raw[idx.name] || '';
        const description = idx.description >= 0 ? (raw[idx.description] || '') : '';
        const categoryRef = idx.categoryId >= 0 ? (raw[idx.categoryId] || '') : (raw[idx.category] || '');
        const priceRaw = raw[idx.priceFrom] || '';
        const unitRaw = raw[idx.unit] || '';
        const priceUnit = idx.priceUnit >= 0 && raw[idx.priceUnit] ? raw[idx.priceUnit] : '';
        const inStockRaw = idx.inStock >= 0 ? raw[idx.inStock] || '' : '';

        if (!name) {
            errors.push({ row: rowNo, column: 'name', message: 'Пустое поле name' });
            continue;
        }
        if (!categoryRef) {
            errors.push({ row: rowNo, column: 'category', message: 'Пустое поле category/categoryId' });
            continue;
        }

        const priceFrom = Number(priceRaw.replace(',', '.'));
        if (!Number.isFinite(priceFrom) || priceFrom <= 0) {
            errors.push({ row: rowNo, column: 'priceFrom', message: `Некорректная цена: "${priceRaw}"` });
            continue;
        }

        const unit = normalizeUnit(unitRaw);
        if (!unit) {
            errors.push({ row: rowNo, column: 'unit', message: `Некорректная единица измерения: "${unitRaw}"` });
            continue;
        }

        rows.push({
            row: rowNo,
            data: {
                name,
                description,
                categoryRef,
                priceFrom,
                unit,
                priceUnit: priceUnit || toPriceUnit(unit),
                inStock: parseBoolean(inStockRaw),
            },
        });
    }

    return { rows, errors };
}
