'use client';

import Link from 'next/link';
import styles from './page.module.css';

export default function OfflinePage() {
    return (
        <div className={`page ${styles.wrapper}`}>
            <div className={`container ${styles.container}`}>
                <div className={styles.card}>
                    <div className={styles.icon}>📡</div>
                    <h1>Нет подключения к интернету</h1>
                    <p className="text-secondary">
                        Проверьте сеть и попробуйте снова. WESTROY сохранит ваш прогресс после восстановления соединения.
                    </p>
                    <div className={styles.actions}>
                        <button className="btn btn-primary" onClick={() => window.location.reload()}>
                            Обновить страницу
                        </button>
                        <Link href="/" className="btn btn-secondary">
                            На главную
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
