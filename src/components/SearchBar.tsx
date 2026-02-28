'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from './SearchBar.module.css';
import { trackEvent } from '@/lib/analytics';
import { toAppUrl } from '@/lib/urls';

interface SuggestItem {
    type: 'category' | 'product' | 'query';
    label: string;
    value: string;
    meta?: string;
}

const PLACEHOLDERS = [
    'Например: 10 кубов бетона М300 в Абайский район',
    '20 тонн арматуры 12мм А500С с сертификатом',
    'Газоблок 625х250х200 около 40 кубов с доставкой',
    'Щебень фракция 5-20 самосвал 25 тонн сегодня',
    'Нужен экскаватор-погрузчик на 3 смены в Каратау',
];

const DEBOUNCE_MS = 300;

interface SearchBarProps {
    size?: 'normal' | 'hero';
    initialQuery?: string;
}

export default function SearchBar({ size = 'normal', initialQuery = '' }: SearchBarProps) {
    const [query, setQuery] = useState(initialQuery);
    const [placeholderIdx, setPlaceholderIdx] = useState(0);
    const [isTyping, setIsTyping] = useState(false);
    const [suggestions, setSuggestions] = useState<SuggestItem[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Animated placeholder
    useEffect(() => {
        if (query || isTyping) return;
        const interval = setInterval(() => {
            setPlaceholderIdx(prev => (prev + 1) % PLACEHOLDERS.length);
        }, 3000);
        return () => clearInterval(interval);
    }, [query, isTyping]);

    // Fetch suggestions with debounce
    const fetchSuggestions = useCallback(async (q: string) => {
        if (q.trim().length < 2) {
            setSuggestions([]);
            setShowDropdown(false);
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`/api/suggest?q=${encodeURIComponent(q.trim())}`);
            if (res.ok) {
                const data = await res.json();
                setSuggestions(data.suggestions || []);
                setShowDropdown(true);
                setActiveIndex(-1);
            }
        } catch {
            // silently ignore
        } finally {
            setLoading(false);
        }
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => fetchSuggestions(val), DEBOUNCE_MS);
    };

    const navigateToSearch = (q: string, categoryId?: string) => {
        const params = new URLSearchParams();
        if (categoryId) {
            params.set('category', categoryId);
        }
        if (q.trim()) {
            params.set('q', q.trim());
        }
        const relativeTarget = `/search?${params.toString()}`;
        const absoluteTarget = toAppUrl(relativeTarget);
        setShowDropdown(false);
        setSuggestions([]);
        trackEvent('search_submitted', {
            query_length: q.trim().length,
            source: size === 'hero' ? 'hero_search' : 'search_page',
        });
        if (typeof window !== 'undefined' && absoluteTarget.startsWith(window.location.origin)) {
            router.push(relativeTarget);
            return;
        }
        if (typeof window !== 'undefined') {
            window.location.assign(absoluteTarget);
        }
    };

    const handleSuggestionClick = (item: SuggestItem) => {
        trackEvent('suggestion_clicked', { type: item.type, value: item.value });
        if (item.type === 'category') {
            navigateToSearch('', item.value);
        } else if (item.type === 'product') {
            setQuery(item.label);
            navigateToSearch(item.label);
        } else {
            navigateToSearch(item.value);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < suggestions.length) {
            handleSuggestionClick(suggestions[activeIndex]);
            return;
        }
        const trimmed = query.trim();
        if (trimmed) {
            navigateToSearch(trimmed);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!showDropdown || suggestions.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(prev => (prev + 1) % suggestions.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(prev => (prev <= 0 ? suggestions.length - 1 : prev - 1));
        } else if (e.key === 'Escape') {
            setShowDropdown(false);
            setActiveIndex(-1);
        }
    };

    const handleFocus = () => {
        setIsTyping(true);
        if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
        if (suggestions.length > 0) setShowDropdown(true);
    };

    const handleBlur = () => {
        setIsTyping(false);
        // Delay to allow click events on dropdown
        blurTimeoutRef.current = setTimeout(() => {
            setShowDropdown(false);
        }, 200);
    };

    // Cleanup debounce on unmount
    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
        };
    }, []);

    const typeIcon = (type: SuggestItem['type']) => {
        switch (type) {
            case 'category': return '📂';
            case 'product': return '📦';
            case 'query': return '🔍';
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
                    onChange={handleInputChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    placeholder={PLACEHOLDERS[placeholderIdx]}
                    autoComplete="off"
                    role="combobox"
                    aria-expanded={showDropdown}
                    aria-controls="search-suggestions-listbox"
                    aria-haspopup="listbox"
                    aria-autocomplete="list"
                />
                {loading && (
                    <span className={styles.spinner} />
                )}
                {query && !loading && (
                    <button
                        type="button"
                        className={styles.clearBtn}
                        onClick={() => { setQuery(''); setSuggestions([]); setShowDropdown(false); inputRef.current?.focus(); }}
                    >
                        ✕
                    </button>
                )}

                {showDropdown && suggestions.length > 0 && (
                    <div className={styles.dropdown} ref={dropdownRef} role="listbox" id="search-suggestions-listbox">
                        {suggestions.map((item, i) => (
                            <button
                                key={`${item.type}-${item.value}-${i}`}
                                type="button"
                                className={`${styles.dropdownItem} ${i === activeIndex ? styles.dropdownItemActive : ''}`}
                                role="option"
                                aria-selected={i === activeIndex}
                                onMouseDown={(e) => { e.preventDefault(); handleSuggestionClick(item); }}
                                onMouseEnter={() => setActiveIndex(i)}
                            >
                                <span className={styles.dropdownIcon}>{typeIcon(item.type)}</span>
                                <span className={styles.dropdownLabel}>{item.label}</span>
                                {item.meta && <span className={styles.dropdownMeta}>{item.meta}</span>}
                            </button>
                        ))}
                    </div>
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

