import styles from '../page.module.css';
import type { CatalogQualityData } from '../types';

interface CatalogQualityTabProps {
    catalogQuality: CatalogQualityData | null;
}

export function CatalogQualityTab({ catalogQuality }: CatalogQualityTabProps) {
    if (!catalogQuality) {
        return <div className="text-muted">Данные пока недоступны</div>;
    }

    return (
        <div className={styles.qualitySection}>
            <div className={styles.qualityGrid}>
                <div className={styles.metric}><span>Товаров</span><strong>{catalogQuality.totals.products}</strong></div>
                <div className={styles.metric}><span>Без описания</span><strong>{catalogQuality.quality.missingDescription}</strong></div>
                <div className={styles.metric}><span>Неверная единица</span><strong>{catalogQuality.quality.invalidUnit}</strong></div>
                <div className={styles.metric}><span>Невалидная цена</span><strong>{catalogQuality.quality.invalidPrice}</strong></div>
                <div className={styles.metric}><span>Устаревшие цены</span><strong>{catalogQuality.quality.staleProducts}</strong></div>
                <div className={styles.metric}><span>Нет в наличии</span><strong>{catalogQuality.quality.outOfStock}</strong></div>
                <div className={styles.metric}><span>Компаний без товаров</span><strong>{catalogQuality.totals.companiesWithoutProducts}</strong></div>
            </div>

            <div className={styles.hintBox}>
                Порог устаревания цен: {catalogQuality.staleDays} дней
            </div>

            <table className="data-table">
                <thead>
                    <tr>
                        <th>Компании без каталога</th>
                    </tr>
                </thead>
                <tbody>
                    {catalogQuality.samples.companiesWithoutProducts.length === 0 ? (
                        <tr><td className="text-muted">Все компании имеют товары</td></tr>
                    ) : (
                        catalogQuality.samples.companiesWithoutProducts.map((c) => (
                            <tr key={c.id}>
                                <td>{c.name} <code className={styles.code}>{c.id}</code></td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
