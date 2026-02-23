'use client';

import styles from './page.module.css';

interface SearchFiltersProps {
    filteredOffersCount: number;
    onlyDelivery: boolean;
    setOnlyDelivery: (v: boolean) => void;
    inStockOnly: boolean;
    setInStockOnly: (v: boolean) => void;
    withImageOnly: boolean;
    setWithImageOnly: (v: boolean) => void;
    withArticleOnly: boolean;
    setWithArticleOnly: (v: boolean) => void;
    brandFilter: string;
    setBrandFilter: (v: string) => void;
    sortBy: 'price_asc' | 'price_desc' | 'supplier';
    setSortBy: (v: 'price_asc' | 'price_desc' | 'supplier') => void;
    hasResults: boolean;
    requestSent: boolean;
    requestSubmitting: boolean;
    onQuickRequest: () => void;
    onDetailedRequest: () => void;
}

export default function SearchFilters({
    filteredOffersCount,
    onlyDelivery,
    setOnlyDelivery,
    inStockOnly,
    setInStockOnly,
    withImageOnly,
    setWithImageOnly,
    withArticleOnly,
    setWithArticleOnly,
    brandFilter,
    setBrandFilter,
    sortBy,
    setSortBy,
    hasResults,
    requestSent,
    requestSubmitting,
    onQuickRequest,
    onDetailedRequest,
}: SearchFiltersProps) {
    const getResultsTitle = () => {
        return `Найдено ${filteredOffersCount} предложени${filteredOffersCount === 1 ? 'е' : filteredOffersCount < 5 ? 'я' : 'й'}`;
    };

    return (
        <div className={styles.resultsHeader}>
            <h2>{getResultsTitle()}</h2>
            <div className={styles.resultsHeaderActions}>
                <label className={styles.filterToggle}>
                    <input
                        type="checkbox"
                        checked={onlyDelivery}
                        onChange={(e) => setOnlyDelivery(e.target.checked)}
                    />
                    Только с доставкой
                </label>
                <label className={styles.filterToggle}>
                    <input
                        type="checkbox"
                        checked={inStockOnly}
                        onChange={(e) => setInStockOnly(e.target.checked)}
                    />
                    Только в наличии
                </label>
                <label className={styles.filterToggle}>
                    <input
                        type="checkbox"
                        checked={withImageOnly}
                        onChange={(e) => setWithImageOnly(e.target.checked)}
                    />
                    Только с фото
                </label>
                <label className={styles.filterToggle}>
                    <input
                        type="checkbox"
                        checked={withArticleOnly}
                        onChange={(e) => setWithArticleOnly(e.target.checked)}
                    />
                    Только с артикулом
                </label>
                <input
                    className="input"
                    style={{ minWidth: 170, maxWidth: 220, height: 38 }}
                    placeholder="Фильтр по бренду"
                    value={brandFilter}
                    onChange={(e) => setBrandFilter(e.target.value)}
                />
                <select
                    className={styles.sortSelect}
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'price_asc' | 'price_desc' | 'supplier')}
                >
                    <option value="price_asc">Сначала дешевле</option>
                    <option value="price_desc">Сначала дороже</option>
                    <option value="supplier">По поставщику</option>
                </select>
                {hasResults && !requestSent && (
                    <>
                        <button
                            className="btn btn-primary"
                            onClick={onQuickRequest}
                            disabled={requestSubmitting}
                        >
                            📨 {requestSubmitting ? 'Отправляем...' : 'Отправить заявку поставщикам'}
                        </button>
                        <button
                            className="btn btn-secondary"
                            onClick={onDetailedRequest}
                            disabled={requestSubmitting}
                        >
                            Уточнить детали
                        </button>
                    </>
                )}
                {requestSent && (
                    <span className="badge badge-success" style={{ padding: '8px 16px', fontSize: '0.88rem' }}>
                        ✓ Заявка отправлена!
                    </span>
                )}
            </div>
        </div>
    );
}
