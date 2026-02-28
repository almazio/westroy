'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Product, Offer } from '@/lib/types';
import styles from './product.module.css';

interface Props {
    product: Product;
    offers: (Offer & { company?: any })[];
}

export default function ProductClient({ product, offers }: Props) {
    const [selectedTab, setSelectedTab] = useState<'offers' | 'specs' | 'docs'>('offers');
    const [requestQuantity, setRequestQuantity] = useState<string>('');
    const [requestedUnit, setRequestedUnit] = useState<string>(product.unit || 'м');

    const bestOffer = offers[0];
    const isPriceOnRequest = !bestOffer || bestOffer.price <= 0;

    const specs = useMemo(() => {
        if (!product.technicalSpecs) return [];
        return Object.entries(product.technicalSpecs as Record<string, any>).map(([key, value]) => ({
            key,
            label: key.charAt(0).toUpperCase() + key.slice(1),
            value: String(value)
        }));
    }, [product.technicalSpecs]);

    return (
        <div className={styles.productContent}>
            <div className={styles.productHeader}>
                <div className={styles.productGallery}>
                    <img
                        src={product.imageUrl || '/images/catalog/materials.jpg'}
                        alt={product.name}
                        className={styles.mainImage}
                    />
                </div>
                <div className={styles.productInfo}>
                    <div className={styles.breadcrumb}>
                        <Link href="/search">Каталог</Link> &gt; {product.name}
                    </div>
                    <h1 className={styles.title}>{product.name}</h1>
                    <div className={styles.meta}>
                        {product.article && <span className={styles.article}>Артикул: {product.article}</span>}
                        {product.brand && <span className={styles.brand}>Бренд: {product.brand}</span>}
                    </div>

                    <div className={styles.priceBlock}>
                        {isPriceOnRequest ? (
                            <div className={styles.priceValue}>По запросу</div>
                        ) : (
                            <div className={styles.priceWrapper}>
                                <div className={styles.priceLabel}>Цены от</div>
                                <div className={styles.priceValue}>
                                    {bestOffer.price.toLocaleString()} ₸
                                    <span className={styles.unit}> / {bestOffer.priceUnit || product.unit}</span>
                                </div>
                            </div>
                        )}
                        <div className={styles.offersCount}>
                            {offers.length} {offers.length === 1 ? 'предложение' : offers.length < 5 ? 'предложения' : 'предложений'} от поставщиков
                        </div>
                    </div>

                    <div className={styles.quickForm}>
                        <div className={styles.inputGroup}>
                            <input
                                type="number"
                                placeholder="Количество"
                                value={requestQuantity}
                                onChange={(e) => setRequestQuantity(e.target.value)}
                                className={styles.qtyInput}
                            />
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
                        <button className="btn btn-primary btn-lg w-full">Запросить КП на объем</button>
                        <p className={styles.formHint}>Мы разошлем ваш запрос всем {offers.length} поставщикам в этом регионе</p>
                    </div>
                </div>
            </div>

            <div className={styles.productTabs}>
                <button
                    className={`${styles.tabBtn} ${selectedTab === 'offers' ? styles.tabActive : ''}`}
                    onClick={() => setSelectedTab('offers')}
                >
                    Цены поставщиков ({offers.length})
                </button>
                <button
                    className={`${styles.tabBtn} ${selectedTab === 'specs' ? styles.tabActive : ''}`}
                    onClick={() => setSelectedTab('specs')}
                >
                    Характеристики
                </button>
                <button
                    className={`${styles.tabBtn} ${selectedTab === 'docs' ? styles.tabActive : ''}`}
                    onClick={() => setSelectedTab('docs')}
                >
                    Документация и ГОСТы
                </button>
            </div>

            <div className={styles.tabContent}>
                {selectedTab === 'offers' && (
                    <div className={styles.merchantTableWrap}>
                        <table className={styles.merchantTable}>
                            <thead>
                                <tr>
                                    <th>Поставщик</th>
                                    <th>Цена</th>
                                    <th>Наличие</th>
                                    <th>Город / Доставка</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {offers.map((offer) => (
                                    <tr key={offer.id}>
                                        <td>
                                            <div className={styles.companyLink}>
                                                <div className={styles.companyName}>{offer.company?.name || 'Поставщик'}</div>
                                                <div className={styles.verifiedBadge}>Проверен</div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className={styles.tablePrice}>
                                                {offer.price.toLocaleString()} ₸
                                                <span className={styles.unit}> / {offer.priceUnit}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={styles.stockBadge}>
                                                {offer.stockStatus === 'IN_STOCK' ? 'В наличии' : 'Под заказ'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className={styles.location}>
                                                {offer.company?.address || 'Шымкент'}
                                                {offer.leadTime && <div className={styles.deliveryTime}>{offer.leadTime}</div>}
                                            </div>
                                        </td>
                                        <td>
                                            <button className="btn btn-primary btn-sm">В заявку</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {selectedTab === 'specs' && (
                    <div className={styles.specsList}>
                        {specs.length > 0 ? (
                            specs.map((s) => (
                                <div key={s.key} className={styles.specItem}>
                                    <span className={styles.specLabel}>{s.label}:</span>
                                    <span className={styles.specValue}>{s.value}</span>
                                </div>
                            ))
                        ) : (
                            <p className={styles.emptyMsg}>Характеристики не указаны</p>
                        )}
                    </div>
                )}

                {selectedTab === 'docs' && (
                    <div className={styles.docsList}>
                        <div className={styles.docItem}>
                            <span className={styles.docIcon}>📄</span>
                            <div className={styles.docInfo}>
                                <div className={styles.docName}>Сертификат соответствия ГОСТ (PDF)</div>
                                <div className={styles.docMeta}>2.4 Mb • Обновлен 12.01.2024</div>
                            </div>
                            <button className="btn btn-ghost btn-sm">Скачать</button>
                        </div>
                        <div className={styles.docItem}>
                            <span className={styles.docIcon}>📄</span>
                            <div className={styles.docInfo}>
                                <div className={styles.docName}>Технический паспорт изделия</div>
                                <div className={styles.docMeta}>1.1 Mb • Обновлен 20.11.2023</div>
                            </div>
                            <button className="btn btn-ghost btn-sm">Скачать</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
