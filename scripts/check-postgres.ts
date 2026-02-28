import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        const count = await prisma.product.count()
        console.log(`Connection successful. Total products in Postgres: ${count}`)

        const sample = await prisma.product.findMany({
            take: 3,
            select: { name: true, id: true, additionalImages: true }
        })
        console.log('Sample products:')
        sample.forEach(s => console.log(`- ${s.name}: ${JSON.stringify(s.additionalImages)}`))
    } catch (e) {
        console.error('Connection failed:', e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
