
import SearchBar from '@/components/SearchBar';
import styles from './Hero.module.css';

export default function Hero() {
    return (
        <section className={styles.hero}>
            <div className={styles.overlay}></div>
            <div className={styles.content}>
                <div className={styles.badge}>
                    <span className={styles.badgeDot}></span>
                    Маркетплейс строительных решений №1
                </div>
                <h1 className={styles.title}>
                    Все для стройки <br />
                    <span className={styles.highlight}>в одном месте</span>
                </h1>
                <p className={styles.subtitle}>
                    Мгновенный поиск бетона, арматуры, инертных материалов и спецтехники.
                    Прямые цены от производителей.
                </p>

                <div className={styles.searchWrapper}>
                    <SearchBar size="hero" />
                </div>

                <div className={styles.tags}>
                    <span>Часто ищут:</span>
                    <button className={styles.tag}>Бетон М300</button>
                    <button className={styles.tag}>Песок мытый</button>
                    <button className={styles.tag}>Арматура 12мм</button>
                    <button className={styles.tag}>Газоблок 600x300</button>
                </div>
            </div>
        </section>
    );
}
