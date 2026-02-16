
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Offer, Request } from '@/lib/types';

interface OffersTabProps {
    companyId: string;
}

type OfferWithRequest = Offer & {
    request: Request;
};

export default function OffersTab({ companyId }: OffersTabProps) {
    const [offers, setOffers] = useState<OfferWithRequest[]>([]);
    const [loading, setLoading] = useState(true);

    const loadOffers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/offers?companyId=${companyId}`);
            if (res.ok) {
                const data = await res.json();
                setOffers(data);
            }
        } catch (error) {
            console.error('Failed to load offers', error);
        } finally {
            setLoading(false);
        }
    }, [companyId]);

    useEffect(() => {
        void loadOffers();
    }, [loadOffers]);

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'accepted': return 'badge-success';
            case 'rejected': return 'badge-danger';
            default: return 'badge-warning';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'accepted': return 'Принято';
            case 'rejected': return 'Отклонено';
            default: return 'Ожидает ответа';
        }
    };

    const formatDate = (date: string) => new Date(date).toLocaleDateString('ru-RU');

    if (loading) return <div>Загрузка предложений...</div>;

    return (
        <div className="offers-tab">
            <h2>Мои предложения</h2>
            <div className="offers-grid">
                {offers.length === 0 ? (
                    <div className="empty-state">
                        <p>Вы еще не отправили ни одного предложения.</p>
                    </div>
                ) : (
                    offers.map(offer => (
                        <div key={offer.id} className="card offer-card">
                            <div className="offer-header">
                                <span className={`badge ${getStatusBadgeClass(offer.status)}`}>
                                    {getStatusText(offer.status)}
                                </span>
                                <span className="text-secondary">{formatDate(offer.createdAt)}</span>
                            </div>

                            <div className="request-context">
                                <strong>Запрос:</strong> «{offer.request.query}»
                                <div className="request-meta">
                                    <span>{offer.request.parsedCategory}</span>
                                    <span>{offer.request.parsedCity}</span>
                                </div>
                            </div>

                            <hr />

                            <div className="offer-details">
                                <div className="price">
                                    {offer.price} ₸ {offer.priceUnit}
                                </div>
                                {offer.deliveryIncluded ? (
                                    <div className="delivery-info success">Доставка включена</div>
                                ) : offer.deliveryPrice ? (
                                    <div className="delivery-info">+ Доставка: {offer.deliveryPrice} ₸</div>
                                ) : (
                                    <div className="delivery-info">Самовывоз</div>
                                )}
                                {offer.comment && (
                                    <p className="comment">«{offer.comment}»</p>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <style jsx>{`
                .offers-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
                    gap: 20px;
                    margin-top: 20px;
                }
                .offer-card {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                .offer-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .request-context {
                    background: var(--bg-body);
                    padding: 10px;
                    border-radius: 8px;
                    font-size: 0.9rem;
                }
                .request-meta {
                    display: flex;
                    gap: 10px;
                    margin-top: 4px;
                    color: var(--text-secondary);
                    font-size: 0.8rem;
                }
                .price {
                    font-size: 1.2rem;
                    font-weight: bold;
                    color: var(--primary);
                }
                .delivery-info {
                    font-size: 0.85rem;
                    margin-top: 4px;
                }
                .delivery-info.success {
                    color: var(--success);
                }
                .comment {
                    font-style: italic;
                    margin-top: 8px;
                    font-size: 0.9rem;
                    color: var(--text-secondary);
                }
                hr {
                    border: 0;
                    border-top: 1px solid var(--border);
                    margin: 8px 0;
                }
            `}</style>
        </div>
    );
}
