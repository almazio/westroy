
import Link from 'next/link';
import styles from './CategoriesGrid.module.css';
import { getCategories } from '@/lib/db';

export default async function CategoriesGrid() {
    const categories = await getCategories();

    return (
        <section className={styles.section}>
            <div className="container">
                <div className={styles.header}>
                    <h2 className={styles.title}>Категории материалов</h2>
                    <Link href="/categories" className={styles.viewAll}>
                        Все категории →
                    </Link>
                </div>

                <div className={styles.grid}>
                    {categories.map((cat) => (
                        <Link
                            key={cat.id}
                            href={`/search?category=${cat.id}`}
                            className={styles.card}
                        >
                            <div className={styles.iconWrapper}>
                                <span className={styles.icon}>{cat.icon}</span>
                            </div>
                            <h3 className={styles.cardTitle}>{cat.nameRu}</h3>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
