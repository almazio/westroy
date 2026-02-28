import Link from 'next/link';
import { getProducts } from '@/lib/db';
import styles from './HotOffers.module.css';

export default async function HotOffers() {
    const products = await getProducts();

    // Pick 4 featured products for the homepage
    const featured = products.slice(0, 4);

    if (featured.length === 0) return null;

    return (
        <section className={styles.section}>
            <div className="container">
                <div className={styles.header}>
                    <h2 className={styles.title}>Горячие предложения</h2>
                    <Link href="/search" className={styles.viewAll}>Смотреть все →</Link>
                </div>
                <div className={styles.grid}>
                    {featured.map((p) => {
                        const bestOffer = p.offers?.sort((a, b) => a.price - b.price)[0];
                        const price = bestOffer?.price || 0;
                        const unit = bestOffer?.priceUnit || 'ед';
                        const hasDiscount = !!bestOffer?.oldPrice;

                        return (
                            <Link href={`/product/${p.slug || p.id}`} key={p.id} className={styles.card}>
                                <div className={styles.imageWrap}>
                                    <img src={p.imageUrl || '/images/catalog/materials.jpg'} alt={p.name} className={styles.image} />
                                    {hasDiscount && <span className={styles.discountBadge}>Акция</span>}
                                </div>
                                <div className={styles.info}>
                                    <h3 className={styles.name}>{p.name}</h3>
                                    <div className={styles.brand}>{p.brand || 'Westroy Standard'}</div>
                                    <div className={styles.priceRow}>
                                        <div className={styles.price}>
                                            {price > 0 ? `${price.toLocaleString()} ₸` : 'По запросу'}
                                            {price > 0 && <span className={styles.unit}> / {unit}</span>}
                                        </div>
                                        {bestOffer?.oldPrice && (
                                            <div className={styles.oldPrice}>{bestOffer.oldPrice.toLocaleString()} ₸</div>
                                        )}
                                    </div>
                                    <span className={styles.buyBtn}>Подробнее</span>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
