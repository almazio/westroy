import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const cats = await prisma.category.findMany();
  console.log(cats.map(c => ({ id: c.id, nameRu: c.nameRu, parentId: c.parentId })));
}
main().finally(() => prisma.$disconnect());
