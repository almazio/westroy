'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Product, Offer } from '@/lib/types';
import styles from './product.module.css';

interface Props {
    product: Product;
    offers: (Offer & { company?: any })[];
}

export default function ProductClient({ product, offers }: Props) {
    const [selectedTab, setSelectedTab] = useState<'offers' | 'specs' | 'docs'>('offers');
    const [requestQuantity, setRequestQuantity] = useState<number>(1);
    const [requestedUnit, setRequestedUnit] = useState<string>(product.unit || 'м');

    // UI state
    const [activeImage, setActiveImage] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [isFavorite, setIsFavorite] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);
    const bestOffer = offers[0];
    const isPriceOnRequest = !bestOffer || bestOffer.price <= 0;

    // Compile Images
    const allImages = useMemo(() => {
        const primary = product.imageUrl || '/images/catalog/materials.jpg';
        const additional = product.additionalImages || [];
        return [primary, ...additional];
    }, [product]);

    // Format plural strings (e.g. 1 поставщику, 2 поставщикам)
    const formatSuppliersCount = (count: number) => {
        const pr = new Intl.PluralRules('ru-RU');
        const rule = pr.select(count);
        if (rule === 'one') return `${count} поставщику`;
        if (rule === 'few') return `${count} поставщикам`;
        return `${count} поставщикам`;
    };

    const specs = useMemo(() => {
        if (!product.technicalSpecs) return [];
        return Object.entries(product.technicalSpecs as Record<string, any>).map(([key, value]) => ({
            key,
            label: key.charAt(0).toUpperCase() + key.slice(1),
            value: String(value)
        }));
    }, [product.technicalSpecs]);

    const handleScroll = () => {
        if (!scrollRef.current) return;
        const scrollLeft = scrollRef.current.scrollLeft;
        const width = scrollRef.current.clientWidth;
        const newIndex = Math.round(scrollLeft / width);
        setActiveImage(newIndex);
    };

    const handleQtyChange = (delta: number) => {
        setRequestQuantity(prev => {
            const next = prev + delta;
            return next < 1 ? 1 : next;
        });
    };

    const handleSubmit = () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        // Simulate API call
        setTimeout(() => {
            setIsSubmitting(false);
            setToastMessage('Заявка успешно отправлена!');
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        }, 1200);
    };

    const handleShare = () => {
        if (typeof window !== 'undefined') {
            navigator.clipboard.writeText(window.location.href);
            setToastMessage('Ссылка скопирована в буфер обмена');
            setShowToast(true);
            setTimeout(() => setShowToast(false), 2000);
        }
    };

    const toggleFavorite = () => {
        setIsFavorite(!isFavorite);
    };

    return (
        <div className={styles.productContent}>

            {/* Desktop 2-column Grid */}
            <div className={styles.desktopGrid}>

                {/* Left Column: Image Gallery & Info */}
                <div className={styles.mainContent}>

                    {/* Breadcrumbs (Mobile & Desktop) */}
                    <div className={styles.breadcrumb}>
                        <Link href="/catalog">Каталог</Link> &gt;
                        {product.category && (
                            <Link href={`/catalog?category=${product.category.id}`}>{product.category.nameRu}</Link>
                        )}
                    </div>

                    {/* Image Gallery (Native Scroll Snap) */}
                    <div className={styles.gallerySection}>
                        <div
                            className={styles.galleryScroll}
                            ref={scrollRef}
                            onScroll={handleScroll}
                        >
                            {allImages.map((img, idx) => (
                                <div key={idx} className={styles.galleryItem}>
                                    <img src={img} alt={`${product.name} - Фото ${idx + 1}`} className={styles.galleryImage} />
                                </div>
                            ))}
                        </div>

                        {/* Dots indicator for mobile */}
                        {allImages.length > 1 && (
                            <div className={styles.galleryDots}>
                                {allImages.map((_, idx) => (
                                    <div key={idx} className={`${styles.dot} ${idx === activeImage ? styles.dotActive : ''}`} />
                                ))}
                            </div>
                        )}

                        {/* Micro-actions Overlay */}
                        <div className={styles.actionButtons}>
                            <button className={styles.iconBtn} onClick={handleShare} aria-label="Поделиться">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>
                            </button>
                            <button
                                className={`${styles.iconBtn} ${isFavorite ? styles.favoriteActive : ''}`}
                                onClick={toggleFavorite}
                                aria-label="В избранное"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                            </button>
                        </div>
                    </div>

                    {/* Product Info */}
                    <div className={styles.productInfo}>
                        <div className={styles.badges}>
                            {product.brand && <span className={`${styles.badge} ${styles.badgeBrand}`}>{product.brand}</span>}
                            {product.article && (
                                <span
                                    className={`${styles.badge} ${styles.badgeArticle}`}
                                    onClick={() => navigator.clipboard.writeText(product.article!)}
                                    title="Скопировать артикул"
                                >
                                    Арт: {product.article}
                                </span>
                            )}
                            <span className={`${styles.badge} ${styles.badgeStock}`}>
                                ✓ В наличии
                            </span>
                        </div>

                        <h1 className={styles.title}>{product.name}</h1>
                    </div>

                    {/* Tabs area for Desktop */}
                    <div className={styles.tabsWrap}>
                        <div className={styles.tabList}>
                            <button
                                className={`${styles.tabBtn} ${selectedTab === 'offers' ? styles.tabActive : ''}`}
                                onClick={() => setSelectedTab('offers')}
                            >
                                Предложения ({offers.length})
                            </button>
                            <button
                                className={`${styles.tabBtn} ${selectedTab === 'specs' ? styles.tabActive : ''}`}
                                onClick={() => setSelectedTab('specs')}
                            >
                                Характеристики
                            </button>
                            {/* Hide Documents if none exist, but for now we keep the tab conditionally */}
                            <button
                                className={`${styles.tabBtn} ${selectedTab === 'docs' ? styles.tabActive : ''}`}
                                onClick={() => setSelectedTab('docs')}
                            >
                                Документы
                            </button>
                        </div>

                        <div className={styles.tabContent}>
                            {selectedTab === 'offers' && (
                                <div className={styles.offersGrid}>
                                    {offers.length > 0 ? offers.map((offer) => (
                                        <div key={offer.id} className={styles.offerCard}>
                                            <div className={styles.offerCompany}>
                                                <div className={styles.companyName}>{offer.company?.name || 'WESTROY Партнер'}</div>
                                                <div className={styles.verifiedBadge}>✓ Проверен</div>
                                            </div>

                                            <div className={styles.offerDetails}>
                                                <div className={styles.tablePrice}>
                                                    {offer.price.toLocaleString()} ₸ <span className={styles.unit}> / {offer.priceUnit}</span>
                                                </div>
                                                <div className={styles.location}>
                                                    📍 {offer.company?.address || 'Шымкент'}
                                                </div>
                                            </div>

                                            <div className={styles.offerAction}>
                                                <button className="btn btn-outline btn-sm">В заявку</button>
                                            </div>
                                        </div>
                                    )) : (
                                        <p className={styles.emptyMsg}>Нет активных предложений от поставщиков.</p>
                                    )}
                                </div>
                            )}

                            {selectedTab === 'specs' && (
                                <div className={styles.specsList}>
                                    {specs.length > 0 ? (
                                        specs.map((s) => (
                                            <div key={s.key} className={styles.specItem}>
                                                <span className={styles.specLabel}>{s.label}</span>
                                                <span className={styles.specValue}>{s.value}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className={styles.emptyMsg}>Характеристики не указана для данного товара.</p>
                                    )}
                                </div>
                            )}

                            {selectedTab === 'docs' && (
                                <p className={styles.emptyMsg}>Нет прикрепленных документов и ГОСТов.</p>
                            )}
                        </div>
                    </div>

                </div>

                {/* Right Column: Sticky Buy Box */}
                <div className={styles.buyBoxColumn}>
                    <div className={styles.buyBox}>
                        <div className={styles.priceHeader}>
                            {isPriceOnRequest ? (
                                <div className={styles.priceValue}>По запросу</div>
                            ) : (
                                <>
                                    <div className={styles.priceLabel}>Оптовая цена от</div>
                                    <div className={styles.priceValue}>
                                        {bestOffer.price.toLocaleString()} ₸
                                        <span className={styles.unit}> / {bestOffer.priceUnit || product.unit}</span>
                                    </div>
                                    <div className={styles.offersLink} onClick={() => {
                                        setSelectedTab('offers');
                                        window.scrollTo({ top: 500, behavior: 'smooth' });
                                    }}>
                                        Доступно у {offers.length} поставщиков
                                    </div>
                                </>
                            )}
                        </div>

                        <div className={styles.controlsGroup}>
                            <div className={styles.stepper}>
                                <button className={styles.stepperBtn} onClick={() => handleQtyChange(-1)}> - </button>
                                <input
                                    type="number"
                                    value={requestQuantity}
                                    onChange={(e) => setRequestQuantity(parseInt(e.target.value) || 1)}
                                    className={styles.stepperInput}
                                    min={1}
                                />
                                <button className={styles.stepperBtn} onClick={() => handleQtyChange(1)}> + </button>
                            </div>
                            <select
                                value={requestedUnit}
                                onChange={(e) => setRequestedUnit(e.target.value)}
                                className={styles.unitSelect}
                            >
                                <option value="м">м</option>
                                <option value="тн">тн</option>
                                <option value="шт">шт</option>
                                <option value="м3">м3</option>
                            </select>
                        </div>

                        <button
                            className={`btn btn-primary btn-lg w-full ${styles.submitBtn}`}
                            onClick={handleSubmit}
                            disabled={isSubmitting || showToast}
                        >
                            {isSubmitting ? (
                                <span className={styles.loader}>Отправка...</span>
                            ) : showToast && toastMessage.includes('Заявка') ? (
                                <span>✓ Заявка отправлена</span>
                            ) : (
                                <span>Запросить КП на объем</span>
                            )}
                        </button>

                        <p className={styles.formHint}>
                            Мы разошлем ваш персональный запрос сразу {formatSuppliersCount(offers.length || 1)} в вашем регионе.
                        </p>
                    </div>
                </div>
            </div>

            {/* Global Toast for Share/Sumbit feedback */}
            {showToast && (
                <div className={styles.globalToast}>
                    {toastMessage}
                </div>
            )}
        </div>
    );
}
