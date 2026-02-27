import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const p = await prisma.product.count({ where: { categoryId: 'blocks' } })
  console.log('blocks products:', p)
}
main()
