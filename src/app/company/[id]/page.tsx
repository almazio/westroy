import { getCompanyById, getProductsByCompany, getCategoryById, getCategories } from '@/lib/db';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import styles from './page.module.css';

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const company = await getCompanyById(id);
    if (!company) notFound();

    const products = await getProductsByCompany(id);
    const categories = await getCategories();
    const category = products.length > 0 ? categories.find(c => c.id === products[0].categoryId) : null;
    const categoryMap = new Map(categories.map((item) => [item.id, item]));

    const groupedProducts = [...products]
        .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
        .reduce<Record<string, typeof products>>((acc, product) => {
            if (!acc[product.categoryId]) acc[product.categoryId] = [];
            acc[product.categoryId].push(product);
            return acc;
        }, {});

    const groupedEntries = Object.entries(groupedProducts).sort((a, b) => {
        const nameA = categoryMap.get(a[0])?.nameRu || a[0];
        const nameB = categoryMap.get(b[0])?.nameRu || b[0];
        return nameA.localeCompare(nameB, 'ru');
    });

    const formatPrice = (price: number) => new Intl.NumberFormat('ru-RU').format(price);

    return (
        <div className="page">
            <div className="container">
                {/* Breadcrumb */}
                <div className={styles.breadcrumb}>
                    <Link href="/">Главная</Link> / {category ? <><Link href={`/search?category=${category.id}`}>{category.nameRu}</Link> / </> : null}<span>{company.name}</span>
                </div>

                {/* Company Header */}
                <div className={styles.header}>
                    <div className={styles.avatar}>
                        {company.name.charAt(0)}
                    </div>
                    <div className={styles.headerInfo}>
                        <h1>{company.name}</h1>
                        <div className={styles.badges}>
                            <span className="badge badge-warning">{category?.icon} {category?.nameRu}</span>
                            {company.delivery && <span className="badge badge-success">🚚 Доставка</span>}
                            {company.verified && <span className="badge badge-info">✓ Проверен</span>}
                        </div>
                    </div>
                </div>

                <div className={styles.content}>
                    <div className={styles.main}>
                        {/* Description */}
                        <div className="card">
                            <h3>О компании</h3>
                            <p className={styles.description}>{company.description}</p>
                        </div>

                        {/* Products */}
                        <div className={styles.productsSection}>
                            <h3>Товары и услуги</h3>
                            {groupedEntries.map(([categoryId, categoryProducts]) => (
                                <section key={categoryId} className={styles.productsGroup}>
                                    <div className={styles.productsGroupHeader}>
                                        <h4>{categoryMap.get(categoryId)?.nameRu || 'Без категории'}</h4>
                                        <span className="badge">{categoryProducts.length}</span>
                                    </div>
                                    <div className={styles.products}>
                                        {categoryProducts.map(product => {
                                            const specs = (product.technicalSpecs as Record<string, any>) || {};
                                            const offer = product.offers?.[0]; // getProductsByCompany should return the company's offer
                                            const inStock = offer?.stockStatus === 'IN_STOCK';
                                            const price = offer?.price || 0;
                                            const priceUnit = offer?.priceUnit || 'тг';

                                            return (
                                                <div key={product.id} className={styles.productCard}>
                                                    {product.imageUrl && (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img
                                                            src={product.imageUrl}
                                                            alt={product.name}
                                                            className={styles.productImage}
                                                            loading="lazy"
                                                        />
                                                    )}
                                                    <div className={styles.productInfo}>
                                                        <h4>{product.name}</h4>
                                                        <p>{product.description}</p>
                                                        <div className={styles.productMeta}>
                                                            {product.article && <span className="badge">Артикул: {product.article}</span>}
                                                            {product.brand && <span className="badge">{product.brand}</span>}
                                                            {specs.boxQuantity != null && <span className="badge">Упаковка: {specs.boxQuantity} шт</span>}
                                                        </div>
                                                        <details className={styles.productDetails}>
                                                            <summary>Подробнее</summary>
                                                            <div className={styles.productDetailsBody}>
                                                                {specs.unit && <div>Ед. изм.: {specs.unit}</div>}
                                                                <div>{inStock ? 'В наличии' : 'Под заказ'}</div>
                                                                {specs.source && <div>Источник: {specs.source}</div>}
                                                            </div>
                                                        </details>
                                                    </div>
                                                    <div className={styles.productPrice}>
                                                        <div className={styles.priceFrom}>
                                                            {price > 0 ? `от ${formatPrice(price)} ₸` : 'Цена по запросу'}
                                                        </div>
                                                        <div className={styles.priceUnit}>{priceUnit}</div>
                                                        {inStock && <span className="badge badge-success">В наличии</span>}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </section>
                            ))}
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className={styles.sidebar}>
                        <div className="card">
                            <h4>Контакты</h4>
                            <div className={styles.contactItem}>
                                <span>📍</span>
                                <div>
                                    <div className={styles.contactLabel}>Адрес</div>
                                    <div>{company.address}</div>
                                </div>
                            </div>
                            <div className={styles.contactItem}>
                                <span>📞</span>
                                <div>
                                    <div className={styles.contactLabel}>Телефон</div>
                                    <div>{company.phone}</div>
                                </div>
                            </div>
                            <div className={styles.contactItem}>
                                <span>🗺️</span>
                                <div>
                                    <div className={styles.contactLabel}>Регион</div>
                                    <div>Шымкент</div>
                                </div>
                            </div>
                        </div>

                        <Link
                            href={`/search?q=${encodeURIComponent(category?.nameRu || '')}`}
                            className="btn btn-primary btn-lg"
                            style={{ width: '100%', marginTop: 16 }}
                        >
                            📨 Запросить цену
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
