import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Updating Postgres (Supabase) test data for PDP...')

    // Find products
    const products = await prisma.product.findMany()

    for (const p of products) {
        let additionalImages: string[] = []
        let technicalSpecs: Record<string, string> = {}

        if (p.name.includes('Кирпич')) {
            additionalImages = [
                'https://static.tildacdn.com/tild3133-6635-4333-b261-643537333939/brick_1.jpg',
                'https://static.tildacdn.com/tild3530-3665-4338-a232-353164623164/brick_2.jpg'
            ]
            technicalSpecs = {
                'Марка': 'М-150',
                'Размер': '250х120х65 мм',
                'Вес': '3.5 кг',
                'Морозостойкость': 'F50'
            }
        } else if (p.name.includes('Металлочерепица')) {
            additionalImages = [
                'https://stroy-alternativa.ru/upload/iblock/c61/c61839e9e8f8f0f0e0e0e0e0e0e0e0e0.jpg',
                'https://stroy-alternativa.ru/upload/iblock/8a2/8a204689255776d6c4c9e887f8f8f8f.jpg'
            ]
            technicalSpecs = {
                'Толщина': '0.45 мм',
                'Цвет': 'RAL 8017',
                'Покрытие': 'Полиэстер',
                'Ширина полная': '1190 мм'
            }
        } else if (p.name.includes('Арматура')) {
            additionalImages = [
                'https://st6.metalloprokat.ru/images/products/detail/арматура-а500с-10мм.jpg',
                'https://st.stpulsk.ru/images/product/383/941/394_big.jpg'
            ]
            technicalSpecs = {
                'Класс': 'А500С',
                'Диаметр': '10-12 мм',
                'Длина': '11.7 м',
                'Стандарт': 'ГОСТ 52544-2006'
            }
        }

        if (additionalImages.length > 0) {
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
    console.log('Update complete!')
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
