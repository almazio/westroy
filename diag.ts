
import { PrismaClient } from './src/generated/client/client';
const prisma = new PrismaClient();

async function main() {
    console.log('--- USERS ---');
    const users = await prisma.user.findMany();
    console.log(JSON.stringify(users, null, 2));

    console.log('\n--- COMPANIES ---');
    const companies = await prisma.company.findMany();
    console.log(JSON.stringify(companies, null, 2));

    console.log('\n--- CATEGORIES ---');
    const categories = await prisma.category.findMany();
    console.log(JSON.stringify(categories, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
