'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import styles from './Navbar.module.css';

export default function Navbar() {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = useState(false);
    const isHomePage = pathname === '/';

    const navLinks = {
        client: [
            { href: '/', label: 'Главная' },
            { href: '/dashboard/client', label: 'Мои заявки' },
        ],
        producer: [
            { href: '/', label: 'Главная' },
            { href: '/dashboard/producer', label: 'Кабинет' },
        ],
        admin: [
            { href: '/', label: 'Главная' },
            { href: '/admin', label: 'Админ-панель' },
        ],
    };

    const currentLinks = user
        ? navLinks[user.role]
        : (isHomePage ? [] : [{ href: '/', label: 'Главная' }]);

    const visibleLinks = currentLinks.filter((link) => {
        if (pathname === link.href) return false;
        if (link.href !== '/' && pathname.startsWith(`${link.href}/`)) return false;
        return true;
    });

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
                    {visibleLinks?.map(link => (
                        <Link key={link.href} href={link.href} className={styles.link} onClick={() => setMenuOpen(false)}>
                            {link.label}
                        </Link>
                    ))}
                </div>

                <div className={styles.right}>
                    <button
                        onClick={toggleTheme}
                        className={styles.themeBtn}
                        aria-label="Переключить тему"
                        title="Переключить тему"
                    >
                        <span suppressHydrationWarning>{theme === 'dark' ? '☀️' : '🌙'}</span>
                    </button>

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
                            <button onClick={() => logout()} className={styles.logoutBtn} title="Выйти">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                    <polyline points="16 17 21 12 16 7"></polyline>
                                    <line x1="21" y1="12" x2="9" y2="12"></line>
                                </svg>
                            </button>
                        </div>
                    ) : (
                        <div className={styles.authButtonsDesktop}>
                            <Link href="/login" className="btn btn-sm btn-ghost">Войти</Link>
                            {!isHomePage && (
                                <Link href="/register" className="btn btn-sm btn-primary">Регистрация клиента</Link>
                            )}
                        </div>
                    )}

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
                    <button className={styles.mobileClose} onClick={() => setMenuOpen(false)} aria-label="Закрыть меню">
                        ✕
                    </button>
                </div>

                <div className={styles.mobileLinks}>
                    {visibleLinks?.map(link => (
                        <Link key={link.href} href={link.href} className={styles.mobileLink} onClick={() => setMenuOpen(false)}>
                            {link.label}
                        </Link>
                    ))}
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
                        <button onClick={() => logout()} className="btn btn-ghost" style={{ width: '100%' }}>Выйти</button>
                    </div>
                ) : (
                    <div className={styles.mobileAuthRow}>
                        <Link href="/login" className="btn btn-secondary" onClick={() => setMenuOpen(false)}>Войти</Link>
                        {!isHomePage && (
                            <Link href="/register" className="btn btn-primary" onClick={() => setMenuOpen(false)}>Регистрация клиента</Link>
                        )}
                    </div>
                )}
            </div>
        </nav>
    );
}
