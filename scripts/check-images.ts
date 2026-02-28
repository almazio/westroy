import { PrismaClient } from '../src/generated/sqlite-client'

const prisma = new PrismaClient()

async function main() {
    const products = await prisma.product.findMany({
        where: {
            NOT: {
                OR: [
                    { additionalImages: '[]' },
                    { additionalImages: null }
                ]
            }
        },
        select: {
            id: true,
            name: true,
            additionalImages: true
        }
    })

    console.log('Products with additional images:')
    if (products.length === 0) {
        console.log('None found!')
    }
    products.forEach(p => {
        console.log(`- ${p.name} (ID: ${p.id})`)
        console.log(`  Images: ${p.additionalImages}`)
    })
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
