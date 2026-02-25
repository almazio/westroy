'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

interface OrderData {
    id: string;
    status: string;
    totalPrice: number;
    deliveryPrice?: number;
    deliveryAddress?: string;
    notes?: string;
    createdAt: string;
    company: { id: string; name: string; phone: string };
    offer?: { request?: { parsedCategory: string; parsedCity: string } };
    review?: { id: string; rating: number; comment?: string } | null;
}

export default function OrdersManager({ role }: { role: 'client' | 'producer' }) {
    const { data: session } = useSession();
    const [orders, setOrders] = useState<OrderData[]>([]);
    const [loading, setLoading] = useState(true);

    // Review Modal State
    const [reviewModalOrder, setReviewModalOrder] = useState<string | null>(null);
    const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });

    useEffect(() => {
        if (!session?.user) return;
        fetch('/api/orders')
            .then(r => r.json())
            .then(data => {
                setOrders(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [session?.user]);

    const updateStatus = async (id: string, status: string) => {
        try {
            const res = await fetch(`/api/orders/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            if (res.ok) {
                const updated = await res.json();
                setOrders(prev => prev.map(o => o.id === id ? { ...o, status: updated.status } : o));
            } else {
                alert('Ошибка обновления статуса');
            }
        } catch (e) {
            console.error(e);
        }
    };

    const submitReview = async () => {
        if (!reviewModalOrder) return;
        try {
            const res = await fetch(`/api/orders/${reviewModalOrder}/reviews`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reviewForm)
            });
            if (res.ok) {
                const review = await res.json();
                setOrders(prev => prev.map(o => o.id === reviewModalOrder ? { ...o, review } : o));
                setReviewModalOrder(null);
                setReviewForm({ rating: 5, comment: '' });
            } else {
                alert('Ошибка отправки отзыва');
            }
        } catch (e) {
            console.error(e);
        }
    };

    const formatPrice = (price: number) => new Intl.NumberFormat('ru-RU').format(price);
    const formatDate = (date: string) => new Date(date).toLocaleDateString('ru-RU');

    const statusMap: Record<string, { label: string; badge: string }> = {
        confirmed: { label: 'Подтвержден', badge: 'badge-primary' },
        delivering: { label: 'В доставке', badge: 'badge-warning' },
        delivered: { label: 'Доставлен', badge: 'badge-success' },
        completed: { label: 'Завершен', badge: 'badge-success' },
        cancelled: { label: 'Отменен', badge: 'badge-danger' },
    };

    if (loading) return <div className="loading" style={{ padding: 40, textAlign: 'center' }}>Загрузка заказов...</div>;

    if (orders.length === 0) {
        return <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Заказов пока нет</div>;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {orders.map(order => {
                const sMap = statusMap[order.status] || { label: order.status, badge: '' };
                return (
                    <div key={order.id} className="card" style={{ padding: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <span className={`badge ${sMap.badge}`}>{sMap.label}</span>
                            <span style={{ fontSize: 13, color: '#888' }}>{formatDate(order.createdAt)}</span>
                        </div>
                        <h4 style={{ margin: '0 0 8px 0' }}>{order.offer?.request?.parsedCategory || 'Товар'}</h4>
                        <div style={{ fontSize: 14, color: '#aaa', marginBottom: 16 }}>
                            {role === 'client' ? `Поставщик: ${order.company.name}` : `Город: ${order.offer?.request?.parsedCity}`}
                            <br />
                            Сумма: <strong>{formatPrice(order.totalPrice)} ₸</strong>
                            {order.deliveryPrice ? ` (+ ${formatPrice(order.deliveryPrice)} ₸ доставка)` : ''}
                        </div>

                        {/* Actions based on role and status */}
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            {role === 'producer' && order.status === 'confirmed' && (
                                <button className="btn btn-warning btn-sm" onClick={() => updateStatus(order.id, 'delivering')}>
                                    📦 Передать в доставку
                                </button>
                            )}
                            {role === 'producer' && order.status === 'delivering' && (
                                <button className="btn btn-success btn-sm" onClick={() => updateStatus(order.id, 'delivered')}>
                                    ✅ Отметить как доставленный
                                </button>
                            )}

                            {role === 'client' && (order.status === 'delivered' || order.status === 'confirmed' || order.status === 'delivering') && (
                                <button className="btn btn-success btn-sm" onClick={() => updateStatus(order.id, 'completed')}>
                                    🏁 Завершить заказ
                                </button>
                            )}

                            {role === 'client' && order.status === 'completed' && !order.review && (
                                <button className="btn btn-primary btn-sm" onClick={() => setReviewModalOrder(order.id)}>
                                    ⭐ Оставить отзыв
                                </button>
                            )}
                        </div>

                        {order.review && (
                            <div style={{ marginTop: 16, padding: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
                                <div style={{ color: '#FFD700', marginBottom: 4 }}>
                                    {'★'.repeat(order.review.rating)}{'☆'.repeat(5 - order.review.rating)}
                                </div>
                                {order.review.comment && <div style={{ fontSize: 13, color: '#ccc' }}>«{order.review.comment}»</div>}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Review Modal */}
            {reviewModalOrder && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
                    <div className="card" style={{ width: '100%', maxWidth: 400 }}>
                        <h3 style={{ marginTop: 0 }}>Оцените работу поставщика</h3>
                        <div className="form-group">
                            <label>Оценка (1-5)</label>
                            <input
                                type="range"
                                min="1" max="5"
                                value={reviewForm.rating}
                                onChange={e => setReviewForm(f => ({ ...f, rating: parseInt(e.target.value) }))}
                                style={{ width: '100%', cursor: 'pointer' }}
                            />
                            <div style={{ textAlign: 'center', fontSize: 24, marginTop: 8, color: '#FFD700' }}>
                                {'★'.repeat(reviewForm.rating)}{'☆'.repeat(5 - reviewForm.rating)}
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Комментарий (опционально)</label>
                            <textarea
                                className="input"
                                value={reviewForm.comment}
                                onChange={e => setReviewForm(f => ({ ...f, comment: e.target.value }))}
                                placeholder="Напишите, что вам понравилось или не понравилось"
                            ></textarea>
                        </div>
                        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                            <button className="btn btn-primary" style={{ flex: 1 }} onClick={submitReview}>Отправить</button>
                            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setReviewModalOrder(null)}>Отмена</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
