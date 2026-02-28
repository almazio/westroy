import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getCategories, getCategoryById } from '@/lib/db';
import styles from '@/app/search/page.module.css';

interface Props {
    params: {
        slug: string;
    };
}

export default async function CatalogCategoryPage({ params }: Props) {
    const { slug } = await params;

    // We need to find the category. It could be a slug or an ID.
    const allCategories = await getCategories();

    // Flatten categories to search by slug or id
    let foundCategory = null;
    const findCat = (cats: any[]) => {
        for (const cat of cats) {
            if (cat.slug === slug || cat.id === slug) {
                foundCategory = cat;
                return;
            }
            if (cat.children) findCat(cat.children);
        }
    };
    findCat(allCategories);

    if (!foundCategory) {
        notFound();
    }

    // Fetch full category info with children
    const category = await getCategoryById((foundCategory as any).id);

    if (!category) {
        notFound();
    }

    // If it's a leaf category (no children), redirect to search to show products
    // We could render the search UI here, but search UI is a complex client component.
    if (!category.children || category.children.length === 0) {
        redirect(`/search?category=${category.slug || category.id}`);
    }

    // If it's a parent category, render the Directory Hub instantly
    return (
        <div className="page" style={{ paddingTop: '80px' }}>
            <div className="container">
                <div className={`${styles.subCategoriesWrap} ${styles.directoryHubMode}`}>
                    <h1 style={{ marginBottom: '24px', fontSize: '2rem', fontWeight: 700 }}>{category.nameRu}</h1>
                    <div className={styles.subCategoriesGrid}>
                        {category.children.map(child => (
                            <Link key={child.id} href={`/catalog/${child.slug || child.id}`} className={styles.subCategoryCard}>
                                <span className={styles.subCategoryIcon}>{child.icon || '📦'}</span>
                                {child.nameRu}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
