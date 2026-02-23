'use client';

import { useState } from 'react';
import { getAnalyticsConsent, setAnalyticsConsent } from '@/lib/analytics';
import styles from './CookieConsentBanner.module.css';

export default function CookieConsentBanner() {
    const [visible, setVisible] = useState(() => getAnalyticsConsent() === 'unknown');

    if (!visible) return null;

    return (
        <div className={styles.banner} role="dialog" aria-live="polite" aria-label="Cookie consent">
            <div className={styles.content}>
                <p>
                    Мы используем cookie и аналитику (Google Tag Manager и Яндекс.Метрика), чтобы улучшать поиск, заявки и удобство платформы.
                </p>
                <div className={styles.actions}>
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                            setAnalyticsConsent('granted');
                            setVisible(false);
                        }}
                    >
                        Принять
                    </button>
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                            setAnalyticsConsent('denied');
                            setVisible(false);
                        }}
                    >
                        Отклонить
                    </button>
                </div>
            </div>
        </div>
    );
}

