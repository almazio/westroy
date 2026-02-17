
import Link from 'next/link';
import styles from './FeaturedProducers.module.css';
import { getCompanies, getCategories } from '@/lib/db';

export default async function FeaturedProducers() {
    const companies = (await getCompanies()).filter(c => c.verified).slice(0, 4);
    const categories = await getCategories();
    if (companies.length === 0) return null;

    return (
        <section className={styles.section}>
            <div className="container">
                <h2 className={styles.sectionTitle}>Поставщики в каталоге</h2>
                <div className={styles.grid}>
                    {companies.map(company => {
                        const cat = categories.find(c => c.id === company.categoryId);
                        return (
                            <article key={company.id} className={styles.card}>
                                <Link href={`/company/${company.id}`} className={styles.cardLink}>
                                <div className={styles.cardHeader}>
                                    <div className={styles.logoPlaceholder}>
                                        {company.name[0]}
                                    </div>
                                </div>
                                <div className={styles.cardBody}>
                                    <h3 className={styles.name}>{company.name}</h3>
                                    <p className={styles.category}>{cat?.nameRu}</p>
                                </div>
                                </Link>
                                <div className={styles.actions}>
                                    <Link href={`/company/${company.id}`} className={`btn btn-primary ${styles.requestBtn}`}>
                                        Запросить цену
                                    </Link>
                                </div>
                            </article>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
