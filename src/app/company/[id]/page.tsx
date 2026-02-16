import { getCompanyById, getProductsByCompany, getCategoryById } from '@/lib/db';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import styles from './page.module.css';

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const company = await getCompanyById(id);
    if (!company) notFound();

    const products = await getProductsByCompany(id);
    const category = await getCategoryById(company.categoryId);

    const formatPrice = (price: number) => new Intl.NumberFormat('ru-RU').format(price);

    return (
        <div className="page">
            <div className="container">
                {/* Breadcrumb */}
                <div className={styles.breadcrumb}>
                    <Link href="/">Главная</Link> / <Link href={`/search?category=${company.categoryId}`}>{category?.nameRu}</Link> / <span>{company.name}</span>
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
                            <div className={styles.products}>
                                {products.map(product => (
                                    <div key={product.id} className={styles.productCard}>
                                        <div className={styles.productInfo}>
                                            <h4>{product.name}</h4>
                                            <p>{product.description}</p>
                                        </div>
                                        <div className={styles.productPrice}>
                                            <div className={styles.priceFrom}>от {formatPrice(product.priceFrom)} ₸</div>
                                            <div className={styles.priceUnit}>{product.priceUnit}</div>
                                            {product.inStock && <span className="badge badge-success">В наличии</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
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
