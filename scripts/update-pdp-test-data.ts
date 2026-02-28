import { PrismaClient } from '../src/generated/sqlite-client'

const prisma = new PrismaClient()

async function main() {
    console.log('Updating test data for PDP...')

    // Find some products
    const products = await prisma.product.findMany({ take: 10 })

    for (const p of products) {
        let additionalImages = '[]'
        let technicalSpecs = '{}'

        if (p.name.includes('Кирпич')) {
            additionalImages = JSON.stringify([
                'https://static.tildacdn.com/tild3133-6635-4333-b261-643537333939/brick_1.jpg',
                'https://static.tildacdn.com/tild3530-3665-4338-a232-353164623164/brick_2.jpg'
            ])
            technicalSpecs = JSON.stringify({
                'Марка': 'М-150',
                'Размер': '250х120х65 мм',
                'Вес': '3.5 кг',
                'Морозостойкость': 'F50'
            })
        } else if (p.name.includes('Металлочерепица')) {
            additionalImages = JSON.stringify([
                'https://stroy-alternativa.ru/upload/iblock/c61/c61839e9e8f8f0f0e0e0e0e0e0e0e0e0.jpg',
                'https://stroy-alternativa.ru/upload/iblock/8a2/8a204689255776d6c4c9e887f8f8f8f.jpg'
            ])
            technicalSpecs = JSON.stringify({
                'Толщина': '0.45 мм',
                'Цвет': 'RAL 8017',
                'Покрытие': 'Полиэстер',
                'Ширина полная': '1190 мм'
            })
        } else {
            technicalSpecs = JSON.stringify({
                'Страна': 'Казахстан',
                'Статус': 'В наличии',
                'Тип': 'Оптовая продажа'
            })
        }

        await prisma.product.update({
            where: { id: p.id },
            data: {
                additionalImages,
                technicalSpecs
            }
        })
        console.log(`Updated product: ${p.name}`)
    }
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
