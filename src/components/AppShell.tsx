'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import styles from './AppShell.module.css';

interface NavItem {
    href: string;
    label: string;
    icon: string;
    badge?: number;
}

const NAV_ITEMS: Record<string, NavItem[]> = {
    client: [
        { href: '/search', label: 'Поиск', icon: '🔍' },
        { href: '/dashboard/client', label: 'Мои заявки', icon: '📋' },
        { href: '/dashboard/orders', label: 'Мои заказы', icon: '📦' },
    ],
    producer: [
        { href: '/dashboard/producer', label: 'Входящие заявки', icon: '📨' },
        { href: '/dashboard/orders', label: 'Заказы', icon: '📦' },
    ],
    admin: [
        { href: '/admin', label: 'Панель', icon: '🎛️' },
        { href: '/admin/analytics', label: 'Аналитика', icon: '📊' },
        { href: '/search', label: 'Поиск', icon: '🔍' },
    ],
};

const ROLE_LABELS: Record<string, string> = {
    client: 'Клиент',
    producer: 'Поставщик',
    admin: 'Админ',
};

export default function AppShell({ children }: { children: React.ReactNode }) {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const navItems = user ? (NAV_ITEMS[user.role] || NAV_ITEMS.client) : NAV_ITEMS.client;
    const initials = user?.name ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?';

    const isActive = (href: string) =>
        pathname === href || (href !== '/' && pathname.startsWith(href + '/'));

    return (
        <div className={styles.shell}>
            {/* Mobile topbar */}
            <div className={styles.topbar}>
                <button className={styles.menuBtn} onClick={() => setSidebarOpen(true)} aria-label="Меню">
                    ☰
                </button>
                <span className={styles.topbarTitle}>WESTROY</span>
                <button onClick={toggleTheme} className={styles.menuBtn} aria-label="Тема">
                    <span suppressHydrationWarning>{theme === 'dark' ? '☀️' : '🌙'}</span>
                </button>
            </div>

            {/* Sidebar */}
            <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
                <Link href="/" className={styles.logo}>
                    <span className={styles.logoWe}>WE</span>
                    <span className={styles.logoColon}>:</span>
                    <span>STROY</span>
                </Link>

                <div className={styles.navSection}>
                    <div className={styles.navLabel}>Навигация</div>
                    {navItems.map(item => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`${styles.navItem} ${isActive(item.href) ? styles.navItemActive : ''}`}
                            onClick={() => setSidebarOpen(false)}
                        >
                            <span className={styles.navIcon}>{item.icon}</span>
                            {item.label}
                            {item.badge && item.badge > 0 && (
                                <span className={styles.navBadge}>{item.badge}</span>
                            )}
                        </Link>
                    ))}

                    <div className={styles.navLabel} style={{ marginTop: 24 }}>Настройки</div>
                    <button
                        className={styles.navItem}
                        onClick={toggleTheme}
                    >
                        <span className={styles.navIcon} suppressHydrationWarning>{theme === 'dark' ? '☀️' : '🌙'}</span>
                        <span suppressHydrationWarning>{theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}</span>
                    </button>
                    <Link href="/" className={styles.navItem} onClick={() => setSidebarOpen(false)}>
                        <span className={styles.navIcon}>🏠</span>
                        Главная (лендинг)
                    </Link>
                </div>

                {/* User card */}
                {user && (
                    <div className={styles.userCard}>
                        <div className={styles.userAvatar}>{initials}</div>
                        <div className={styles.userMeta}>
                            <div className={styles.userName}>{user.name}</div>
                            <div className={styles.userRole}>{ROLE_LABELS[user.role] || user.role}</div>
                        </div>
                        <button className={styles.logoutBtn} onClick={() => void logout()} title="Выйти">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                <polyline points="16 17 21 12 16 7" />
                                <line x1="21" y1="12" x2="9" y2="12" />
                            </svg>
                        </button>
                    </div>
                )}
            </aside>

            {/* Mobile overlay */}
            {sidebarOpen && (
                <button
                    className={`${styles.overlay} ${styles.overlayVisible}`}
                    onClick={() => setSidebarOpen(false)}
                    aria-label="Закрыть меню"
                />
            )}

            {/* Main content */}
            <div className={styles.content}>
                {children}
            </div>
        </div>
    );
}
