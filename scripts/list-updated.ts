import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const products = await prisma.product.findMany({
        where: {
            NOT: {
                additionalImages: null
            }
        },
        select: {
            id: true,
            name: true,
            slug: true
        }
    })

    console.log('Products with multiple images:')
    products.forEach(p => {
        console.log(`- ${p.name} (Slug: ${p.slug}, ID: ${p.id})`)
    })
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
