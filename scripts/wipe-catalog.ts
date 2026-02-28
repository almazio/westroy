import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('⚠️ WARNING: Starting complete wipe of Catalog data (Offers, Products, Categories)...');

    // Due to relations, we must delete in a specific order:
    // Categories are linked to Products.
    // Offers are linked to Products and Companies.
    // Order: Offers -> Products -> Categories.

    // 1. Delete Offers
    console.log('Deleting Offers...');
    const deletedOffers = await prisma.offer.deleteMany({});
    console.log(`Deleted ${deletedOffers.count} Offers.`);

    // 2. Delete Products
    console.log('Deleting Products...');
    const deletedProducts = await prisma.product.deleteMany({});
    console.log(`Deleted ${deletedProducts.count} Products.`);

    // 3. Delete Categories
    console.log('Deleting Categories...');
    // Because Categories can have parent-child relations, a standard deleteMany might fail due to foreign key constraints if not careful,
    // but Prisma handles self-relations gracefully with simple deletes or cascade paths if defined. Let's try direct deleteMany first.
    const deletedCategories = await prisma.category.deleteMany({});
    console.log(`Deleted ${deletedCategories.count} Categories.`);

    // 4. Delete Companies
    console.log('Deleting Companies...');
    const deletedCompanies = await prisma.company.deleteMany({});
    console.log(`Deleted ${deletedCompanies.count} Companies.`);

    console.log('✅ Catalog Wipe Complete.');
}

main()
    .catch((e) => {
        console.error('Error during wipe:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
