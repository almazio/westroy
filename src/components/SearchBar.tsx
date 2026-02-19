'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from './SearchBar.module.css';
import { trackEvent } from '@/lib/analytics';

const PLACEHOLDERS = [
    'Например: нужно 10 кубов бетона М300 с доставкой в Абай районе',
    'Песок речной 30 тонн...',
    'Газоблок 600×200×300...',
    'Арматура 12 мм 5 тонн...',
    'Экскаватор на 3 дня...',
];

interface SearchBarProps {
    size?: 'normal' | 'hero';
    initialQuery?: string;
}

export default function SearchBar({ size = 'normal', initialQuery = '' }: SearchBarProps) {
    const [query, setQuery] = useState(initialQuery);
    const [placeholderIdx, setPlaceholderIdx] = useState(0);
    const [isTyping, setIsTyping] = useState(false);
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);

    // Animated placeholder
    useEffect(() => {
        if (query || isTyping) return;
        const interval = setInterval(() => {
            setPlaceholderIdx(prev => (prev + 1) % PLACEHOLDERS.length);
        }, 3000);
        return () => clearInterval(interval);
    }, [query, isTyping]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            trackEvent('search_submitted', {
                query_length: query.trim().length,
                source: size === 'hero' ? 'hero_search' : 'search_page',
            });
            router.push(`/search?q=${encodeURIComponent(query.trim())}`);
        }
    };

    return (
        <form
            className={`${styles.searchBar} ${size === 'hero' ? styles.hero : ''}`}
            onSubmit={handleSubmit}
        >
            <div className={styles.inputWrapper}>
                <svg className={styles.searchIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                </svg>
                <input
                    ref={inputRef}
                    type="text"
                    className={styles.input}
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onFocus={() => setIsTyping(true)}
                    onBlur={() => setIsTyping(false)}
                    placeholder={PLACEHOLDERS[placeholderIdx]}
                />
                {query && (
                    <button
                        type="button"
                        className={styles.clearBtn}
                        onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                    >
                        ✕
                    </button>
                )}
            </div>
            <button type="submit" className={styles.submitBtn}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                </svg>
                Найти
            </button>
        </form>
    );
}
