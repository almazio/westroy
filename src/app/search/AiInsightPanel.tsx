'use client';

import { useState, useEffect } from 'react';
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

interface AiApiResponse {
    product: string;
    category: string;
    volume: number | null;
    volumeUnit: string | null;
    location: string | null;
    deliveryNeeded: boolean;
    urgent: boolean;
    details: string | null;
    userMessage: string;
}

export default function AiInsightPanel({
    parsed,
    avgPrice,
    minDeliveryTotal,
    minFallbackTotal,
    summaryUnit,
    filteredOffersCount,
}: AiInsightPanelProps) {
    const [aiInsight, setAiInsight] = useState<AiApiResponse | null>(null);
    const [loading, setLoading] = useState(false);

    // AI Insight Fetching
    useEffect(() => {
        const query = parsed.originalQuery;
        if (!query || query.length < 3) return;

        // Не спамим запросами, если уже загрузили для этого же запроса
        // (можно добавить кэширование, но пока просто check)
        
        let isMounted = true;

        async function fetchAiInsight() {
            setLoading(true);
            try {
                const res = await fetch('/api/ai/parse-request', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: query }),
                });
                
                if (res.ok) {
                    const json = await res.json();
                    if (json.success && isMounted) {
                        setAiInsight(json.data);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch AI insight:', error);
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        // Запускаем AI анализ только если это не пустой/короткий запрос
        // Debounce не нужен, так как этот компонент рендерится уже после поиска
        fetchAiInsight();

        return () => { isMounted = false; };
    }, [parsed.originalQuery]);


    // Logic for displaying units (legacy/regex based fallback)
    const requestedQuantity = parsed.volume ? Number(parsed.volume.replace(',', '.')) : NaN;
    const hasRequestedQuantity = !Number.isNaN(requestedQuantity) && requestedQuantity > 0;
    const requestedUnit = normalizeUnit(parsed.unit);
    const isAggregatesCategory = parsed.categoryId === 'aggregates';

    const renderQuantitySummary = () => {
        // Приоритет AI данным, если есть
        if (aiInsight?.volume && aiInsight?.volumeUnit) {
             return `${aiInsight.volume} ${aiInsight.volumeUnit}`;
        }

        if (!hasRequestedQuantity || !requestedUnit) return null;
        if (isAggregatesCategory && requestedUnit === 't') {
            return `${requestedQuantity} т ≈ ${convertQuantity(requestedQuantity, 't', 'm3').toFixed(1)} м³`;
        }
        if (isAggregatesCategory && requestedUnit === 'm3') {
            return `${requestedQuantity} м³ ≈ ${convertQuantity(requestedQuantity, 'm3', 't').toFixed(1)} т`;
        }
        return `${requestedQuantity} ${parsed.unit || ''}`.trim();
    };

    // Fallback static recommendations
    const staticRecommendations = recommendationByCategory[parsed.categoryId || ''] || [
        'Сравнивайте цену, срок поставки и условия доставки.',
        'Перед заказом уточняйте остатки на складе.',
    ];

    const quantitySummary = renderQuantitySummary();

    return (
        <section className={styles.aiInsight}>
            <div className={styles.aiHeader}>
                <h3>🤖 Анализ запроса: &quot;{parsed.originalQuery}&quot;</h3>
                {loading && <span className={styles.aiLoading}>Думаю...</span>}
            </div>

            {/* Блок с ответом от AI (userMessage) */}
            {aiInsight ? (
                <div className={styles.aiMessage}>
                    <p><strong>МиниБро:</strong> {aiInsight.userMessage}</p>
                    {aiInsight.details && <p className={styles.aiDetails}>📝 Детали: {aiInsight.details}</p>}
                </div>
            ) : (
                /* Fallback пока грузится или если ошибка */
                 !loading && (
                    <p className={styles.aiSummary}>
                        {quantitySummary && `📦 ${quantitySummary} ${isAggregatesCategory ? '(в зависимости от типа и влажности)' : ''}`}
                    </p>
                 )
            )}

            <div className={styles.aiTips}>
                <div className={styles.aiTipsTitle}>💡 Рекомендации:</div>
                <ul>
                    {/* Если AI что-то вернул, можно адаптировать советы, но пока оставим статику + цену */}
                    {staticRecommendations.map((tip) => (
                        <li key={tip}>{tip}</li>
                    ))}
                    {aiInsight?.urgent && <li>🔥 Вы отметили срочность — выбирайте поставщиков со значком "В наличии"</li>}
                    {aiInsight?.deliveryNeeded && <li>🚚 Включен поиск с доставкой в {aiInsight.location || 'черте города'}</li>}
                </ul>
            </div>

            <div className={styles.aiStats}>
                {avgPrice !== null && (
                    <span className={styles.aiStatBadge}>💰 Средняя: {formatPrice(avgPrice)} ₸ {summaryUnit}</span>
                )}
                {(minDeliveryTotal !== null || minFallbackTotal !== null) && (
                    <span className={styles.aiStatBadge}>
                        🚚 Доставка: от {formatPrice(minDeliveryTotal ?? minFallbackTotal ?? 0)} ₸
                    </span>
                )}
            </div>
            
            <p className={styles.aiFooterText}>
                ⬇️ {filteredOffersCount > 0 ? 'Предложения от проверенных поставщиков:' : 'По запросу пока нет точных совпадений, попробуйте уточнить категорию.'}
            </p>
        </section>
    );
}
