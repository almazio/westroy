
import styles from './CategoriesGrid.module.css';
import { getCategories } from '@/lib/db';
import { toAppUrl } from '@/lib/urls';

export default async function CategoriesGrid() {
    const categories = await getCategories();

    return (
        <section className={styles.section}>
            <div className="container">
                <div className={styles.header}>
                    <h2 className={styles.title}>Категории материалов</h2>
                    <a href={toAppUrl('/search')} className={styles.viewAll}>
                        Все категории →
                    </a>
                </div>

                <div className={styles.grid}>
                    {categories.map((cat) => (
                        <div key={cat.id} className={styles.card}>
                            <a
                                href={toAppUrl(`/search?category=${cat.id}`)}
                                className={styles.cardHeader}
                            >
                                <div className={styles.iconWrapper}>
                                    <span className={styles.icon}>{cat.icon}</span>
                                </div>
                                <h3 className={styles.cardTitle}>{cat.nameRu}</h3>
                            </a>
                            {cat.children && cat.children.length > 0 && (
                                <ul className={styles.subCategories}>
                                    {cat.children.map((child) => (
                                        <li key={child.id}>
                                            <a href={toAppUrl(`/search?category=${child.id}`)} className={styles.subCategoryLink}>
                                                {child.nameRu}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
