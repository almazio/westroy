'use client';

import { useState } from 'react';
import styles from './page.module.css';
import Link from 'next/link';

export default function AiEstimatorPage() {
    return (
        <main className={styles.page}>
            <div className="container">
                <header className={styles.header}>
                    <h1 className={styles.title}>AI-Смета</h1>
                    <p className={styles.subtitle}>Рассчитаем стоимость материалов по вашему списку</p>
                </header>

                <div className={styles.cardBox}>
                    <div className={styles.cameraAction}>
                        <div className={styles.iconCircle}>
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                                <circle cx="12" cy="13" r="4"></circle>
                            </svg>
                        </div>
                        <h2>Сфотографировать смету</h2>
                        <p>Я распознаю рукописный текст или PDF и сформирую список товаров</p>
                        <button className="btn btn-primary btn-lg" style={{ marginTop: '20px', opacity: 0.5 }} disabled>
                            Скоро
                        </button>
                    </div>

                    <div className={styles.divider}>или</div>

                    <div className={styles.textAction}>
                        <textarea
                            className={styles.textarea}
                            placeholder="Напишите список материалов вручную, например: 10 тонн арматуры 12мм и 5 кубов бетона М300..."
                        />
                        <button className="btn btn-secondary" style={{ marginTop: '16px', width: '100%', opacity: 0.5 }} disabled>
                            Скоро
                        </button>
                    </div>
                </div>

                <div className={styles.features}>
                    <div className={styles.featureItem}>
                        <span>🤖</span>
                        <h4>Умное распознавание</h4>
                        <p>Понимаю жаргон строителей и сокращения</p>
                    </div>
                    <div className={styles.featureItem}>
                        <span>⚡</span>
                        <h4>Мгновенный расчет</h4>
                        <p>Сравниваю цены у 50+ поставщиков сразу</p>
                    </div>
                </div>
            </div>
        </main>
    );
}
