import Link from 'next/link';
import styles from './Footer.module.css';

export default function Footer() {
    const year = new Date().getFullYear();

    return (
        <footer className={styles.footer}>
            <div className={styles.inner}>
                <div className={styles.brand}>
                    <div className={styles.logo}>
                        <span className={styles.logoText}>
                            <span className={styles.logoWe}>WE</span>
                            <span className={styles.logoColon}>:</span>
                            <span className={styles.logoTail}>STROY</span>
                        </span>
                    </div>
                    <p className={styles.tagline}>Маркетплейс строительных решений в Шымкенте</p>
                </div>

                <div className={styles.links}>
                    <div className={styles.col}>
                        <h4>Категории</h4>
                        <a href="/search?category=concrete">Бетон</a>
                        <a href="/search?category=sand">Песок</a>
                        <a href="/search?category=stone">Щебень</a>
                        <a href="/search?category=brick">Кирпич</a>
                        <a href="/search?category=cement">Цемент</a>
                    </div>
                    <div className={styles.col}>
                        <h4>Платформа</h4>
                        <Link href="/">Поиск</Link>
                        <a href="/dashboard/client">Кабинет клиента</a>
                        <a href="/dashboard/producer">Кабинет производителя</a>
                    </div>
                    <div className={styles.col}>
                        <h4>Контакты</h4>
                        <p>📍 г. Шымкент, Казахстан</p>
                        <p>Подключение поставщиков: через форму на странице</p>
                        <Link href="/partners">westroy.vercel.app/partners</Link>
                    </div>
                </div>

                <div className={styles.bottom}>
                    <p>© {year} WESTROY. Все права защищены.</p>
                </div>
            </div>
        </footer>
    );
}
