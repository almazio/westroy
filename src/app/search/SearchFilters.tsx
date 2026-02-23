'use client';

import styles from './page.module.css';

interface SearchFiltersProps {
    filteredOffersCount: number;
    onlyDelivery: boolean;
    setOnlyDelivery: (v: boolean) => void;
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
