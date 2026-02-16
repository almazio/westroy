
import Link from 'next/link';
import styles from './PopularMaterials.module.css';

const MATERIALS = [
    { name: 'Бетон М250', queries: '450', trend: '+12%' },
    { name: 'Арматура A500C', queries: '320', trend: '+5%' },
    { name: 'Песок мытый', queries: '280', trend: '+8%' },
    { name: 'Щебень 20-40', queries: '180', trend: '+2%' },
];

export default function PopularMaterials() {
    return (
        <section className={styles.section}>
            <div className="container">
                <h2 className={styles.title}>Популярные запросы</h2>
                <div className={styles.grid}>
                    {MATERIALS.map((m, i) => (
                        <Link href={`/search?q=${m.name}`} key={i} className={styles.card}>
                            <div className={styles.info}>
                                <h3 className={styles.name}>{m.name}</h3>
                                <span className={styles.queries}>{m.queries} поисков сегодня</span>
                            </div>
                            <div className={styles.arrow}>→</div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    )
}
