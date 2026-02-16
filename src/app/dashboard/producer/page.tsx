
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import styles from './page.module.css';
import ProductsTab from '@/components/dashboard/producer/ProductsTab';
import SettingsTab from '@/components/dashboard/producer/SettingsTab';
import OffersTab from '@/components/dashboard/producer/OffersTab';
// Actually SettingsTab is expecting existing companyId.
// We need a CreateCompany component.

// Let's create CreateCompany inline or separate?
// Better separate. But for speed I will modify SettingsTab to handle null companyId?
// Or just inline a form here.

function CreateCompanyForm({ onSuccess }: { onSuccess: () => void }) {
    const [formData, setFormData] = useState({
        name: '', description: '', phone: '', address: '', delivery: false, regionId: 'kz-shim' // Default region
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // We need a POST /api/companies endpoint?
            // Or use an existing one?
            // I haven't implemented POST /api/companies (create company).
            // I only have PUT /api/companies/[id].

            // So I need POST /api/companies too!
            const res = await fetch('/api/companies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                onSuccess();
            } else {
                alert('Ошибка создания профиля');
            }
        } catch {
            alert('Ошибка');
        }
    };

    return (
        <div className="card" style={{ maxWidth: 500, margin: '40px auto' }}>
            <h2>Создание профиля компании</h2>
            <p className="text-secondary mb-4">Для начала работы заполните данные о вашей компании.</p>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Название компании</label>
                    <input className="input" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div className="form-group">
                    <label>Телефон</label>
                    <input className="input" required value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                </div>
                <div className="form-group">
                    <label>Адрес</label>
                    <input className="input" required value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                </div>
                <div className="form-group">
                    <label>Описание</label>
                    <textarea className="input" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                </div>
                <div className="form-group">
                    <label>
                        <input type="checkbox" checked={formData.delivery} onChange={e => setFormData({ ...formData, delivery: e.target.checked })} />
                        Есть доставка
                    </label>
                </div>
                <button type="submit" className="btn btn-primary">Создать профиль</button>
            </form>
        </div>
    );
}

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
    offerCount: number;
}

interface CompanyOfferRef {
    requestId: string;
}

