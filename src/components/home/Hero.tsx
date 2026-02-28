
import SearchBar from '@/components/SearchBar';
import styles from './Hero.module.css';
import Link from 'next/link';

const QUICK_SEARCHES = [
    { label: 'Бетон М300', query: 'Бетон М300' },
    { label: 'Песок мытый', query: 'Песок мытый' },
    { label: 'Арматура 12мм', query: 'Арматура 12мм' },
    { label: 'Газоблок 600x300', query: 'Газоблок 600x300' },
];

export default function Hero() {
    return (
        <section id="hero" className={styles.hero}>
            <div className={styles.content}>
                <div className={styles.searchWrapper}>
                    <SearchBar size="hero" />
                </div>
                <div className={styles.tags}>
                    <span className={styles.tagsLabel}>Часто ищут:</span>
                    {QUICK_SEARCHES.map((item) => (
                        <Link
                            key={item.query}
                            href={`/search?q=${encodeURIComponent(item.query)}`}
                            className={styles.tag}
                        >
                            {item.label}
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
