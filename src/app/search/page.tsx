'use client';

import { useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import SearchBar from '@/components/SearchBar';
import { getDealersForOffer, type DealerCard } from '@/lib/test-dealers';
import { trackEvent } from '@/lib/analytics';
import styles from './page.module.css';

interface SearchResultData {
    company: {
        id: string; name: string; description: string; delivery: boolean;
        verified: boolean; address: string; phone: string; categoryId: string;
    };
    products: { id: string; name: string; description: string; priceFrom: number; priceUnit: string; unit: string; updatedAt?: string }[];
    priceFrom: number;
    priceUnit: string;
    relevanceScore: number;
    stats?: {
        completedOrders: number;
        avgResponseMinutes: number | null;
    };
}

interface ParsedData {
    category: string | null;
    categoryId: string | null;
    volume: string | null;
    unit: string | null;
    city: string | null;
    delivery: boolean | null;
    grade: string | null;
    confidence: number;
    suggestions: { type: string; label: string; value: string }[];
    originalQuery: string;
}

interface GuestFormState {
    name: string;
    phone: string;
    quantity: string;
    address: string;
}

interface PendingAuthIntent {
    payload: {
        categoryId: string;
        query: string;
        parsedCategory: string;
        parsedVolume?: string;
        parsedCity?: string | null;
        deliveryNeeded: boolean;
        address?: string;
        deadline?: string;
    };
}

const REQUEST_INTENT_KEY = 'westroy_request_intent';
const CATEGORY_LABELS: Record<string, string> = {
    concrete: 'Бетон',
    aggregates: 'Инертные материалы',
    blocks: 'Кирпич и блоки',
    rebar: 'Арматура и металлопрокат',
    cement: 'Цемент',
    machinery: 'Спецтехника',
    'pvc-profiles': 'ПВХ профили и подоконники',
    'general-materials': 'Общестроительные материалы',
};

function SearchContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const q = searchParams.get('q') || '';
    const categoryParam = searchParams.get('category') || '';

    const [results, setResults] = useState<SearchResultData[]>([]);
    const [parsed, setParsed] = useState<ParsedData | null>(null);
    const [loading, setLoading] = useState(true);
    const [showRequestForm, setShowRequestForm] = useState(false);
    const [requestSent, setRequestSent] = useState(false);
    const [requestForm, setRequestForm] = useState({ address: '', deadline: '' });
    const [requestSubmitting, setRequestSubmitting] = useState(false);
    const [selectedProductIdsByCompany, setSelectedProductIdsByCompany] = useState<Record<string, string[]>>({});
    const [guestOfferId, setGuestOfferId] = useState<string | null>(null);
    const [guestSeller, setGuestSeller] = useState<{ name: string; type: 'producer' | 'dealer' } | null>(null);
    const [guestSubmitting, setGuestSubmitting] = useState(false);
    const [guestSent, setGuestSent] = useState(false);
    const [guestForm, setGuestForm] = useState<GuestFormState>({
        name: '',
        phone: '',
        quantity: '',
        address: '',
    });
    const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'supplier'>('price_asc');
    const [onlyDelivery, setOnlyDelivery] = useState(false);
    const requestFormRef = useRef<HTMLDivElement | null>(null);
    const seenProductCardsRef = useRef<Set<string>>(new Set());
    const { data: session } = useSession();

    useEffect(() => {
        async function fetchResults() {
            setLoading(true);
            const params = new URLSearchParams();
            if (q) params.set('q', q);
            if (categoryParam) params.set('category', categoryParam);

            const res = await fetch(`/api/search?${params}`);
            const data = await res.json();
            setResults(data.results || []);
            setParsed(data.parsed || null);
            trackEvent('search_results_viewed', {
                total_results: Array.isArray(data.results) ? data.results.length : 0,
                category_id: data?.parsed?.categoryId || '',
                has_query: Boolean(q),
            });
            setLoading(false);
        }
        if (q || categoryParam) fetchResults();
    }, [q, categoryParam]);

    useEffect(() => {
        if (!session?.user?.id) return;
        const rawIntent = sessionStorage.getItem(REQUEST_INTENT_KEY);
        if (!rawIntent) return;

        const submitIntent = async () => {
            try {
                const intent = JSON.parse(rawIntent) as PendingAuthIntent;
                if (!intent?.payload?.categoryId || !intent?.payload?.parsedCategory) return;
                await fetch('/api/requests', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(intent.payload),
                });
                setRequestSent(true);
            } finally {
                sessionStorage.removeItem(REQUEST_INTENT_KEY);
            }
        };

        void submitIntent();
    }, [session?.user?.id]);

    const buildSearchCallback = () => {
        const params = new URLSearchParams();
        if (q) params.set('q', q);
        if (categoryParam) params.set('category', categoryParam);
        const queryString = params.toString();
        return queryString ? `/search?${queryString}` : '/search';
    };

    const ensureAuthorized = () => {
        if (!session?.user?.id) {
            const callbackUrl = buildSearchCallback();
            router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
            return false;
        }
        return true;
    };

    const openRequestForm = () => {
        if (!ensureAuthorized()) return;

        trackEvent('request_started', {
            source: 'search_results',
            mode: 'smart_request',
            has_query: Boolean(parsed?.originalQuery),
        });
        setRequestSent(false);
        setShowRequestForm(true);
        setTimeout(() => {
            requestFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 0);
    };

    const buildRequestPayload = (
        companyId: string | null,
        options?: {
            address?: string;
            deadline?: string;
            extraProductId?: string;
            sellerName?: string;
            sellerType?: 'producer' | 'dealer';
        }
    ) => {
        const selectedCompany = companyId ? results.find((r) => r.company.id === companyId) : null;
        const fallbackCompany = selectedCompany || results[0] || null;
        const categoryId = parsed?.categoryId || fallbackCompany?.company.categoryId;
        const parsedCategory = categoryId
            ? (CATEGORY_LABELS[categoryId] || parsed?.category || fallbackCompany?.company.name || 'Строительные материалы')
            : (parsed?.category || fallbackCompany?.company.name || 'Строительные материалы');

        if (!categoryId) {
            throw new Error('Не удалось определить категорию запроса');
        }

        const selectedProductIds = companyId ? (selectedProductIdsByCompany[companyId] ?? []) : [];
        const mergedProductIds = options?.extraProductId && !selectedProductIds.includes(options.extraProductId)
            ? [...selectedProductIds, options.extraProductId]
            : selectedProductIds;
        const selectedProducts = selectedCompany
            ? selectedCompany.products.filter((p) => mergedProductIds.includes(p.id)).map((p) => p.name)
            : [];
        const supplierHint = selectedCompany ? `\nПредпочтительный поставщик: ${selectedCompany.company.name}` : '';
        const productHint = selectedProducts.length > 0 ? `\nВыбранные позиции: ${selectedProducts.join(', ')}` : '';
        const sellerHint = options?.sellerName
            ? `\nКанал покупки: ${options.sellerType === 'dealer' ? 'Дилер' : 'Производитель'} — ${options.sellerName}`
            : '';
        const baseQuery = parsed?.originalQuery || q || 'Запрос клиента';
        const queryWithSelection = `${baseQuery}${supplierHint}${productHint}${sellerHint}`;

        return {
            categoryId,
            query: queryWithSelection,
            parsedCategory,
            parsedVolume: parsed?.volume ? `${parsed.volume} ${parsed.unit || ''}`.trim() : undefined,
            parsedCity: parsed?.city || 'Шымкент',
            deliveryNeeded: Boolean(parsed?.delivery || false),
            address: options?.address,
            deadline: options?.deadline,
        };
    };

    const submitRequest = async (
        companyId: string | null,
        options?: {
            address?: string;
            deadline?: string;
            extraProductId?: string;
            closeForm?: boolean;
            sellerName?: string;
            sellerType?: 'producer' | 'dealer';
        }
    ) => {
        if (!ensureAuthorized()) return;
        if (requestSubmitting) return;

        setRequestSubmitting(true);
        try {
            const payload = buildRequestPayload(companyId, options);
            const res = await fetch('/api/requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                setRequestSent(true);
                trackEvent('request_submitted', {
                    source: 'search_results',
                    category_id: payload.categoryId,
                });
                if (options?.closeForm) {
                    setShowRequestForm(false);
                }
            } else {
                const err = await res.json();
                console.error('Failed to send request:', err);
                trackEvent('request_submit_failed', {
                    source: 'search_results',
                    category_id: payload.categoryId,
                });
                alert(`Ошибка при отправке заявки: ${err.details || err.error}`);
            }
        } catch (e) {
            console.error('Error sending request:', e);
            trackEvent('request_submit_failed', {
                source: 'search_results',
                category_id: parsed?.categoryId || '',
            });
            alert('Произошла ошибка при отправке заявки. Попробуйте позже.');
        } finally {
            setRequestSubmitting(false);
        }
    };

    const saveIntentAndRedirectToAuth = (payload: PendingAuthIntent['payload'], mode: 'login' | 'register') => {
        sessionStorage.setItem(REQUEST_INTENT_KEY, JSON.stringify({ payload } satisfies PendingAuthIntent));
        const callbackUrl = buildSearchCallback();
        router.push(`/${mode}?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    };

    const toggleProductSelection = (companyId: string, productId: string) => {
        setSelectedProductIdsByCompany((prev) => {
            const current = prev[companyId] ?? [];
            const hasSelected = current.includes(productId);
            return {
                ...prev,
                [companyId]: hasSelected
                    ? current.filter((id) => id !== productId)
                    : [...current, productId],
            };
        });
    };

    const formatRelativePriceUpdate = (isoDate?: string) => {
        if (!isoDate) return null;
        const updatedAt = new Date(isoDate);
        if (Number.isNaN(updatedAt.getTime())) return null;
        const now = new Date();
        const dayMs = 24 * 60 * 60 * 1000;
        const days = Math.floor((now.getTime() - updatedAt.getTime()) / dayMs);
        if (days <= 0) return 'сегодня';
        if (days === 1) return '1 день назад';
        if (days >= 2 && days <= 4) return `${days} дня назад`;
        return `${days} дней назад`;
    };

    const handleSendRequest = async () => {
        if (!parsed) return;
        await submitRequest(null, {
            address: requestForm.address,
            deadline: requestForm.deadline,
            closeForm: true,
        });
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('ru-RU').format(price);
    };

    const normalizeUnit = (value?: string | null): 'm3' | 't' | 'pcs' | null => {
        if (!value) return null;
        const normalized = value.toLowerCase();
        if (normalized.includes('м3') || normalized.includes('м³') || normalized.includes('куб')) return 'm3';
        if (normalized.includes('т')) return 't';
        if (normalized.includes('шт')) return 'pcs';
        return null;
    };

    const requestedQuantity = parsed?.volume ? Number(parsed.volume.replace(',', '.')) : NaN;
    const hasRequestedQuantity = !Number.isNaN(requestedQuantity) && requestedQuantity > 0;
    const requestedUnit = normalizeUnit(parsed?.unit);
    const isAggregatesCategory = parsed?.categoryId === 'aggregates';

    const convertQuantity = (quantity: number, from: 'm3' | 't', to: 'm3' | 't') => {
        if (from === to) return quantity;
        // Approximation for inert materials: 1 m3 ~= 1.5 t
        const densityFactor = 1.5;
        return from === 't' ? quantity / densityFactor : quantity * densityFactor;
    };

    const renderQuantitySummary = () => {
        if (!hasRequestedQuantity || !requestedUnit) return null;
        if (isAggregatesCategory && requestedUnit === 't') {
            return `${requestedQuantity} т ≈ ${convertQuantity(requestedQuantity, 't', 'm3').toFixed(1)} м³`;
        }
        if (isAggregatesCategory && requestedUnit === 'm3') {
            return `${requestedQuantity} м³ ≈ ${convertQuantity(requestedQuantity, 'm3', 't').toFixed(1)} т`;
        }
        return `${requestedQuantity} ${parsed?.unit || ''}`.trim();
    };

    const recommendationByCategory: Record<string, string[]> = {
        aggregates: [
            'Мытый песок подходит для бетона и штукатурки.',
            'Карьерный песок выгоднее для засыпки и подушки под фундамент.',
        ],
        concrete: [
            'Для несущих конструкций чаще выбирают бетон М300 и выше.',
            'Проверьте время подачи миксера и возможность заливки в один цикл.',
        ],
        blocks: [
            'Газоблок удобен для теплых стен и быстрой кладки.',
            'Сразу уточняйте клей/раствор и подрезку под проект.',
        ],
        rebar: [
            'Сравнивайте не только цену, но и класс/диаметр арматуры.',
            'Уточняйте наличие сертификатов и длину прутка.',
        ],
        cement: [
            'Уточняйте марку цемента и дату фасовки перед заказом.',
            'Для больших объемов лучше сразу сравнивать навал и мешки.',
        ],
        'pvc-profiles': [
            'Сверяйте количество камер и метраж профиля перед заказом.',
            'Для ламинации заранее уточняйте доступные цвета и срок поставки.',
        ],
        'general-materials': [
            'Для материалов без цены отправляйте заявку сразу нескольким поставщикам.',
            'Перед оплатой уточняйте остатки, сроки и упаковку на складе.',
        ],
    };

    const recommendations = recommendationByCategory[parsed?.categoryId || ''] || [
        'Сравнивайте цену, срок поставки и условия доставки.',
        'Перед заказом уточняйте остатки на складе.',
    ];

    const getOfferImage = (offer: { productName: string; productDescription: string; companyName: string }) => {
        const text = `${offer.productName} ${offer.productDescription} ${offer.companyName}`.toLowerCase();
        if (text.includes('подокон') || text.includes('профил') || text.includes('ламбри') || text.includes('штапик') || text.includes('пвх')) {
            return '/images/catalog/pvc-profile.jpg';
        }
        if (text.includes('фанер') || text.includes('осп') || text.includes('дсп') || text.includes('двп')) {
            return '/images/catalog/wood-board.jpg';
        }
        if (text.includes('гипсокартон') || text.includes('штукатур') || text.includes('клей')) {
            return '/images/catalog/drywall.jpg';
        }
        if (text.includes('керамогранит') || text.includes('плитк')) {
            return '/images/catalog/tile.jpg';
        }
        if (text.includes('утепл') || text.includes('вата') || text.includes('подложк')) {
            return '/images/catalog/insulation.jpg';
        }
        if (text.includes('труба') || text.includes('муфта') || text.includes('канализа')) {
            return '/images/catalog/pipes.jpg';
        }
        if (text.includes('бетон') || text.includes('цемент')) {
            return '/images/catalog/concrete.jpg';
        }
        if (text.includes('песок') || text.includes('щеб')) {
            return '/images/catalog/aggregates.jpg';
        }
        return '/images/catalog/materials.jpg';
    };

    const calculateEstimatedTotal = (result: SearchResultData) => {
        if (!hasRequestedQuantity) return null;
        const supplierUnit = normalizeUnit(result.priceUnit || result.products[0]?.priceUnit || result.products[0]?.unit);
        if (!supplierUnit || !requestedUnit) return null;
        if (supplierUnit === requestedUnit) return Math.round(requestedQuantity * result.priceFrom);
        if (isAggregatesCategory && requestedUnit === 't' && supplierUnit === 'm3') {
            const converted = convertQuantity(requestedQuantity, 't', 'm3');
            return Math.round(converted * result.priceFrom);
        }
        if (isAggregatesCategory && requestedUnit === 'm3' && supplierUnit === 't') {
            const converted = convertQuantity(requestedQuantity, 'm3', 't');
            return Math.round(converted * result.priceFrom);
        }
        return null;
    };

    const calculateEstimatedTotalByOffer = (priceFrom: number, priceUnit: string) => {
        if (!hasRequestedQuantity) return null;
        const supplierUnit = normalizeUnit(priceUnit);
        if (!supplierUnit || !requestedUnit) return null;
        if (supplierUnit === requestedUnit) return Math.round(requestedQuantity * priceFrom);
        if (isAggregatesCategory && requestedUnit === 't' && supplierUnit === 'm3') {
            const converted = convertQuantity(requestedQuantity, 't', 'm3');
            return Math.round(converted * priceFrom);
        }
        if (isAggregatesCategory && requestedUnit === 'm3' && supplierUnit === 't') {
            const converted = convertQuantity(requestedQuantity, 'm3', 't');
            return Math.round(converted * priceFrom);
        }
        return null;
    };

    const productOffers = useMemo(() => {
        return results.flatMap((result) =>
            result.products.map((product) => ({
                productId: product.id,
                productName: product.name,
                productDescription: product.description,
                priceFrom: product.priceFrom,
                priceUnit: product.priceUnit || product.unit,
                inStock: true,
                updatedAt: product.updatedAt,
                companyId: result.company.id,
                companyName: result.company.name,
                companyAddress: result.company.address,
                companyDelivery: result.company.delivery,
                companyVerified: result.company.verified,
                companyStats: result.stats,
            }))
        );
    }, [results]);

    const comparisonRows = results.map((result) => {
        const total = calculateEstimatedTotal(result);
        return {
            companyId: result.company.id,
            companyName: result.company.name,
            priceFrom: result.priceFrom,
            priceUnit: result.priceUnit,
            total,
            hasDelivery: result.company.delivery,
        };
    });

    const avgPrice = comparisonRows.length > 0
        ? Math.round(comparisonRows.reduce((sum, row) => sum + row.priceFrom, 0) / comparisonRows.length)
        : null;

    const deliveryTotals = comparisonRows
        .filter((row) => row.hasDelivery && row.total !== null)
        .map((row) => row.total as number);
    const minDeliveryTotal = deliveryTotals.length > 0 ? Math.min(...deliveryTotals) : null;

    const fallbackTotals = comparisonRows
        .filter((row) => row.total !== null)
        .map((row) => row.total as number);
    const minFallbackTotal = fallbackTotals.length > 0 ? Math.min(...fallbackTotals) : null;

    const summaryUnit = comparisonRows[0]?.priceUnit || parsed?.unit || '';

    const filteredOffers = useMemo(() => {
        const base = onlyDelivery ? productOffers.filter((offer) => offer.companyDelivery) : productOffers;
        const sorted = [...base];
        if (sortBy === 'price_asc') {
            sorted.sort((a, b) => a.priceFrom - b.priceFrom);
        } else if (sortBy === 'price_desc') {
            sorted.sort((a, b) => b.priceFrom - a.priceFrom);
        } else {
            sorted.sort((a, b) => a.companyName.localeCompare(b.companyName, 'ru'));
        }
        return sorted;
    }, [productOffers, onlyDelivery, sortBy]);

    useEffect(() => {
        for (const offer of filteredOffers.slice(0, 12)) {
            if (seenProductCardsRef.current.has(offer.productId)) continue;
            seenProductCardsRef.current.add(offer.productId);
            trackEvent('product_card_viewed', {
                product_id: offer.productId,
                company_id: offer.companyId,
                category_id: parsed?.categoryId || '',
            });
        }
    }, [filteredOffers, parsed?.categoryId]);

    const handleProductRequestClick = async (
        companyId: string,
        productId: string,
        seller: { name: string; type: 'producer' | 'dealer' }
    ) => {
        trackEvent('request_started', {
            source: 'product_card',
            company_id: companyId,
            product_id: productId,
            seller_type: seller.type,
        });
        if (!session?.user?.id) {
            setGuestSent(false);
            setGuestOfferId(`${companyId}:${productId}`);
            setGuestSeller(seller);
            return;
        }
        setSelectedProductIdsByCompany((prev) => {
            const current = prev[companyId] ?? [];
            if (current.includes(productId)) return prev;
            return { ...prev, [companyId]: [...current, productId] };
        });
        await submitRequest(companyId, {
            extraProductId: productId,
            sellerName: seller.name,
            sellerType: seller.type,
        });
    };

    const handleGuestSubmit = async (offer: {
        companyId: string;
        companyName: string;
        productId: string;
        productName: string;
        sellerName: string;
        sellerType: 'producer' | 'dealer';
    }) => {
        if (!guestForm.name.trim() || !guestForm.phone.trim()) {
            alert('Укажите имя и телефон');
            return;
        }

        setGuestSubmitting(true);
        try {
            const basePayload = buildRequestPayload(offer.companyId, {
                extraProductId: offer.productId,
                address: guestForm.address || undefined,
                sellerName: offer.sellerName,
                sellerType: offer.sellerType,
            });
            const quantityLine = guestForm.quantity ? `\nКоличество: ${guestForm.quantity}` : '';
            const guestContactLine = `\nКонтакт гостя: ${guestForm.name}, ${guestForm.phone}`;
            const payloadForAuth = {
                ...basePayload,
                query: `${basePayload.query}${quantityLine}${guestContactLine}`,
                address: guestForm.address || basePayload.address,
            };

            const guestRes = await fetch('/api/guest-requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: guestForm.name,
                    phone: guestForm.phone,
                    quantity: guestForm.quantity,
                    address: guestForm.address,
                    query: basePayload.query,
                    companyName: offer.companyName,
                    productName: offer.productName,
                    sellerName: offer.sellerName,
                    city: parsed?.city || 'Шымкент',
                }),
            });

            if (!guestRes.ok) {
                const err = await guestRes.json().catch(() => ({}));
                trackEvent('request_submit_failed', {
                    source: 'guest_inline',
                    company_id: offer.companyId,
                    product_id: offer.productId,
                });
                alert(err.error || 'Не удалось отправить гостевую заявку');
                return;
            }

            trackEvent('request_submitted', {
                source: 'guest_inline',
                company_id: offer.companyId,
                product_id: offer.productId,
                seller_type: offer.sellerType,
            });
            setGuestSent(true);
            setGuestOfferId(`${offer.companyId}:${offer.productId}`);
            sessionStorage.setItem(REQUEST_INTENT_KEY, JSON.stringify({ payload: payloadForAuth } satisfies PendingAuthIntent));
        } finally {
            setGuestSubmitting(false);
        }
    };

    const getResultsTitle = () => {
        return `Найдено ${filteredOffers.length} предложени${filteredOffers.length === 1 ? 'е' : filteredOffers.length < 5 ? 'я' : 'й'}`;
    };

    return (
        <div className="page">
            <div className="container">
                {/* Search bar at top */}
                <div className={styles.searchTop}>
                    <SearchBar initialQuery={q} />
                </div>

                {/* Loading */}
                {loading && (
                    <div className={styles.loading}>
                        <div className={styles.loadingDots}>
                            <span></span><span></span><span></span>
                        </div>
                        <p>AI анализирует ваш запрос...</p>
                    </div>
                )}

                {/* Results */}
                {!loading && (
                    <>
                        {parsed && (
                            <section className={styles.aiInsight}>
                                <h3>🤖 Для вашего запроса &quot;{parsed.originalQuery}&quot;</h3>
                                {renderQuantitySummary() && (
                                    <p className={styles.aiSummary}>📦 {renderQuantitySummary()} {isAggregatesCategory ? '(в зависимости от типа и влажности материала)' : ''}</p>
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
                                    ⬇️ {filteredOffers.length > 0 ? 'Предложения от проверенных поставщиков:' : 'По запросу пока нет совпадений, попробуйте уточнить материал или объем.'}
                                </p>
                            </section>
                        )}

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
                                {results.length > 0 && !requestSent && (
                                    <>
                                        <button
                                            className="btn btn-primary"
                                            onClick={() => submitRequest(null)}
                                            disabled={requestSubmitting}
                                        >
                                            📨 {requestSubmitting ? 'Отправляем...' : 'Отправить заявку поставщикам'}
                                        </button>
                                        <button
                                            className="btn btn-secondary"
                                            onClick={openRequestForm}
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

                        {/* Smart Request Form */}
                        {showRequestForm && (
                            <div ref={requestFormRef} className={styles.requestForm}>
                                <h3>📨 Smart Request — уточните детали</h3>
                                <p className={styles.requestFormHint}>
                                    Производители получат вашу заявку и пришлют точные цены
                                </p>
                                <div className={styles.requestFormFields}>
                                    <div className="form-group">
                                        <label>Адрес доставки</label>
                                        <input
                                            type="text"
                                            className="input"
                                            placeholder="ул. Абая, 100, Шымкент"
                                            value={requestForm.address}
                                            onChange={e => setRequestForm(f => ({ ...f, address: e.target.value }))}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Срок (когда нужно)</label>
                                        <input
                                            type="date"
                                            className="input"
                                            value={requestForm.deadline}
                                            onChange={e => setRequestForm(f => ({ ...f, deadline: e.target.value }))}
                                        />
                                    </div>
                                </div>
                                <button className="btn btn-primary btn-lg" onClick={handleSendRequest} disabled={requestSubmitting}>
                                    {requestSubmitting ? 'Отправляем...' : 'Отправить заявку производителям'}
                                </button>
                            </div>
                        )}

                        {/* Product marketplace cards */}
                        <div className={styles.offersGrid}>
                            {filteredOffers.map((offer, i) => {
                                const estimatedTotal = calculateEstimatedTotalByOffer(offer.priceFrom, offer.priceUnit);
                                const isSelected = selectedProductIdsByCompany[offer.companyId]?.includes(offer.productId);
                                const offerKey = `${offer.companyId}:${offer.productId}`;
                                const showGuestInline = !session?.user?.id && guestOfferId === offerKey;
                                const sellerCards = getDealersForOffer({
                                    companyId: offer.companyId,
                                    companyName: offer.companyName,
                                    priceFrom: offer.priceFrom,
                                    priceUnit: offer.priceUnit,
                                    companyDelivery: offer.companyDelivery,
                                });
                                return (
                                    <article key={`${offer.companyId}-${offer.productId}`} className={styles.offerCard} style={{ animationDelay: `${i * 0.04}s` }}>
                                        <div className={styles.offerImageWrap}>
                                            <img
                                                src={getOfferImage(offer)}
                                                alt={offer.productName}
                                                className={styles.offerImage}
                                                loading="lazy"
                                            />
                                        </div>
                                        <div className={styles.offerTitle}>{offer.productName}</div>
                                        <div className={styles.offerPrice}>{formatPrice(offer.priceFrom)} ₸ <span>{offer.priceUnit}</span></div>
                                        <p className={styles.offerDesc}>{offer.productDescription}</p>

                                        <div className={styles.offerMeta}>
                                            {offer.companyDelivery && <span className="badge badge-success">🚚 Доставка</span>}
                                            {offer.companyVerified && <span className="badge badge-info">✓ Проверен</span>}
                                            {offer.companyStats?.avgResponseMinutes !== null && offer.companyStats?.avgResponseMinutes !== undefined && (
                                                <span className="badge badge-warning">⚡ {offer.companyStats.avgResponseMinutes} мин</span>
                                            )}
                                        </div>

                                        {estimatedTotal !== null && (
                                            <div className={styles.offerTotal}>Итого для запроса: от {formatPrice(estimatedTotal)} ₸</div>
                                        )}

                                        <div className={styles.offerSupplier}>
                                            От: <Link href={`/company/${offer.companyId}`}>{offer.companyName}</Link>
                                        </div>
                                        <div className={styles.offerAddress}>{offer.companyAddress}</div>
                                        <div className={styles.offerUpdate}>Прайс обновлен: {formatRelativePriceUpdate(offer.updatedAt) || 'недавно'}</div>

                                        <div className={styles.offerActions}>
                                            <button
                                                type="button"
                                                className={`btn btn-secondary btn-sm ${isSelected ? styles.offerSelectActive : ''}`}
                                                onClick={() => toggleProductSelection(offer.companyId, offer.productId)}
                                            >
                                                {isSelected ? 'В заявке' : 'Добавить в заявку'}
                                            </button>
                                        </div>

                                        <div className={styles.sellersList}>
                                            {sellerCards.map((seller: DealerCard) => {
                                                const sellerPrice = seller.priceFrom > 0 ? `${formatPrice(seller.priceFrom)} ₸` : 'По запросу';
                                                return (
                                                    <div
                                                        key={seller.id}
                                                        className={`${styles.sellerRow} ${seller.type === 'producer' ? styles.sellerProducer : ''}`}
                                                    >
                                                        <div className={styles.sellerMain}>
                                                            <div className={styles.sellerTitle}>
                                                                {seller.type === 'producer' ? '🏭 Производитель' : '🏬 Дилер'}: {seller.name}
                                                            </div>
                                                            <div className={styles.sellerMeta}>
                                                                <span>⭐ {seller.rating.toFixed(1)} ({seller.reviewCount})</span>
                                                                <span>⚡ {seller.responseMinutes} мин</span>
                                                                <span>{seller.delivery ? '🚚 Доставка' : 'Самовывоз'}</span>
                                                            </div>
                                                        </div>
                                                        <div className={styles.sellerBuy}>
                                                            <div className={styles.sellerPrice}>
                                                                {sellerPrice} <span>{seller.priceUnit}</span>
                                                            </div>
                                                            <button
                                                                className="btn btn-primary btn-sm"
                                                                onClick={() => handleProductRequestClick(offer.companyId, offer.productId, { name: seller.name, type: seller.type })}
                                                                disabled={requestSubmitting}
                                                            >
                                                                {seller.type === 'producer' ? 'Заказать напрямую' : 'Заказать у дилера'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {showGuestInline && (
                                            <div className={styles.guestInline}>
                                                <h4>📋 Запрос цены</h4>
                                                {guestSeller && (
                                                    <p className={styles.guestSellerHint}>
                                                        Канал покупки: {guestSeller.type === 'producer' ? 'Производитель' : 'Дилер'} — {guestSeller.name}
                                                    </p>
                                                )}
                                                <div className={styles.guestFields}>
                                                    <input
                                                        className="input"
                                                        placeholder="Ваше имя"
                                                        value={guestForm.name}
                                                        onChange={(e) => setGuestForm((prev) => ({ ...prev, name: e.target.value }))}
                                                    />
                                                    <input
                                                        className="input"
                                                        placeholder="+7 7XX XXX XX XX"
                                                        value={guestForm.phone}
                                                        onChange={(e) => setGuestForm((prev) => ({ ...prev, phone: e.target.value }))}
                                                    />
                                                    <input
                                                        className="input"
                                                        placeholder="Количество"
                                                        value={guestForm.quantity}
                                                        onChange={(e) => setGuestForm((prev) => ({ ...prev, quantity: e.target.value }))}
                                                    />
                                                    <input
                                                        className="input"
                                                        placeholder="Адрес доставки (опционально)"
                                                        value={guestForm.address}
                                                        onChange={(e) => setGuestForm((prev) => ({ ...prev, address: e.target.value }))}
                                                    />
                                                </div>

                                                {!guestSent ? (
                                                    <div className={styles.guestActions}>
                                                        <button
                                                            className="btn btn-primary btn-sm"
                                                            onClick={() => handleGuestSubmit({
                                                                ...offer,
                                                                sellerName: guestSeller?.name || offer.companyName,
                                                                sellerType: guestSeller?.type || 'producer',
                                                            })}
                                                            disabled={guestSubmitting}
                                                        >
                                                            {guestSubmitting ? 'Отправляем...' : 'Отправить как гость'}
                                                        </button>
                                                        <button
                                                            className="btn btn-secondary btn-sm"
                                                            onClick={() => {
                                                                const payload = buildRequestPayload(offer.companyId, {
                                                                    extraProductId: offer.productId,
                                                                    address: guestForm.address || undefined,
                                                                    sellerName: guestSeller?.name || offer.companyName,
                                                                    sellerType: guestSeller?.type || 'producer',
                                                                });
                                                                saveIntentAndRedirectToAuth(
                                                                    {
                                                                        ...payload,
                                                                        query: `${payload.query}\nКонтакт гостя: ${guestForm.name || '—'}, ${guestForm.phone || '—'}`,
                                                                    },
                                                                    'register'
                                                                );
                                                            }}
                                                        >
                                                            Создать аккаунт
                                                        </button>
                                                        <button
                                                            className="btn btn-ghost btn-sm"
                                                            onClick={() => {
                                                                const payload = buildRequestPayload(offer.companyId, {
                                                                    extraProductId: offer.productId,
                                                                    address: guestForm.address || undefined,
                                                                    sellerName: guestSeller?.name || offer.companyName,
                                                                    sellerType: guestSeller?.type || 'producer',
                                                                });
                                                                saveIntentAndRedirectToAuth(
                                                                    {
                                                                        ...payload,
                                                                        query: `${payload.query}\nКонтакт гостя: ${guestForm.name || '—'}, ${guestForm.phone || '—'}`,
                                                                    },
                                                                    'login'
                                                                );
                                                            }}
                                                        >
                                                            Войти
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className={styles.guestSuccess}>
                                                        <p>✅ Гостевая заявка отправлена. Поставщик свяжется по телефону.</p>
                                                        <div className={styles.guestActions}>
                                                            <button
                                                                className="btn btn-secondary btn-sm"
                                                                onClick={() => {
                                                                    const payload = buildRequestPayload(offer.companyId, {
                                                                        extraProductId: offer.productId,
                                                                        address: guestForm.address || undefined,
                                                                        sellerName: guestSeller?.name || offer.companyName,
                                                                        sellerType: guestSeller?.type || 'producer',
                                                                    });
                                                                    saveIntentAndRedirectToAuth(
                                                                        {
                                                                            ...payload,
                                                                            query: `${payload.query}\nКонтакт гостя: ${guestForm.name || '—'}, ${guestForm.phone || '—'}`,
                                                                        },
                                                                        'register'
                                                                    );
                                                                }}
                                                            >
                                                                Создать аккаунт
                                                            </button>
                                                            <button
                                                                className="btn btn-ghost btn-sm"
                                                                onClick={() => {
                                                                    setGuestOfferId(null);
                                                                    setGuestSeller(null);
                                                                    setGuestSent(false);
                                                                }}
                                                            >
                                                                Продолжить поиск
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </article>
                                );
                            })}
                        </div>

                        {filteredOffers.length === 0 && (
                            <div className={styles.empty}>
                                {parsed && !parsed.categoryId ? (
                                    <p>Не удалось распознать строительный запрос. Уточните материал, объём и город, например: &quot;песок 3 тонны с доставкой в Шымкент&quot;.</p>
                                ) : (
                                    <p>Ничего не найдено. Попробуйте изменить запрос.</p>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default function SearchPage() {
    return (
        <Suspense fallback={<div className="page"><div className="container"><p>Загрузка...</p></div></div>}>
            <SearchContent />
        </Suspense>
    );
}
