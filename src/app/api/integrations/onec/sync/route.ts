import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { normalizeUnit, toPriceUnit } from '@/lib/catalog';

type OneCProduct = {
    name: string;
    externalSku?: string;
    description?: string;
    categoryId?: string;
    category?: string;
    priceFrom: number;
    unit: string;
    priceUnit?: string;
    inStock?: boolean;
};

type OneCSyncPayload = {
    companyId?: string;
    companyExternalCode?: string;
    source?: string;
    products: OneCProduct[];
};

type SyncLogEntry = {
    id: string;
    createdAt: string;
    source: string;
    companyId: string;
    totalReceived: number;
    created: number;
    updated: number;
    skipped: number;
    errors: string[];
};

type SyncResult = {
    ok: true;
    created: number;
    updated: number;
    skipped: number;
    totalReceived: number;
    errors: string[];
};

type IdempotencyRecord = {
    key: string;
    createdAt: string;
    source: string;
    companyId: string;
    response: SyncResult;
};

const logDir = path.join(process.cwd(), 'data');
const logFile = path.join(logDir, 'integration-sync-log.json');
const mappingFile = path.join(logDir, 'onec-product-map.json');
const idempotencyFile = path.join(logDir, 'integration-idempotency.json');

function parseCompanyMapFromEnv() {
    const raw = process.env.ONEC_COMPANY_MAP_JSON;
    if (!raw) return new Map<string, string>();
    try {
        const parsed = JSON.parse(raw) as Record<string, string>;
        return new Map(Object.entries(parsed).map(([k, v]) => [k.toLowerCase(), v]));
    } catch {
        return new Map<string, string>();
    }
}

async function readLogs(): Promise<SyncLogEntry[]> {
    try {
        const raw = await fs.readFile(logFile, 'utf8');
        const parsed = JSON.parse(raw) as unknown;
        return Array.isArray(parsed) ? (parsed as SyncLogEntry[]) : [];
    } catch {
        return [];
    }
}

async function pushLog(entry: SyncLogEntry) {
    const logs = await readLogs();
    logs.unshift(entry);
    await fs.mkdir(logDir, { recursive: true });
    await fs.writeFile(logFile, JSON.stringify(logs.slice(0, 200), null, 2), 'utf8');
}

async function readProductMap(): Promise<Record<string, string>> {
    try {
        const raw = await fs.readFile(mappingFile, 'utf8');
        const parsed = JSON.parse(raw) as unknown;
        return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
    } catch {
        return {};
    }
}

async function writeProductMap(map: Record<string, string>) {
    await fs.mkdir(logDir, { recursive: true });
    await fs.writeFile(mappingFile, JSON.stringify(map, null, 2), 'utf8');
}

async function readIdempotency(): Promise<IdempotencyRecord[]> {
    try {
        const raw = await fs.readFile(idempotencyFile, 'utf8');
        const parsed = JSON.parse(raw) as unknown;
        return Array.isArray(parsed) ? (parsed as IdempotencyRecord[]) : [];
    } catch {
        return [];
    }
}

async function writeIdempotency(records: IdempotencyRecord[]) {
    await fs.mkdir(logDir, { recursive: true });
    await fs.writeFile(idempotencyFile, JSON.stringify(records.slice(0, 500), null, 2), 'utf8');
}

export async function GET() {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const logs = await readLogs();
    return NextResponse.json({ logs: logs.slice(0, 50) });
}

