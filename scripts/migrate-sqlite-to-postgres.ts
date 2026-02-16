import 'dotenv/config';
import { PrismaClient as PgClient } from '../src/generated/client/client';
import { PrismaClient as SqliteClient } from '../src/generated/sqlite-client/client';

const pg = new PgClient();
const sqlite = new SqliteClient();

async function migrateRegions() {
    const rows = await sqlite.region.findMany();
    for (const row of rows) {
        await pg.region.upsert({
            where: { id: row.id },
            update: {
                name: row.name,
                nameRu: row.nameRu,
            },
            create: {
                id: row.id,
                name: row.name,
                nameRu: row.nameRu,
            },
        });
    }
    return rows.length;
}

async function migrateCategories() {
    const rows = await sqlite.category.findMany();
    for (const row of rows) {
        await pg.category.upsert({
            where: { id: row.id },
            update: {
                name: row.name,
                nameRu: row.nameRu,
                icon: row.icon,
                keywords: row.keywords,
            },
            create: {
                id: row.id,
                name: row.name,
                nameRu: row.nameRu,
                icon: row.icon,
                keywords: row.keywords,
            },
        });
    }
    return rows.length;
}

async function migrateUsers() {
    const rows = await sqlite.user.findMany();
    for (const row of rows) {
        await pg.user.upsert({
            where: { id: row.id },
            update: {
                name: row.name,
                email: row.email,
                phone: row.phone,
                passwordHash: row.passwordHash,
                role: row.role,
            },
            create: {
                id: row.id,
                name: row.name,
                email: row.email,
                phone: row.phone,
                passwordHash: row.passwordHash,
                role: row.role,
                createdAt: row.createdAt,
                updatedAt: row.updatedAt,
            },
        });
    }
    return rows.length;
}

async function migrateCompanies() {
    const rows = await sqlite.company.findMany();
    for (const row of rows) {
        await pg.company.upsert({
            where: { id: row.id },
            update: {
                name: row.name,
                description: row.description,
                address: row.address,
                phone: row.phone,
                delivery: row.delivery,
                logoUrl: row.logoUrl,
                verified: row.verified,
                categoryId: row.categoryId,
                regionId: row.regionId,
                ownerId: row.ownerId,
            },
            create: {
                id: row.id,
                name: row.name,
                description: row.description,
                address: row.address,
                phone: row.phone,
                delivery: row.delivery,
                logoUrl: row.logoUrl,
                verified: row.verified,
                categoryId: row.categoryId,
                regionId: row.regionId,
                ownerId: row.ownerId,
                createdAt: row.createdAt,
                updatedAt: row.updatedAt,
            },
        });
    }
    return rows.length;
}

async function migrateProducts() {
    const rows = await sqlite.product.findMany();
    for (const row of rows) {
        await pg.product.upsert({
            where: { id: row.id },
            update: {
                name: row.name,
                description: row.description,
                unit: row.unit,
                priceFrom: row.priceFrom,
                priceUnit: row.priceUnit,
                inStock: row.inStock,
                companyId: row.companyId,
                categoryId: row.categoryId,
            },
            create: {
                id: row.id,
                name: row.name,
                description: row.description,
                unit: row.unit,
                priceFrom: row.priceFrom,
                priceUnit: row.priceUnit,
                inStock: row.inStock,
                companyId: row.companyId,
                categoryId: row.categoryId,
                createdAt: row.createdAt,
                updatedAt: row.updatedAt,
            },
        });
    }
    return rows.length;
}

async function migrateRequests() {
    const rows = await sqlite.request.findMany();
    for (const row of rows) {
        await pg.request.upsert({
            where: { id: row.id },
            update: {
                query: row.query,
                parsedCategory: row.parsedCategory,
                parsedVolume: row.parsedVolume,
                parsedCity: row.parsedCity,
                deliveryNeeded: row.deliveryNeeded,
                address: row.address,
                deadline: row.deadline,
                status: row.status,
                userId: row.userId,
                categoryId: row.categoryId,
            },
            create: {
                id: row.id,
                query: row.query,
                parsedCategory: row.parsedCategory,
                parsedVolume: row.parsedVolume,
                parsedCity: row.parsedCity,
                deliveryNeeded: row.deliveryNeeded,
                address: row.address,
                deadline: row.deadline,
                status: row.status,
                userId: row.userId,
                categoryId: row.categoryId,
                createdAt: row.createdAt,
                updatedAt: row.updatedAt,
            },
        });
    }
    return rows.length;
}

async function migrateOffers() {
    const rows = await sqlite.offer.findMany();
    for (const row of rows) {
        await pg.offer.upsert({
            where: { id: row.id },
            update: {
                price: row.price,
                priceUnit: row.priceUnit,
                comment: row.comment,
                deliveryIncluded: row.deliveryIncluded,
                deliveryPrice: row.deliveryPrice,
                validUntil: row.validUntil,
                status: row.status,
                requestId: row.requestId,
                companyId: row.companyId,
            },
            create: {
                id: row.id,
                price: row.price,
                priceUnit: row.priceUnit,
                comment: row.comment,
                deliveryIncluded: row.deliveryIncluded,
                deliveryPrice: row.deliveryPrice,
                validUntil: row.validUntil,
                status: row.status,
                requestId: row.requestId,
                companyId: row.companyId,
                createdAt: row.createdAt,
                updatedAt: row.updatedAt,
            },
        });
    }
    return rows.length;
}

async function main() {
    console.log('Start migration sqlite -> postgres');
    console.log('Using env vars: SQLITE_DATABASE_URL, DATABASE_URL, DIRECT_URL');

    const stats = {
        regions: await migrateRegions(),
        categories: await migrateCategories(),
        users: await migrateUsers(),
        companies: await migrateCompanies(),
        products: await migrateProducts(),
        requests: await migrateRequests(),
        offers: await migrateOffers(),
    };

    console.log('Migration finished.');
    console.table(stats);
}

main()
    .catch((error) => {
        console.error('Migration failed:', error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await Promise.all([sqlite.$disconnect(), pg.$disconnect()]);
    });
