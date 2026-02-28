'use client';

import { useState, useEffect } from 'react';
import { getAnalyticsConsent, setAnalyticsConsent } from '@/lib/analytics';
import styles from './CookieConsentBanner.module.css';

export default function CookieConsentBanner() {
    const [mounted, setMounted] = useState(false);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (getAnalyticsConsent() === 'unknown') {
            setVisible(true);
        }
    }, []);

    if (!mounted || !visible) return null;

    return (
        <div className={styles.banner} role="dialog" aria-live="polite" aria-label="Cookie consent">
            <div className={styles.content}>
                <p>
                    Мы используем cookie для улучшения работы платформы, персонализации и аналитики.
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

