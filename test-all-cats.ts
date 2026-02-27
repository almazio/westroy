import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const cats = await prisma.category.findMany({ include: { children: true } })
  console.dir(cats, { depth: null })
}
main()
