import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const cats = await prisma.category.findMany({ include: { children: true } })
  console.log(cats.find(c => c.id === 'blocks')?.children)
  console.log(cats.find(c => c.id === 'stroitelnye-materialy')?.children)
}
main()
