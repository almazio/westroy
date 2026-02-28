import { getCategories } from '@/lib/db';
import Link from 'next/link';
import { Metadata } from 'next';
import styles from './[slug]/page.module.css';

export const metadata: Metadata = {
    title: 'Каталог строительных материалов | WESTROY',
    description: 'Полный каталог строительных материалов, оборудования и спецтехники в Шымкенте. Выберите категорию для поиска надежных поставщиков.',
};

export default async function CatalogDirectoryPage() {
    // Fetch top-level categories
    const categories = await getCategories();

    return (
        <div className="page" style={{ paddingTop: '80px' }}>
            <div className="container">
                <div className={styles.breadcrumbs}>
                    <Link href="/">Главная</Link>
                    <span className={styles.separator}>/</span>
                    <span className={styles.current}>Каталог</span>
                </div>

                <h1 className={styles.heading}>Каталог категорий</h1>

                <div className={styles.grid}>
                    {categories.map((cat: any) => (
                        <Link key={cat.id} href={`/catalog/${cat.slug || cat.id}`} className={styles.card}>
                            <div className={styles.cardIcon}>
                                {cat.icon || '📦'}
                            </div>
                            <div className={styles.cardName}>{cat.nameRu}</div>
                            {cat.children && cat.children.length > 0 && (
                                <div className={styles.childCount}>
                                    {cat.children.length} подкатегор.
                                </div>
                            )}
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
