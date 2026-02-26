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

    useEffect(() => {
        const query = parsed.originalQuery;
        if (!query || query.length < 3) return;
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
                    if (json.success && isMounted) setAiInsight(json.data);
                }
            } catch (error) {
                console.error('Failed to fetch AI insight:', error);
            } finally {
                if (isMounted) setLoading(false);
            }
        }
        fetchAiInsight();
        return () => { isMounted = false; };
    }, [parsed.originalQuery]);

    // Fallback logic for quantity display
    const requestedQuantity = parsed.volume ? Number(parsed.volume.replace(',', '.')) : NaN;
    const hasRequestedQuantity = !Number.isNaN(requestedQuantity) && requestedQuantity > 0;
    const requestedUnit = normalizeUnit(parsed.unit);
    const isAggregatesCategory = parsed.categoryId === 'aggregates';

    const renderQuantitySummary = () => {
        if (aiInsight?.volume && aiInsight?.volumeUnit) return `${aiInsight.volume} ${aiInsight.volumeUnit}`;
        if (!hasRequestedQuantity || !requestedUnit) return null;
        if (isAggregatesCategory && requestedUnit === 't') return `${requestedQuantity} т ≈ ${convertQuantity(requestedQuantity, 't', 'm3').toFixed(1)} м³`;
        if (isAggregatesCategory && requestedUnit === 'm3') return `${requestedQuantity} м³ ≈ ${convertQuantity(requestedQuantity, 'm3', 't').toFixed(1)} т`;
        return `${requestedQuantity} ${parsed.unit || ''}`.trim();
    };

    const quantitySummary = renderQuantitySummary();
    const staticRecommendations = recommendationByCategory[parsed.categoryId || ''] || [];

    return (
        <section className={styles.aiInsight}>
            <div className={styles.aiContent}>
                <div className={styles.aiMain}>
                    {loading ? (
                        <div className={styles.aiLoadingRow}>
                            <span className={styles.aiIcon}>✨</span>
                            <span className={styles.aiLoadingText}>Анализирую рынок...</span>
                        </div>
                    ) : aiInsight ? (
                        <>
                            <div className={styles.aiHeaderRow}>
                                <div className={styles.aiMessageBubble}>
                                    <span className={styles.aiIcon}>✨</span>
                                    <span className={styles.aiMessageText}>{aiInsight.userMessage}</span>
                                </div>
                            </div>
                            
                            <div className={styles.aiTagsRow}>
                                {aiInsight.product && <span className={styles.aiTag}>🏗 {aiInsight.product}</span>}
                                {quantitySummary && <span className={styles.aiTag}>📦 {quantitySummary}</span>}
                                {aiInsight.location && <span className={styles.aiTag}>📍 {aiInsight.location}</span>}
                                {aiInsight.urgent && <span className={styles.aiTagUrgent}>🔥 Срочно</span>}
                            </div>
                        </>
                    ) : (
                        <div className={styles.aiHeaderRow}>
                            <span className={styles.aiMessageText}>
                                По запросу &quot;{parsed.originalQuery}&quot; найдено {filteredOffersCount} предложений
                            </span>
                        </div>
                    )}
                </div>

                <div className={styles.aiStatsSide}>
                    {avgPrice !== null && (
                        <div className={styles.aiStatItem}>
                            <span className={styles.aiStatLabel}>Средняя цена</span>
                            <span className={styles.aiStatValue}>{formatPrice(avgPrice)} ₸ <small>/{summaryUnit}</small></span>
                        </div>
                    )}
                    {(minDeliveryTotal !== null || minFallbackTotal !== null) && (
                        <div className={styles.aiStatItem}>
                            <span className={styles.aiStatLabel}>С доставкой от</span>
                            <span className={styles.aiStatValue}>{formatPrice(minDeliveryTotal ?? minFallbackTotal ?? 0)} ₸</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Рекомендации (скрываем если пусто) */}
            {(staticRecommendations.length > 0 || aiInsight?.deliveryNeeded) && (
                <div className={styles.aiFooter}>
                    <div className={styles.aiTipsCompact}>
                        {staticRecommendations.slice(0, 1).map((tip) => (
                            <span key={tip}>💡 {tip}</span>
                        ))}
                        {aiInsight?.deliveryNeeded && <span>🚚 Доставка включена в поиск</span>}
                    </div>
                </div>
            )}
        </section>
    );
}
