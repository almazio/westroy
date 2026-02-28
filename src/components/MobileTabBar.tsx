'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './MobileTabBar.module.css';

export default function MobileTabBar() {
    const pathname = usePathname();

    const tabs = [
        {
            name: 'Каталог',
            href: '/#categories',
            icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
            ),
        },
        {
            name: 'Поиск',
            href: '/search',
            icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
            ),
        },
        {
            name: 'AI-Смета',
            href: '/ai-estimator',
            icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                    <circle cx="12" cy="13" r="4"></circle>
                </svg>
            ),
            isPrimary: true,
        },
        {
            name: 'Заявки',
            href: '/dashboard/client',
            icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
            ),
        },
    ];

    return (
        <nav className={styles.tabBar}>
            {tabs.map((tab) => {
                const isActive = pathname === tab.href || (tab.href !== '/' && pathname.startsWith(tab.href));
                return (
                    <Link
                        key={tab.name}
                        href={tab.href}
                        className={`${styles.tabItem} ${isActive ? styles.active : ''} ${tab.isPrimary ? styles.primary : ''}`}
                    >
                        <div className={styles.iconWrapper}>
                            {tab.icon}
                        </div>
                        <span className={styles.tabLabel}>{tab.name}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
