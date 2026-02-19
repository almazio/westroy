
import styles from './PopularMaterials.module.css';
import { toAppUrl } from '@/lib/urls';

const MATERIALS = [
    { name: 'Бетон М250' },
    { name: 'Арматура A500C' },
    { name: 'Песок мытый' },
    { name: 'Щебень 20-40' },
];

export default function PopularMaterials() {
    return (
        <section className={styles.section}>
            <div className="container">
                <h2 className={styles.title}>Популярные запросы</h2>
                <div className={styles.grid}>
                    {MATERIALS.map((m, i) => (
                        <a href={toAppUrl(`/search?q=${encodeURIComponent(m.name)}`)} key={i} className={styles.card}>
                            <div className={styles.info}>
                                <h3 className={styles.name}>{m.name}</h3>
                                <span className={styles.queries}>Быстрый запрос поставщикам</span>
                            </div>
                            <div className={styles.arrow}>→</div>
                        </a>
                    ))}
                </div>
            </div>
        </section>
    )
}
