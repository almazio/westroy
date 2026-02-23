'use client';

import { ParsedData, formatPrice, convertQuantity, normalizeUnit, recommendationByCategory } from './search-utils';
import styles from './page.module.css';

interface AiInsightPanelProps {
    parsed: ParsedData;
    avgPrice: number | null;
    minDeliveryTotal: number | null;
    minFallbackTotal: number | null;
    summaryUnit: string;
    filteredOffersCount: number;
}

export default function AiInsightPanel({
    parsed,
    avgPrice,
    minDeliveryTotal,
    minFallbackTotal,
    summaryUnit,
    filteredOffersCount,
}: AiInsightPanelProps) {
    const requestedQuantity = parsed.volume ? Number(parsed.volume.replace(',', '.')) : NaN;
    const hasRequestedQuantity = !Number.isNaN(requestedQuantity) && requestedQuantity > 0;
    const requestedUnit = normalizeUnit(parsed.unit);
    const isAggregatesCategory = parsed.categoryId === 'aggregates';

    const renderQuantitySummary = () => {
        if (!hasRequestedQuantity || !requestedUnit) return null;
        if (isAggregatesCategory && requestedUnit === 't') {
            return `${requestedQuantity} т ≈ ${convertQuantity(requestedQuantity, 't', 'm3').toFixed(1)} м³`;
        }
        if (isAggregatesCategory && requestedUnit === 'm3') {
            return `${requestedQuantity} м³ ≈ ${convertQuantity(requestedQuantity, 'm3', 't').toFixed(1)} т`;
        }
        return `${requestedQuantity} ${parsed.unit || ''}`.trim();
    };

    const recommendations = recommendationByCategory[parsed.categoryId || ''] || [
        'Сравнивайте цену, срок поставки и условия доставки.',
        'Перед заказом уточняйте остатки на складе.',
    ];

    const quantitySummary = renderQuantitySummary();

    return (
        <section className={styles.aiInsight}>
            <h3>🤖 Для вашего запроса &quot;{parsed.originalQuery}&quot;</h3>
            {quantitySummary && (
                <p className={styles.aiSummary}>
                    📦 {quantitySummary} {isAggregatesCategory ? '(в зависимости от типа и влажности материала)' : ''}
                </p>
            )}

            <div className={styles.aiTips}>
                <div className={styles.aiTipsTitle}>💡 Рекомендации:</div>
                <ul>
                    {recommendations.map((tip) => (
                        <li key={tip}>{tip}</li>
                    ))}
                </ul>
            </div>
            {avgPrice !== null && (
                <p className={styles.aiSummary}>💰 Средняя цена: {formatPrice(avgPrice)} ₸ {summaryUnit}</p>
            )}
            {(minDeliveryTotal !== null || minFallbackTotal !== null) && (
                <p className={styles.aiSummary}>
                    🚚 С доставкой по {parsed.city || 'Шымкент'}: от {formatPrice(minDeliveryTotal ?? minFallbackTotal ?? 0)} ₸
                </p>
            )}
            <p className={styles.aiSummary}>
                ⬇️ {filteredOffersCount > 0 ? 'Предложения от проверенных поставщиков:' : 'По запросу пока нет совпадений, попробуйте уточнить материал или объем.'}
            </p>
        </section>
    );
}