export async function POST(request: Request) {
    const integrationKey = process.env.INTEGRATION_API_KEY;
    if (!integrationKey) {
        return NextResponse.json({ error: 'INTEGRATION_API_KEY is not configured' }, { status: 500 });
    }

    const requestKey = request.headers.get('x-integration-key');
    if (!requestKey || requestKey !== integrationKey) {
        return NextResponse.json({ error: 'Unauthorized integration key' }, { status: 401 });
    }
    const idempotencyKey = request.headers.get('x-idempotency-key')?.trim();
    if (!idempotencyKey) {
        return NextResponse.json({ error: 'x-idempotency-key header is required' }, { status: 400 });
    }

    try {
        const body = (await request.json()) as OneCSyncPayload;
        const source = String(body.source || '1C');
        const rows = Array.isArray(body.products) ? body.products : [];
        const companyExternalCode = String(body.companyExternalCode || '').trim().toLowerCase();
        const companyMap = parseCompanyMapFromEnv();
        const companyId =
            String(body.companyId || '').trim() ||
            (companyExternalCode ? (companyMap.get(companyExternalCode) || '') : '');

        const idempotencyRecords = await readIdempotency();
        const existingRecord = idempotencyRecords.find((r) => r.key === idempotencyKey);
        if (existingRecord) {
            return NextResponse.json({
                ...existingRecord.response,
                idempotentReplay: true,
            });
        }

        if (!companyId || rows.length === 0) {
            return NextResponse.json({ error: 'companyId and products[] are required' }, { status: 400 });
        }

        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: { id: true }
        });
        if (!company) {
            return NextResponse.json({ error: 'Company not found' }, { status: 404 });
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

        const existing = await prisma.product.findMany({
            where: { companyId },
            select: { id: true, name: true, unit: true }
        });
        const existingMap = new Map(existing.map((p) => [`${p.name.toLowerCase()}::${p.unit.toLowerCase()}`, p.id]));
        const skuMap = await readProductMap();

        let created = 0;
        let updated = 0;
        let skipped = 0;
        const errors: string[] = [];

        for (let index = 0; index < rows.length; index += 1) {
            const row = rows[index];
            const rowNo = index + 1;
            const name = String(row.name || '').trim();
            const externalSku = String(row.externalSku || '').trim();
            const categoryRef = String(row.categoryId || row.category || '').trim();
            const priceFrom = Number(row.priceFrom);
            const unit = normalizeUnit(String(row.unit || ''));

            if (!name || !categoryRef || !unit || !Number.isFinite(priceFrom) || priceFrom <= 0) {
                skipped += 1;
                errors.push(`Row ${rowNo}: invalid row`);
                continue;
            }

            const categoryId = categoryMap.get(categoryRef.toLowerCase());
            if (!categoryId) {
                skipped += 1;
                errors.push(`Row ${rowNo}: unknown category "${categoryRef}"`);
                continue;
            }

            const key = `${name.toLowerCase()}::${unit.toLowerCase()}`;
            const skuKey = externalSku ? `${companyId.toLowerCase()}::${externalSku.toLowerCase()}` : '';
            const existingIdBySku = skuKey ? skuMap[skuKey] : undefined;
            const existingId = existingIdBySku || existingMap.get(key);
            const data = {
                companyId,
                name,
                description: String(row.description || ''),
                categoryId,
                priceFrom,
                unit,
                priceUnit: String(row.priceUnit || '').trim() || toPriceUnit(unit),
                inStock: row.inStock ?? true,
            };

            if (existingId) {
                await prisma.product.update({ where: { id: existingId }, data });
                updated += 1;
                if (skuKey) skuMap[skuKey] = existingId;
            } else {
                const createdProduct = await prisma.product.create({ data });
                created += 1;
                existingMap.set(key, createdProduct.id);
                if (skuKey) skuMap[skuKey] = createdProduct.id;
            }
        }

        await writeProductMap(skuMap);

        const responsePayload: SyncResult = {
            ok: true,
            created,
            updated,
            skipped,
            totalReceived: rows.length,
            errors: errors.slice(0, 30),
        };

        idempotencyRecords.unshift({
            key: idempotencyKey,
            createdAt: new Date().toISOString(),
            source,
            companyId,
            response: responsePayload,
        });
        await writeIdempotency(idempotencyRecords);

        const logEntry: SyncLogEntry = {
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            source,
            companyId,
            totalReceived: rows.length,
            created,
            updated,
            skipped,
            errors: errors.slice(0, 30),
        };
        await pushLog(logEntry);

        return NextResponse.json(responsePayload);
    } catch (error) {
        console.error('1C sync failed:', error);
        return NextResponse.json({ error: '1C sync failed' }, { status: 500 });
    }
}
