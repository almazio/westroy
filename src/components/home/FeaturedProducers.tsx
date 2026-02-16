
import Link from 'next/link';
import styles from './FeaturedProducers.module.css';
import { getCompanies, getCategories } from '@/lib/db';

export default async function FeaturedProducers() {
    const companies = (await getCompanies()).filter(c => c.verified).slice(0, 4);
    const categories = await getCategories();

    return (
        <section className={styles.section}>
            <div className="container">
                <h2 className={styles.sectionTitle}>Проверенные производители</h2>
                <div className={styles.grid}>
                    {companies.map(company => {
                        const cat = categories.find(c => c.id === company.categoryId);
                        return (
                            <Link key={company.id} href={`/company/${company.id}`} className={styles.card}>
                                <div className={styles.cardHeader}>
                                    <div className={styles.logoPlaceholder}>
                                        {company.name[0]}
                                    </div>
                                    {/* If we had logoUrl, we'd use Image */}
                                    <div className={styles.badges}>
                                        <span className={styles.verifiedBadge}>✓ Проверен</span>
                                    </div>
                                </div>
                                <div className={styles.cardBody}>
                                    <h3 className={styles.name}>{company.name}</h3>
                                    <p className={styles.category}>{cat?.nameRu}</p>
                                    <div className={styles.rating}>
                                        ★★★★★ <span className={styles.ratingCount}>(12 отзывов)</span>
                                    </div>
                                </div>
                            </Link>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
