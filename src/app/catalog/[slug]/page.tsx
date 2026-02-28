import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getCategoryById } from '@/lib/db';
import { prisma } from '@/lib/db';
import { mapCategory } from '@/lib/db/mappers';
import styles from './page.module.css';

interface Props {
    params: {
        slug: string;
    };
}

export default async function CatalogCategoryPage({ params }: Props) {
    const { slug } = await params;
    const decodedSlug = decodeURIComponent(slug);

    // Fetch directly by ID or Slug without needing the full tree
    let category = await getCategoryById(decodedSlug);

    if (!category) {
        // Fallback to checking the slug field directly
        const catRecord = await prisma.category.findFirst({
            where: { slug: decodedSlug },
            include: { children: true }
        });
        if (catRecord) {
            category = mapCategory(catRecord as any);
        }
    }

    if (!category) {
        notFound();
    }

    // If leaf category (no children), redirect to search
    if (!category.children || category.children.length === 0) {
        redirect(`/search?category=${category.slug || category.id}`);
    }

    return (
        <div className="page" style={{ paddingTop: '80px' }}>
            <div className="container">
                <div className={styles.breadcrumbs}>
                    <Link href="/#categories">Каталог</Link>
                    <span className={styles.separator}>/</span>
                    <span className={styles.current}>{category.nameRu}</span>
                </div>
                <h1 className={styles.heading}>{category.nameRu}</h1>
                <div className={styles.grid}>
                    {category.children.map((child: any) => (
                        <Link key={child.id} href={`/catalog/${child.slug || child.id}`} className={styles.card}>
                            <div className={styles.cardIcon}>
                                {child.icon || '📦'}
                            </div>
                            <div className={styles.cardName}>{child.nameRu}</div>
                            {child.children && child.children.length > 0 && (
                                <div className={styles.childCount}>
                                    {child.children.length} подкатегор.
                                </div>
                            )}
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