export default function ProducerDashboard() {
    const { data: session } = useSession();
    const [tab, setTab] = useState<'requests' | 'offers' | 'products' | 'settings'>('requests');
    const [requests, setRequests] = useState<RequestData[]>([]);
    const [loading, setLoading] = useState(true);
    const [companyLoading, setCompanyLoading] = useState(true);

    // We need to fetch companyId if not in session, or rely on session update
    // Actually, asking backend for "my company" is safer.
    const [companyId, setCompanyId] = useState<string | null>(null);
    const [sentOfferIds, setSentOfferIds] = useState<Set<string>>(new Set());

    const [offerModal, setOfferModal] = useState<string | null>(null);
    const [offerForm, setOfferForm] = useState({
        price: '', comment: '', deliveryIncluded: false, deliveryPrice: '',
    });

    const fetchSentOffers = useCallback(async () => {
        if (!companyId) return;
        try {
            const res = await fetch(`/api/offers?companyId=${companyId}`);
            if (res.ok) {
                const data = await res.json();
                const ids = new Set<string>((data as CompanyOfferRef[]).map((o) => o.requestId));
                setSentOfferIds(ids);
            }
        } catch (error) {
            console.error(error);
        }
    }, [companyId]);

    const fetchCompany = useCallback(async () => {
        if (!session?.user) return;
        try {
            const res = await fetch('/api/companies/me');
            if (res.ok) {
                const data = await res.json();
                setCompanyId(data.id);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setCompanyLoading(false);
        }
    }, [session?.user]);

    useEffect(() => {
        void fetchCompany();
    }, [fetchCompany]);

    useEffect(() => {
        if (companyId) {
            void fetchSentOffers();
        }
    }, [companyId, fetchSentOffers]);

    useEffect(() => {
        if (tab === 'requests') {
            fetch('/api/requests')
                .then(r => r.json())
                .then(data => { setRequests(data); setLoading(false); })
                .catch(err => console.error(err));
        }
    }, [tab]);

    const handleSendOffer = async (requestId: string) => {
        if (!companyId) return alert('Ошибка: Компания не найдена');

        const res = await fetch('/api/offers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                requestId,
                companyId,
                price: parseFloat(offerForm.price),
                priceUnit: 'за м³',
                comment: offerForm.comment,
                deliveryIncluded: offerForm.deliveryIncluded,
                deliveryPrice: offerForm.deliveryPrice ? parseFloat(offerForm.deliveryPrice) : undefined,
            }),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            alert(err.error || 'Не удалось отправить предложение');
            return;
        }

        // Update local state to show "Sent" immediately
        setSentOfferIds(prev => new Set(prev).add(requestId));

        setOfferModal(null);
        setOfferForm({ price: '', comment: '', deliveryIncluded: false, deliveryPrice: '' });
    };

    const formatDate = (date: string) => new Date(date).toLocaleDateString('ru-RU');

    if (!session) return <div>Загрузка сессии...</div>;

    if (companyLoading) return <div className="loading">Загрузка профиля...</div>;

    if (!companyId) {
        return (
            <div className="page">
                <div className="container">
                    <CreateCompanyForm onSuccess={() => { fetchCompany(); alert('Профиль создан!'); }} />
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="container">
                <div className={styles.header}>
                    <div>
                        <h1>Кабинет производителя</h1>
                        <p className="text-secondary">{session.user.name} · Управление заявками и предложениями</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className={styles.tabs}>
                    <button
                        className={`${styles.tab} ${tab === 'requests' ? styles.tabActive : ''}`}
                        onClick={() => setTab('requests')}
                    >
                        📨 Входящие заявки
                        {requests.length > 0 && <span className={styles.tabCount}>{requests.length}</span>}
                    </button>
                    <button
                        className={`${styles.tab} ${tab === 'offers' ? styles.tabActive : ''}`}
                        onClick={() => setTab('offers')}
                    >
                        💸 Мои предложения
                    </button>
                    <button
                        className={`${styles.tab} ${tab === 'products' ? styles.tabActive : ''}`}
                        onClick={() => setTab('products')}
                    >
                        📦 Мои товары
                    </button>
                    <button
                        className={`${styles.tab} ${tab === 'settings' ? styles.tabActive : ''}`}
                        onClick={() => setTab('settings')}
                    >
                        ⚙️ Настройки
                    </button>
                </div>

                {/* Requests tab */}
                {tab === 'requests' && (
                    <div className={styles.requestsGrid}>
                        {loading && requests.length === 0 ? (
                            <div className="loading" style={{ padding: 40, textAlign: 'center' }}>Загрузка...</div>
                        ) : requests.length === 0 ? (
                            <div className={styles.empty}>
                                <p>Входящих заявок пока нет</p>
                            </div>
                        ) : (
                            requests.map(req => (
                                <div key={req.id} className={styles.requestCard}>
                                    <div className={styles.requestTop}>
                                        <span className={`badge ${req.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                                            {req.status === 'active' ? 'Новая' : 'В работе'}
                                        </span>
                                        <span className={styles.requestDate}>{formatDate(req.createdAt)}</span>
                                    </div>

                                    <div className={styles.requestQuery}>«{req.query}»</div>

                                    <div className={styles.requestDetails}>
                                        <div className={styles.detailRow}>
                                            <span className={styles.detailLabel}>Категория:</span>
                                            <span>{req.parsedCategory}</span>
                                        </div>
                                        {req.parsedVolume && (
                                            <div className={styles.detailRow}>
                                                <span className={styles.detailLabel}>Объём:</span>
                                                <span>{req.parsedVolume}</span>
                                            </div>
                                        )}
                                        <div className={styles.detailRow}>
                                            <span className={styles.detailLabel}>Город:</span>
                                            <span>{req.parsedCity}</span>
                                        </div>
                                        {req.deliveryNeeded && (
                                            <div className={styles.detailRow}>
                                                <span className={styles.detailLabel}>Доставка:</span>
                                                <span>Нужна</span>
                                            </div>
                                        )}
                                    </div>

                                    {sentOfferIds.has(req.id) ? (
                                        <div className={styles.offerSentBadge}>
                                            ✓ Предложение отправлено
                                        </div>
                                    ) : offerModal === req.id ? (
                                        <div className={styles.offerFormInline}>
                                            <h4>Быстрое предложение</h4>
                                            <div className={styles.offerFields}>
                                                <div className="form-group">
                                                    <label>Цена (₸)</label>
                                                    <input
                                                        type="number"
                                                        className="input"
                                                        placeholder="28000"
                                                        value={offerForm.price}
                                                        onChange={e => setOfferForm(f => ({ ...f, price: e.target.value }))}
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label>Комментарий</label>
                                                    <textarea
                                                        className="input"
                                                        placeholder="Доставим за 2 часа..."
                                                        value={offerForm.comment}
                                                        onChange={e => setOfferForm(f => ({ ...f, comment: e.target.value }))}
                                                    />
                                                </div>
                                                <label className={styles.checkboxLabel}>
                                                    <input
                                                        type="checkbox"
                                                        checked={offerForm.deliveryIncluded}
                                                        onChange={e => setOfferForm(f => ({ ...f, deliveryIncluded: e.target.checked }))}
                                                    />
                                                    Доставка включена
                                                </label>
                                            </div>
                                            <div className={styles.offerFormActions}>
                                                <button className="btn btn-primary btn-sm" onClick={() => handleSendOffer(req.id)}>
                                                    Отправить предложение
                                                </button>
                                                <button className="btn btn-ghost btn-sm" onClick={() => setOfferModal(null)}>
                                                    Отмена
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            className="btn btn-primary"
                                            style={{ width: '100%', marginTop: 12 }}
                                            onClick={() => setOfferModal(req.id)}
                                        >
                                            ⚡ Быстрое предложение
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Offers tab */}
                {tab === 'offers' && (
                    <div className={styles.tabContent}>
                        {companyId ? (
                            <OffersTab companyId={companyId} />
                        ) : (
                            <p>Ошибка: Профиль не найден</p>
                        )}
                    </div>
                )}

                {/* Products tab */}
                {tab === 'products' && (
                    <div className={styles.tabContent}>
                        {companyId ? (
                            <ProductsTab companyId={companyId} />
                        ) : (
                            <p>Ошибка: Профиль не найден</p>
                        )}
                    </div>
                )}

                {/* Settings tab */}
                {tab === 'settings' && (
                    <div className={styles.tabContent}>
                        {companyId ? (
                            <SettingsTab companyId={companyId} />
                        ) : (
                            <p>Ошибка: Профиль не найден</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
