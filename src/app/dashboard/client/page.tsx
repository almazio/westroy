'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

interface RequestData {
    id: string;
    query: string;
    parsedCategory: string;
    parsedVolume?: string;
    parsedCity: string;
    deliveryNeeded: boolean;
    address?: string;
    deadline?: string;
    status: string;
    createdAt: string;
    updatedAt?: string;
    offerCount: number;
}

interface OfferData {
    id: string;
    requestId: string;
    companyId: string;
    price: number;
    priceUnit: string;
    comment: string;
    deliveryIncluded: boolean;
    deliveryPrice?: number;
    status: string;
    createdAt: string;
    updatedAt?: string;
}

interface SessionUser {
    id: string;
}

export default function ClientDashboard() {
    const [requests, setRequests] = useState<RequestData[]>([]);
    const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
    const [offers, setOffers] = useState<OfferData[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<SessionUser | null>(null);

    useEffect(() => {
        // Fetch session/user info
        fetch('/api/auth/session')
            .then(r => r.json())
            .then(data => {
                if (data?.user) {
                    setUser(data.user);
                    fetch(`/api/requests?userId=${data.user.id}`)
                        .then(r => r.json())
                        .then(reqs => {
                            setRequests(reqs);
                            setLoading(false);
                        });
                } else {
                    setLoading(false);
                }
            })
            .catch(() => setLoading(false));
    }, []);

    const loadOffers = async (requestId: string) => {
        setSelectedRequest(requestId);
        const res = await fetch(`/api/offers?requestId=${requestId}`);
        const data = await res.json();
        setOffers(data);
    };

    const handleOfferUpdate = async (offerId: string, status: 'accepted' | 'rejected') => {
        try {
            const res = await fetch(`/api/offers/${offerId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            if (res.ok) {
                // Refresh offers
                if (selectedRequest) loadOffers(selectedRequest);
                // Also refresh requests to see status change (active -> in_progress)
                if (user?.id) {
                    const rRes = await fetch(`/api/requests?userId=${user.id}`);
                    const rData = await rRes.json();
                    setRequests(rData);
                }
            }
        } catch (error) {
            console.error('Failed to update offer:', error);
        }
    };

    const formatPrice = (price: number) => new Intl.NumberFormat('ru-RU').format(price);
    const formatDate = (date: string) => new Date(date).toLocaleDateString('ru-RU');

    const statusLabels: Record<string, { label: string; className: string }> = {
        active: { label: 'Активна', className: 'status-active' },
        in_progress: { label: 'В работе', className: 'status-pending' },
        completed: { label: 'Завершена', className: 'status-completed' },
        cancelled: { label: 'Отменена', className: '' },
    };

    return (
        <div className="page">
            <div className="container">
                <div className={styles.header}>
                    <div>
                        <h1>Мои заявки</h1>
                        <p className="text-secondary">Все ваши запросы и полученные предложения</p>
                    </div>
                    <Link href="/" className="btn btn-primary">
                        + Новый поиск
                    </Link>
                </div>

                {loading ? (
                    <div className="loading" style={{ padding: 60, textAlign: 'center' }}>Загрузка...</div>
                ) : requests.length === 0 ? (
                    <div className={styles.empty}>
                        <h3>Заявок пока нет</h3>
                        <p>Воспользуйтесь AI-поиском на главной странице, чтобы найти производителей.</p>
                        <Link href="/" className="btn btn-primary btn-lg mt-16">
                            Начать поиск
                        </Link>
                    </div>
                ) : (
                    <div className={styles.layout}>
                        {/* Requests list */}
                        <div className={styles.requestsList}>
                            {requests.map(req => (
                                <button
                                    key={req.id}
                                    className={`${styles.requestItem} ${selectedRequest === req.id ? styles.requestItemActive : ''}`}
                                    onClick={() => loadOffers(req.id)}
                                >
                                    <div className={styles.requestItemTop}>
                                        <span className={`badge ${statusLabels[req.status]?.className}`}>
                                            {statusLabels[req.status]?.label}
                                        </span>
                                        <span className={styles.requestDate}>{formatDate(req.createdAt)}</span>
                                    </div>
                                    <div className={styles.requestQuery}>{req.query}</div>
                                    <div className={styles.requestMeta}>
                                        <span>📦 {req.parsedCategory}</span>
                                        {req.parsedVolume && <span>📐 {req.parsedVolume}</span>}
                                        <span>📍 {req.parsedCity}</span>
                                    </div>
                                    <div className={styles.requestOffers}>
                                        {req.offerCount} предложени{req.offerCount === 1 ? 'е' : req.offerCount < 5 ? 'я' : 'й'}
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Offers panel */}
                        <div className={styles.offersPanel}>
                            {!selectedRequest ? (
                                <div className={styles.offerEmpty}>
                                    <p>Выберите заявку, чтобы увидеть предложения</p>
                                </div>
                            ) : offers.length === 0 ? (
                                <div className={styles.offerEmpty}>
                                    <p>Предложений пока нет. Производители скоро ответят.</p>
                                </div>
                            ) : (
                                <>
                                    <h3 className="mb-16">Предложения ({offers.length})</h3>
                                    <RequestTimeline
                                        request={requests.find((r) => r.id === selectedRequest) || null}
                                        offers={offers}
                                    />
                                    {offers.map(offer => (
                                        <div key={offer.id} className={styles.offerCard}>
                                            <div className={styles.offerHeader}>
                                                <div className={styles.offerPrice}>
                                                    {formatPrice(offer.price)} ₸
                                                    <span className={styles.offerPriceUnit}>{offer.priceUnit}</span>
                                                </div>
                                                <span className={`badge ${getOfferStatusBadge(offer.status)}`}>
                                                    {getOfferStatusLabel(offer.status)}
                                                </span>
                                            </div>
                                            {offer.comment && (
                                                <p className={styles.offerComment}>«{offer.comment}»</p>
                                            )}
                                            <div className={styles.offerMeta}>
                                                {offer.deliveryIncluded && <span className="badge badge-success">🚚 Доставка включена</span>}
                                                {offer.deliveryPrice && offer.deliveryPrice > 0 && (
                                                    <span className="badge badge-warning">🚚 Доставка: {formatPrice(offer.deliveryPrice)} ₸</span>
                                                )}
                                            </div>
                                            <div className={styles.offerActions}>
                                                <button
                                                    className="btn btn-primary btn-sm"
                                                    onClick={() => handleOfferUpdate(offer.id, 'accepted')}
                                                    disabled={offer.status !== 'pending'}
                                                >
                                                    Принять
                                                </button>
                                                <button
                                                    className="btn btn-ghost btn-sm"
                                                    onClick={() => handleOfferUpdate(offer.id, 'rejected')}
                                                    disabled={offer.status !== 'pending'}
                                                >
                                                    Отклонить
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function getOfferStatusBadge(status: string) {
    if (status === 'accepted') return 'badge-success';
    if (status === 'rejected') return 'badge-danger';
    return 'badge-warning';
}

function getOfferStatusLabel(status: string) {
    if (status === 'accepted') return 'Принято';
    if (status === 'rejected') return 'Отклонено';
    return 'Ожидает';
}

function RequestTimeline({ request, offers }: { request: RequestData | null; offers: OfferData[] }) {
    if (!request) return null;

    const events = [
        {
            id: `request-created-${request.id}`,
            date: request.createdAt,
            title: 'Заявка создана',
            description: 'Запрос отправлен производителям',
        },
        ...offers.map((offer) => ({
            id: `offer-${offer.id}-${offer.status}`,
            date: offer.updatedAt || offer.createdAt,
            title:
                offer.status === 'accepted'
                    ? 'Предложение принято'
                    : offer.status === 'rejected'
                        ? 'Предложение отклонено'
                        : 'Получено предложение',
            description: `Цена: ${new Intl.NumberFormat('ru-RU').format(offer.price)} ₸ ${offer.priceUnit}`,
        })),
        ...(request.status === 'in_progress'
            ? [{
                id: `request-progress-${request.id}`,
                date: request.updatedAt || request.createdAt,
                title: 'Заявка в работе',
                description: 'Выбрано предложение, исполнение начато',
            }]
            : []),
        ...(request.status === 'completed'
            ? [{
                id: `request-completed-${request.id}`,
                date: request.updatedAt || request.createdAt,
                title: 'Заявка завершена',
                description: 'Заказ отмечен завершенным',
            }]
            : []),
        ...(request.status === 'cancelled'
            ? [{
                id: `request-cancelled-${request.id}`,
                date: request.updatedAt || request.createdAt,
                title: 'Заявка отменена',
                description: 'Работа по заявке остановлена',
            }]
            : []),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return (
        <div className={styles.timeline}>
            <h4>Таймлайн заявки</h4>
            <div className={styles.timelineList}>
                {events.map((event) => (
                    <div key={event.id} className={styles.timelineItem}>
                        <div className={styles.timelineDot}></div>
                        <div className={styles.timelineContent}>
                            <div className={styles.timelineTop}>
                                <strong>{event.title}</strong>
                                <span>{new Date(event.date).toLocaleString('ru-RU')}</span>
                            </div>
                            <p>{event.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
