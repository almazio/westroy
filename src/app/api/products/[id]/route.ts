import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { createLogger } from '@/lib/logger';
import slugify from 'slugify'; // Предполагаем наличие slugify или реализуем его

const log = createLogger('api');

// Вспомогательная функция для генерации slug
const generateSlug = (name: string) => {
    return slugify(name, { lower: true, strict: true, locale: 'ru' });
};

// PUT /api/products/[id] - Update product and its associated offer
export async function PUT(request: Request, { params }: { params: { id: string } }) { // Убрал Promise из params
    const { id } = params;
    const session = await auth();

    if (!session?.user || session.user.role !== 'producer') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const product = await prisma.product.findUnique({
            where: { id: id },
            include: { offers: true } // Включаем offers для проверки
        });

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        // Verify ownership via company
        const company = await prisma.company.findUnique({
            where: { ownerId: session.user.id }
        });

        if (!company || (product.offers.length > 0 && !product.offers.some(offer => offer.companyId === company.id))) {
            // Если продукт уже имеет офферы, проверяем, что текущий продюсер имеет хотя бы один из них.
            // Иначе, если продукт без офферов, просто проверяем, что продюсер существует.
            // Это упрощенная логика, в реальной системе может быть сложнее.
            // Для PUT, если продюсер владеет продуктом, он может его обновлять.
            // Если продукт есть, но продюсер его "не владеет" (нет оффера), то это Forbidden.
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        
        const body = await request.json();
        const {
            name,
            description,
            article,
            brand,
            imageUrl,
            additionalImages, // Новое поле
            technicalSpecs,   // Новое поле
            marketingFeatures,// Новое поле
            tags,             // Новое поле
            // Поля ниже относятся к Offer, не к Product напрямую
            price,
            priceUnit,
            oldPrice,
            discountLabel,
            minOrder,
            stockStatus,
            leadTime,
            deliveryPrice,
        } = body;

        // Валидация slug (если есть) или генерация
        const productSlug = (typeof name === 'string' && name.trim()) ? generateSlug(name) : product.slug;
        
        // Валидация article на уникальность, если он меняется
        if (typeof article === 'string' && article.trim() && article.trim() !== product.article) {
            const existingProductWithArticle = await prisma.product.findUnique({
                where: { article: article.trim() }
            });
            if (existingProductWithArticle && existingProductWithArticle.id !== product.id) {
                return NextResponse.json({ error: 'Product with this article already exists' }, { status: 400 });
            }
        }

        // Обновляем Master Product
        const updatedProduct = await prisma.product.update({
            where: { id: id },
            data: {
                name: name || product.name,
                slug: productSlug,
                description: description || product.description,
                article: typeof article === 'string' && article.trim() ? article.trim() : product.article,
                brand: typeof brand === 'string' && brand.trim() ? brand.trim() : product.brand,
                imageUrl: typeof imageUrl === 'string' && imageUrl.trim() ? imageUrl.trim() : product.imageUrl,
                additionalImages: additionalImages && typeof additionalImages === 'object' ? additionalImages : product.additionalImages,
                technicalSpecs: technicalSpecs && typeof technicalSpecs === 'object' ? technicalSpecs : product.technicalSpecs,
                marketingFeatures: marketingFeatures && typeof marketingFeatures === 'object' ? marketingFeatures : product.marketingFeatures,
                tags: tags && typeof tags === 'object' ? tags : product.tags,
            }
        });

        // Теперь обрабатываем Offer от текущей компании-владельца
        if (company) {
            const normalizedPrice = Number(price);
            if (!Number.isFinite(normalizedPrice) || normalizedPrice < 0) {
                return NextResponse.json({ error: 'Invalid price value for offer' }, { status: 400 });
            }

            const currentOffer = await prisma.offer.findUnique({
                where: {
                    productId_companyId: { // Уникальная связь product-company
                        productId: updatedProduct.id,
                        companyId: company.id
                    }
                }
            });

            const offerData = {
                price: normalizedPrice,
                priceUnit: typeof priceUnit === 'string' && priceUnit.trim() ? priceUnit.trim() : 'тг/шт', // Дефолт
                oldPrice: Number.isFinite(Number(oldPrice)) && Number(oldPrice) > 0 ? Number(oldPrice) : null,
                discountLabel: typeof discountLabel === 'string' && discountLabel.trim() ? discountLabel.trim() : null,
                minOrder: Number.isFinite(Number(minOrder)) && Number(minOrder) > 0 ? Number(minOrder) : null,
                stockStatus: stockStatus || 'IN_STOCK', // Дефолтное значение
                leadTime: typeof leadTime === 'string' && leadTime.trim() ? leadTime.trim() : null,
                deliveryPrice: Number.isFinite(Number(deliveryPrice)) && Number(deliveryPrice) >= 0 ? Number(deliveryPrice) : null,
            };

            let upsertedOffer;
            if (currentOffer) {
                // Обновляем существующее предложение
                upsertedOffer = await prisma.offer.update({
                    where: { id: currentOffer.id },
                    data: offerData
                });
            } else {
                // Создаем новое предложение, если его еще нет
                upsertedOffer = await prisma.offer.create({
                    data: {
                        productId: updatedProduct.id,
                        companyId: company.id,
                        ...offerData
                    }
                });
            }
        }

        return NextResponse.json(updatedProduct); // Возвращаем обновленный продукт
    } catch (error) {
        log.error('Failed to update product or offer:', error);
        return NextResponse.json({ error: 'Failed to update product or offer' }, { status: 500 });
    }
}

// DELETE /api/products/[id] - Delete product
export async function DELETE(request: Request, { params }: { params: { id: string } }) { // Убрал Promise из params
    const { id } = params;
    const session = await auth();

    if (!session?.user || session.user.role !== 'producer') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const product = await prisma.product.findUnique({
            where: { id: id },
            include: { offers: true } // Проверяем офферы для более точной авторизации
        });

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        // Verify ownership: Check if the producer has any offer for this product
        const company = await prisma.company.findUnique({
            where: { ownerId: session.user.id }
        });

        if (!company || !product.offers.some(offer => offer.companyId === company.id)) {
            // Если у текущего продюсера нет предложений для этого продукта, он не может его удалять
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Удаление продукта. Благодаря onDelete: Cascade, связанные Offer будут удалены автоматически.
        await prisma.product.delete({
            where: { id: id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        log.error('Failed to delete product:', error);
        return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
    }
}
