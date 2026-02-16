import Link from 'next/link';
import styles from './Footer.module.css';

export default function Footer() {
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
                    <p className={styles.tagline}>AI-поиск строительных решений в Шымкенте</p>
                </div>

                <div className={styles.links}>
                    <div className={styles.col}>
                        <h4>Категории</h4>
                        <a href="/search?category=concrete">Бетон</a>
                        <a href="/search?category=aggregates">Инертные</a>
                        <a href="/search?category=blocks">Кирпич и блоки</a>
                        <a href="/search?category=rebar">Арматура</a>
                        <a href="/search?category=machinery">Спецтехника</a>
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
                        <p>📧 info@westroy.kz</p>
                        <p>📞 +7 (725) 000-00-00</p>
                    </div>
                </div>

                <div className={styles.bottom}>
                    <p>© 2024 WESTROY. Все права защищены.</p>
                    <p className={styles.disclaimer}>Demo-версия. Данные носят ориентировочный характер.</p>
                </div>
            </div>
        </footer>
    );
}
