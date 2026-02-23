'use client';

import styles from './page.module.css';

interface SearchFiltersProps {
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
    viewMode: 'grid-2' | 'grid-3' | 'list';
    setViewMode: (v: 'grid-2' | 'grid-3' | 'list') => void;
}

export default function SearchFilters({
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
    viewMode,
    setViewMode,
}: SearchFiltersProps) {
    return (
        <div className={styles.filtersBar}>
            <div className={styles.filterPills}>
                <label className={styles.filterToggle}>
                    <input type="checkbox" checked={onlyDelivery} onChange={(e) => setOnlyDelivery(e.target.checked)} />
                    Доставка
                </label>
                <label className={styles.filterToggle}>
                    <input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} />
                    В наличии
                </label>
                <label className={styles.filterToggle}>
                    <input type="checkbox" checked={withImageOnly} onChange={(e) => setWithImageOnly(e.target.checked)} />
                    С фото
                </label>
                <label className={styles.filterToggle}>
                    <input type="checkbox" checked={withArticleOnly} onChange={(e) => setWithArticleOnly(e.target.checked)} />
                    С артикулом
                </label>
            </div>

            <div className={styles.filtersControls}>
                <input
                    className="input"
                    placeholder="Например: ExProfil"
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
                <div className={styles.viewSwitch}>
                    <button
                        type="button"
                        className={`btn btn-sm ${viewMode === 'grid-2' ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setViewMode('grid-2')}
                    >
                        Сетка 2
                    </button>
                    <button
                        type="button"
                        className={`btn btn-sm ${viewMode === 'grid-3' ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setViewMode('grid-3')}
                    >
                        Сетка 3
                    </button>
                    <button
                        type="button"
                        className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setViewMode('list')}
                    >
                        Список
                    </button>
                </div>
            </div>
        </div>
    );
}
