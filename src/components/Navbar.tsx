'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { toAppUrl } from '@/lib/urls';
import styles from './Navbar.module.css';

export default function Navbar() {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = useState(false);
    const isAppHost = typeof window !== 'undefined' && window.location.hostname === 'app.westroy.kz';

    const navLinks = {
        client: [
            ...(isAppHost ? [] : [{ href: '/', label: 'Главная' }]),
            { href: toAppUrl('/dashboard/client'), label: 'Мои заявки', external: true },
        ],
        producer: [
            ...(isAppHost ? [] : [{ href: '/', label: 'Главная' }]),
            { href: toAppUrl('/dashboard/producer'), label: 'Кабинет', external: true },
        ],
        admin: [
            ...(isAppHost ? [] : [{ href: '/', label: 'Главная' }]),
            { href: toAppUrl('/admin'), label: 'Админ-панель', external: true },
            { href: toAppUrl('/admin/analytics'), label: 'Аналитика', external: true },
        ],
    };

    const guestLinks = [
        ...(isAppHost ? [] : [
            { href: '/', label: 'Главная' },
            { href: toAppUrl('/search'), label: 'Поиск', external: true },
            { href: '/partners', label: 'Партнерам' },
        ]),
    ];

    const currentLinks = user
        ? (navLinks[user.role] || guestLinks)
        : guestLinks;

    const visibleLinks = currentLinks.filter((link) => {
        if (link.external) return true;
        if (pathname === link.href) return false;
        if (link.href !== '/' && pathname.startsWith(`${link.href}/`)) return false;
        return true;
    });

    const fallbackLinks = visibleLinks.length > 0
        ? visibleLinks
        : currentLinks.filter((link) => link.external || link.href !== pathname);

    useEffect(() => {
        if (!menuOpen) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setMenuOpen(false);
        };

        const scrollY = window.scrollY;
        const original = {
            overflow: document.body.style.overflow,
            position: document.body.style.position,
            top: document.body.style.top,
            width: document.body.style.width,
        };

        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.width = '100%';

        window.addEventListener('keydown', onKeyDown);

        return () => {
            const top = document.body.style.top;
            document.body.style.overflow = original.overflow;
            document.body.style.position = original.position;
            document.body.style.top = original.top;
            document.body.style.width = original.width;
            window.removeEventListener('keydown', onKeyDown);
            const restoredY = Number.parseInt(top || '0', 10);
            if (!Number.isNaN(restoredY)) {
                window.scrollTo(0, Math.abs(restoredY));
            }
        };
    }, [menuOpen]);

    return (
        <nav className={styles.nav}>
            <div className={styles.inner}>
                <Link href="/" className={styles.logo}>
                    <span className={styles.logoText}>
                        <span className={styles.logoWe}>WE</span>
                        <span className={styles.logoColon}>:</span>
                        <span className={styles.logoTail}>STROY</span>
                    </span>
                </Link>

                <div className={styles.desktopLinks}>
                    {fallbackLinks.map(link => (
                        link.external ? (
                            <a key={link.href} href={link.href} className={styles.link} onClick={() => setMenuOpen(false)}>
                                {link.label}
                            </a>
                        ) : (
                            <Link key={link.href} href={link.href} className={styles.link} onClick={() => setMenuOpen(false)}>
                                {link.label}
                            </Link>
                        )
                    ))}
                </div>

                <div className={styles.right}>
                    {user ? (
                        <div className={styles.userWrapper}>
                            <div className={styles.userInfo}>
                                <span className={styles.userName}>{user.name}</span>
                                <span className={styles.userRole}>
                                    {user.role === 'client' && 'Клиент'}
                                    {user.role === 'producer' && 'Производитель'}
                                    {user.role === 'admin' && 'Админ'}
                                </span>
                            </div>
                            <button onClick={() => void logout()} className={styles.logoutBtn} title="Выйти">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                    <polyline points="16 17 21 12 16 7"></polyline>
                                    <line x1="21" y1="12" x2="9" y2="12"></line>
                                </svg>
                            </button>
                        </div>
                    ) : (
                        <div className={styles.authButtonsDesktop}>
                            <a href={toAppUrl('/login')} className="btn btn-sm btn-ghost">Войти</a>
                        </div>
                    )}

                    <button
                        onClick={toggleTheme}
                        className={styles.themeBtn}
                        aria-label="Переключить тему"
                        title="Переключить тему"
                    >
                        <span suppressHydrationWarning>{theme === 'dark' ? '☀️' : '🌙'}</span>
                    </button>

                    <button
                        className={`${styles.hamburger} ${menuOpen ? styles.hamburgerOpen : ''}`}
                        onClick={() => setMenuOpen(!menuOpen)}
                        aria-expanded={menuOpen}
                        aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'}
                    >
                        <span></span><span></span><span></span>
                    </button>
                </div>
            </div>

            {menuOpen && <button className={styles.overlay} onClick={() => setMenuOpen(false)} aria-label="Закрыть меню" />}

            <div className={`${styles.mobileDrawer} ${menuOpen ? styles.mobileDrawerOpen : ''}`}>
                <div className={styles.mobileHeader}>
                    <strong>Меню</strong>
                </div>

                <div className={styles.mobileLinks}>
                    {fallbackLinks.map(link => (
                        link.external ? (
                            <a key={link.href} href={link.href} className={styles.mobileLink} onClick={() => setMenuOpen(false)}>
                                {link.label}
                            </a>
                        ) : (
                            <Link key={link.href} href={link.href} className={styles.mobileLink} onClick={() => setMenuOpen(false)}>
                                {link.label}
                            </Link>
                        )
                    ))}
                </div>

                <div className={styles.mobileThemeRow}>
                    <span className={styles.mobileThemeLabel}>Тема</span>
                    <button
                        onClick={toggleTheme}
                        className={styles.mobileThemeBtn}
                        aria-label="Переключить тему"
                    >
                        <span suppressHydrationWarning>{theme === 'dark' ? 'Светлая' : 'Темная'}</span>
                    </button>
                </div>

                {user ? (
                    <div className={styles.mobileUserCard}>
                        <div>
                            <div className={styles.userName}>{user.name}</div>
                            <div className={styles.userRole}>
                                {user.role === 'client' && 'Клиент'}
                                {user.role === 'producer' && 'Производитель'}
                                {user.role === 'admin' && 'Админ'}
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                setMenuOpen(false);
                                void logout();
                            }}
                            className="btn btn-ghost"
                            style={{ width: '100%' }}
                        >
                            Выйти
                        </button>
                    </div>
                ) : (
                    <div className={styles.mobileAuthRow}>
                        <a href={toAppUrl('/login')} className="btn btn-secondary" onClick={() => setMenuOpen(false)}>Войти</a>
                    </div>
                )}
            </div>
        </nav>
    );
}
