import { notFound } from 'next/navigation';
import { getProductBySlug, getProductById } from '@/lib/db';
import ProductClient from './ProductClient';
import styles from './product.module.css';

interface Props {
    params: {
        slug: string;
    };
}

export default async function ProductPage({ params }: Props) {
    const { slug } = await params;

    let product = await getProductBySlug(slug);

    if (!product) {
        try {
            product = await getProductById(slug);
        } catch (e) {
            product = null;
        }
    }

    if (!product) {
        notFound();
    }

    // Sort offers by price
    const offers = [...(product.offers || [])].sort((a, b) => (a.price || 999999) - (b.price || 999999));

    return (
        <main className={styles.productPage}>
            <div className="container">
                <ProductClient product={product} offers={offers} />
            </div>
        </main>
    );
}
