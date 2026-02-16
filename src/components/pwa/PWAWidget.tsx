'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './PWAWidget.module.css';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export default function PWAWidget() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstalled, setIsInstalled] = useState(() => {
        if (typeof window === 'undefined') return false;
        return (
            window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as Navigator & { standalone?: boolean }).standalone === true
        );
    });
    const [isOnline, setIsOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        if (!('serviceWorker' in navigator)) return;

        if (process.env.NODE_ENV !== 'production') {
            navigator.serviceWorker.getRegistrations()
                .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
                .catch((error) => console.error('[PWA] SW cleanup failed:', error));
            return;
        }

        navigator.serviceWorker.register('/sw.js').catch((error) => {
            console.error('[PWA] SW registration failed:', error);
        });
    }, []);

    useEffect(() => {
        const onBeforeInstallPrompt = (event: Event) => {
            event.preventDefault();
            setDeferredPrompt(event as BeforeInstallPromptEvent);
        };

        const onInstalled = () => {
            setIsInstalled(true);
            setDeferredPrompt(null);
            setDismissed(true);
        };

        const onOnline = () => setIsOnline(true);
        const onOffline = () => setIsOnline(false);

        window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
        window.addEventListener('appinstalled', onInstalled);
        window.addEventListener('online', onOnline);
        window.addEventListener('offline', onOffline);

        return () => {
            window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
            window.removeEventListener('appinstalled', onInstalled);
            window.removeEventListener('online', onOnline);
            window.removeEventListener('offline', onOffline);
        };
    }, []);

    const canInstall = useMemo(() => Boolean(deferredPrompt) && !isInstalled && !dismissed, [deferredPrompt, dismissed, isInstalled]);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
            setIsInstalled(true);
            setDismissed(true);
        }
        setDeferredPrompt(null);
    };

    if (!canInstall && isOnline) return null;

    return (
        <aside className={styles.widget} aria-live="polite">
            {!isOnline ? (
                <>
                    <div className={styles.title}>Вы офлайн</div>
                    <p>Некоторые страницы работают в кэше. Для свежих данных восстановите интернет.</p>
                </>
            ) : (
                <>
                    <div className={styles.title}>Установить WESTROY</div>
                    <p>Добавьте приложение на главный экран для быстрого доступа к заявкам и предложениям.</p>
                    <div className={styles.actions}>
                        <button type="button" className="btn btn-primary btn-sm" onClick={handleInstall}>
                            Установить
                        </button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDismissed(true)}>
                            Позже
                        </button>
                    </div>
                </>
            )}
        </aside>
    );
}
