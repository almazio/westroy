'use client';

import { useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import SearchBar from '@/components/SearchBar';
import { trackEvent } from '@/lib/analytics';
import {
    SearchResultData, ParsedData, GuestFormState, PendingAuthIntent, ProductOffer,
    REQUEST_INTENT_KEY, CATEGORY_LABELS,
    formatPrice, normalizeUnit, convertQuantity,
} from './search-utils';
import AiInsightPanel from './AiInsightPanel';
import SearchFilters from './SearchFilters';
import SmartRequestForm from './SmartRequestForm';
import OfferCard from './OfferCard';
import styles from './page.module.css';

function SearchContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const q = searchParams.get('q') || '';
    const categoryParam = searchParams.get('category') || '';

    const [results, setResults] = useState<SearchResultData[]>([]);
    const [parsed, setParsed] = useState<ParsedData | null>(null);
    const [subCategories, setSubCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showRequestForm, setShowRequestForm] = useState(false);
    const [requestSent, setRequestSent] = useState(false);
    const [requestForm, setRequestForm] = useState({ address: '', deadline: '' });
    const [requestSubmitting, setRequestSubmitting] = useState(false);
    const [selectedProductIdsByCompany, setSelectedProductIdsByCompany] = useState<Record<string, string[]>>({});
    const [guestOfferId, setGuestOfferId] = useState<string | null>(null);
    const [guestSeller, setGuestSeller] = useState<{ name: string; type: 'producer' | 'dealer' } | null>(null);
    const [guestSubmitting, setGuestSubmitting] = useState(false);
    const [guestSent, setGuestSent] = useState(false);
    const [guestForm, setGuestForm] = useState<GuestFormState>({ name: '', phone: '', quantity: '', address: '' });
    const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'supplier'>('price_asc');
    const [viewMode, setViewMode] = useState<'grid-2' | 'grid-3' | 'list'>('list');
    const [onlyDelivery, setOnlyDelivery] = useState(false);
    const [inStockOnly, setInStockOnly] = useState(true);
    const [withImageOnly, setWithImageOnly] = useState(false);
    const [withArticleOnly, setWithArticleOnly] = useState(false);
    const [brandFilter, setBrandFilter] = useState('');
    const requestFormRef = useRef<HTMLDivElement | null>(null);
    const seenProductCardsRef = useRef<Set<string>>(new Set());
    const { data: session } = useSession();
    const isCategoryBrowseOnly = Boolean(categoryParam && !q.trim());
    const isDirectoryHub = isCategoryBrowseOnly && subCategories.length > 0;

    // --- Data fetching ---
    useEffect(() => {
        async function fetchResults() {
            setLoading(true);
            const params = new URLSearchParams();
            if (q) params.set('q', q);
            if (categoryParam) params.set('category', categoryParam);
            if (inStockOnly) params.set('inStock', 'true');
            if (withImageOnly) params.set('withImage', 'true');
            if (withArticleOnly) params.set('withArticle', 'true');
            if (brandFilter.trim()) params.set('brand', brandFilter.trim());

            const res = await fetch(`/api/search?${params}`);
            const data = await res.json();
            setResults(data.results || []);
            setParsed(data.parsed || null);
            setSubCategories(data.subCategories || []);
            trackEvent('search_results_viewed', {
                total_results: Array.isArray(data.results) ? data.results.length : 0,
                category_id: data?.parsed?.categoryId || '',
                has_query: Boolean(q),
            });
            setLoading(false);
        }
        if (q || categoryParam) {
            void fetchResults();
        } else {
            setResults([]);
            setParsed(null);
            setSubCategories([]);
            setLoading(false);
        }
    }, [q, categoryParam, inStockOnly, withImageOnly, withArticleOnly, brandFilter]);

    // Fetch category breadcrumbs if needed in future
    useEffect(() => {
        // ...
    }, []);

    // --- Auth intent replay ---
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

    // --- Helpers ---
    const buildSearchCallback = () => {
        const params = new URLSearchParams();
        if (q) params.set('q', q);
        if (categoryParam) params.set('category', categoryParam);
        const queryString = params.toString();
        return queryString ? `/search?${queryString}` : '/search';
    };

    const ensureAuthorized = () => {
        if (!session?.user?.id) {
            router.push(`/login?callbackUrl=${encodeURIComponent(buildSearchCallback())}`);
            return false;
        }
        return true;
    };

    const buildRequestPayload = (
        companyId: string | null,
        options?: { address?: string; deadline?: string; extraProductId?: string; sellerName?: string; sellerType?: 'producer' | 'dealer' }
    ) => {
        const selectedCompany = companyId ? results.find((r) => r.company.id === companyId) : null;
        const fallbackCompany = selectedCompany || results[0] || null;
        const categoryId = parsed?.categoryId || fallbackCompany?.company.categoryId;
        const parsedCategory = categoryId
            ? (CATEGORY_LABELS[categoryId] || parsed?.category || fallbackCompany?.company.name || 'Строительные материалы')
            : (parsed?.category || fallbackCompany?.company.name || 'Строительные материалы');

        if (!categoryId) throw new Error('Не удалось определить категорию запроса');

        const selectedProductIds = companyId ? (selectedProductIdsByCompany[companyId] ?? []) : [];
        const mergedProductIds = options?.extraProductId && !selectedProductIds.includes(options.extraProductId)
            ? [...selectedProductIds, options.extraProductId] : selectedProductIds;
        const selectedProducts = selectedCompany
            ? selectedCompany.products.filter((p) => mergedProductIds.includes(p.id)).map((p) => p.name) : [];
        const supplierHint = selectedCompany ? `\nПредпочтительный поставщик: ${selectedCompany.company.name}` : '';
        const productHint = selectedProducts.length > 0 ? `\nВыбранные позиции: ${selectedProducts.join(', ')}` : '';
        const sellerHint = options?.sellerName
            ? `\nКанал покупки: ${options.sellerType === 'dealer' ? 'Дилер' : 'Производитель'} — ${options.sellerName}` : '';
        const baseQuery = parsed?.originalQuery || q || 'Запрос клиента';

        return {
            categoryId,
            query: `${baseQuery}${supplierHint}${productHint}${sellerHint}`,
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
        options?: { address?: string; deadline?: string; extraProductId?: string; closeForm?: boolean; sellerName?: string; sellerType?: 'producer' | 'dealer' }
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
                trackEvent('request_submitted', { source: 'search_results', category_id: payload.categoryId });
                if (options?.closeForm) setShowRequestForm(false);
            } else {
                const err = await res.json();
                trackEvent('request_submit_failed', { source: 'search_results', category_id: payload.categoryId });
                alert(`Ошибка при отправке заявки: ${err.details || err.error}`);
            }
        } catch (e) {
            console.error('Error sending request:', e);
            trackEvent('request_submit_failed', { source: 'search_results', category_id: parsed?.categoryId || '' });
            alert('Произошла ошибка при отправке заявки. Попробуйте позже.');
        } finally {
            setRequestSubmitting(false);
        }
    };

    const saveIntentAndRedirectToAuth = (payload: PendingAuthIntent['payload'], mode: 'login' | 'register') => {
        sessionStorage.setItem(REQUEST_INTENT_KEY, JSON.stringify({ payload } satisfies PendingAuthIntent));
        router.push(`/${mode}?callbackUrl=${encodeURIComponent(buildSearchCallback())}`);
    };

    const productOffers = useMemo<ProductOffer[]>(() => {
        return results.flatMap((result) =>
            result.products.map((product) => ({
                productId: product.id,
                productName: product.name,
                productSlug: product.slug,
                productDescription: product.description,
                productArticle: product.article,
                productBrand: product.brand,
                productSpecs: product.technicalSpecs,
                boxQuantity: product.boxQuantity,
                imageUrl: product.imageUrl,
                source: product.source,
                priceFrom: product.priceFrom || 0,
                priceUnit: product.priceUnit || product.unit || '',
                inStock: product.inStock ?? true,
                updatedAt: product.updatedAt,
                companyId: result.company.id,
                companyName: result.company.name,
                companySlug: result.company.slug,
                companyAddress: result.company.address,
                companyDelivery: result.company.delivery,
                companyVerified: result.company.verified,
                companyStats: result.stats,
            }))
        );
    }, [results]);

    const filteredOffers = useMemo(() => {
        const base = onlyDelivery ? productOffers.filter((o) => o.companyDelivery) : productOffers;
        const sorted = [...base];
        if (sortBy === 'price_asc') sorted.sort((a, b) => a.priceFrom - b.priceFrom);
        else if (sortBy === 'price_desc') sorted.sort((a, b) => b.priceFrom - a.priceFrom);
        else sorted.sort((a, b) => a.companyName.localeCompare(b.companyName, 'ru'));
        return sorted;
    }, [productOffers, onlyDelivery, sortBy]);

    // --- Analytics ---
    useEffect(() => {
        for (const offer of filteredOffers.slice(0, 12)) {
            if (seenProductCardsRef.current.has(offer.productId)) continue;
            seenProductCardsRef.current.add(offer.productId);
            trackEvent('product_card_viewed', { product_id: offer.productId, company_id: offer.companyId, category_id: parsed?.categoryId || '' });
        }
    }, [filteredOffers, parsed?.categoryId]);

    // --- Comparison stats ---
    const comparisonRows = results.map((result) => {
        const calculateEstimatedTotal = () => {
            const requestedQuantity = parsed?.volume ? Number(parsed.volume.replace(',', '.')) : NaN;
            const hasQty = !Number.isNaN(requestedQuantity) && requestedQuantity > 0;
            if (!hasQty) return null;
            const requestedUnit = normalizeUnit(parsed?.unit);
            const supplierUnit = normalizeUnit(result.priceUnit || result.products[0]?.priceUnit || result.products[0]?.unit);
            if (!supplierUnit || !requestedUnit) return null;
            const isAgg = parsed?.categoryId === 'aggregates';
            if (supplierUnit === requestedUnit) return Math.round(requestedQuantity * result.priceFrom);
            if (isAgg && requestedUnit === 't' && supplierUnit === 'm3') return Math.round(convertQuantity(requestedQuantity, 't', 'm3') * result.priceFrom);
            if (isAgg && requestedUnit === 'm3' && supplierUnit === 't') return Math.round(convertQuantity(requestedQuantity, 'm3', 't') * result.priceFrom);
            return null;
        };
        return {
            companyId: result.company.id,
            companyName: result.company.name,
            priceFrom: result.priceFrom,
            priceUnit: result.priceUnit,
            total: calculateEstimatedTotal(),
            hasDelivery: result.company.delivery,
        };
    });

    const validPrices = filteredOffers.filter(o => o.priceFrom > 0).map(o => o.priceFrom);
    const avgPrice = validPrices.length > 0
        ? Math.round(validPrices.reduce((sum, price) => sum + price, 0) / validPrices.length)
        : null;
    const deliveryTotals = comparisonRows.filter((r) => r.hasDelivery && r.total !== null).map((r) => r.total as number);
    const minDeliveryTotal = deliveryTotals.length > 0 ? Math.min(...deliveryTotals) : null;
    const fallbackTotals = comparisonRows.filter((r) => r.total !== null).map((r) => r.total as number);
    const minFallbackTotal = fallbackTotals.length > 0 ? Math.min(...fallbackTotals) : null;
    const summaryUnit = comparisonRows[0]?.priceUnit || parsed?.unit || '';

    // --- Parsed quantity ---
    const requestedQuantity = parsed?.volume ? Number(parsed.volume.replace(',', '.')) : NaN;
    const hasRequestedQuantity = !Number.isNaN(requestedQuantity) && requestedQuantity > 0;
    const requestedUnit = normalizeUnit(parsed?.unit);
    const isAggregatesCategory = parsed?.categoryId === 'aggregates';

    // --- Event handlers ---
    const openRequestForm = () => {
        if (!ensureAuthorized()) return;
        trackEvent('request_started', { source: 'search_results', mode: 'smart_request', has_query: Boolean(parsed?.originalQuery) });
        setRequestSent(false);
        setShowRequestForm(true);
        setTimeout(() => requestFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
    };

    const handleProductToggle = (companyId: string, productId: string) => {
        setSelectedProductIdsByCompany((prev) => {
            const current = prev[companyId] ?? [];
            return {
                ...prev,
                [companyId]: current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId],
            };
        });
    };

    const handleGuestSubmit = async (offer: ProductOffer) => {
        if (!guestForm.name.trim() || !guestForm.phone.trim()) { alert('Укажите имя и телефон'); return; }
        setGuestSubmitting(true);
        try {
            const basePayload = buildRequestPayload(offer.companyId, {
                extraProductId: offer.productId, address: guestForm.address || undefined,
                sellerName: guestSeller?.name || offer.companyName, sellerType: guestSeller?.type || 'producer',
            });
            const quantityLine = guestForm.quantity ? `\nКоличество: ${guestForm.quantity}` : '';
            const guestContactLine = `\nКонтакт гостя: ${guestForm.name}, ${guestForm.phone}`;

            const guestRes = await fetch('/api/guest-requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: guestForm.name, phone: guestForm.phone, quantity: guestForm.quantity,
                    address: guestForm.address, query: basePayload.query, companyName: offer.companyName,
                    productName: offer.productName, sellerName: guestSeller?.name || offer.companyName,
                    city: parsed?.city || 'Шымкент',
                }),
            });

            if (!guestRes.ok) {
                const err = await guestRes.json().catch(() => ({}));
                trackEvent('request_submit_failed', { source: 'guest_inline', company_id: offer.companyId, product_id: offer.productId });
                alert(err.error || 'Не удалось отправить гостевую заявку');
                return;
            }

            trackEvent('request_submitted', { source: 'guest_inline', company_id: offer.companyId, product_id: offer.productId, seller_type: guestSeller?.type || 'producer' });
            setGuestSent(true);
            setGuestOfferId(`${offer.companyId}:${offer.productId}`);
            sessionStorage.setItem(REQUEST_INTENT_KEY, JSON.stringify({
                payload: {
                    ...basePayload,
                    query: `${basePayload.query}${quantityLine}${guestContactLine}`,
                    address: guestForm.address || basePayload.address,
                },
            } satisfies PendingAuthIntent));
        } finally {
            setGuestSubmitting(false);
        }
    };

    const makeGuestAuthHandler = (offer: ProductOffer, mode: 'login' | 'register') => () => {
        const payload = buildRequestPayload(offer.companyId, {
            extraProductId: offer.productId, address: guestForm.address || undefined,
            sellerName: guestSeller?.name || offer.companyName, sellerType: guestSeller?.type || 'producer',
        });
        saveIntentAndRedirectToAuth(
            { ...payload, query: `${payload.query}\nКонтакт гостя: ${guestForm.name || '—'}, ${guestForm.phone || '—'}` },
            mode
        );
    };

    const selectedOffers = useMemo(() => {
        const selected = new Set(Object.entries(selectedProductIdsByCompany).flatMap(([, ids]) => ids));
        return filteredOffers.filter((offer) => selected.has(offer.productId));
    }, [filteredOffers, selectedProductIdsByCompany]);

    // --- Grouping & Dynamic Columns ---
    const groupedResults = useMemo(() => {
        const groups: Record<string, ProductOffer[]> = {};
        filteredOffers.forEach((offer) => {
            if (!groups[offer.productId]) groups[offer.productId] = [];
            groups[offer.productId].push(offer);
        });
        // Sort each group by price
        Object.values(groups).forEach(group => {
            group.sort((a, b) => (a.priceFrom || 999999) - (b.priceFrom || 999999));
        });
        // Sort groups by best price in each
        return Object.values(groups).sort((a, b) => (a[0].priceFrom || 999999) - (b[0].priceFrom || 999999));
    }, [filteredOffers]);

    const dynamicSpecKeys = useMemo(() => {
        if (filteredOffers.length === 0) return [];
        const keyCounts: Record<string, number> = {};
        filteredOffers.forEach(offer => {
            if (offer.productSpecs) {
                Object.keys(offer.productSpecs).forEach(k => {
                    keyCounts[k] = (keyCounts[k] || 0) + 1;
                });
            }
        });
        // Sort keys by frequency and take top 3
        return Object.entries(keyCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([k]) => k)
            .slice(0, 3);
    }, [filteredOffers]);

    const keyNamesMap: Record<string, string> = {
        diameter: 'Диаметр',
        class: 'Класс',
        steel: 'Сталь',
        weight: 'Вес',
        dimensions: 'Размеры',
        thickness: 'Толщина',
        grade: 'Марка/Класс',
        length: 'Длина',
        width: 'Ширина',
        height: 'Высота'
    };

    return (
        <div className="page">
            <div className="container">
                <div className={styles.searchTop}>
                    <SearchBar initialQuery={q} />
                </div>

                {loading && (
                    <div className={styles.loading}>
                        <div className={styles.loadingDots}><span></span><span></span><span></span></div>
                        <p>{isCategoryBrowseOnly ? 'Загрузка...' : 'AI анализирует ваш запрос...'}</p>
                    </div>
                )}

                {!loading && (
                    <>
                        {parsed && q.trim() && !isCategoryBrowseOnly && (
                            <AiInsightPanel
                                parsed={parsed}
                                avgPrice={avgPrice}
                                minDeliveryTotal={minDeliveryTotal}
                                minFallbackTotal={minFallbackTotal}
                                summaryUnit={summaryUnit}
                                filteredOffersCount={filteredOffers.length}
                                onQuickButtonClick={(newQuery) => {
                                    const params = new URLSearchParams(searchParams.toString());
                                    params.set('q', newQuery);
                                    router.push(`/search?${params.toString()}`);
                                }}
                            />
                        )}

                        {subCategories.length > 0 && (
                            <div className={`${styles.subCategoriesWrap} ${isDirectoryHub ? styles.directoryHubMode : ''}`}>
                                <h3>{isDirectoryHub ? 'Выберите подкатегорию:' : 'Уточните категорию:'}</h3>
                                <div className={styles.subCategoriesGrid}>
                                    {subCategories.map(cat => (
                                        <Link key={cat.id} href={`/catalog/${cat.slug || cat.id}`} className={styles.subCategoryCard}>
                                            <span className={styles.subCategoryIcon}>{cat.icon || '📦'}</span>
                                            {cat.nameRu}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {!isDirectoryHub && (
                            <>
                                <div className={styles.resultsHeader}>
                                    <h2>
                                        Найдено {groupedResults.length} товар{groupedResults.length === 1 ? '' : groupedResults.length < 5 ? 'а' : 'ов'}
                                    </h2>
                                    <div className={styles.resultsHeaderActions}>
                                        {requestSent && (
                                            <span className="badge badge-success" style={{ padding: '8px 16px', fontSize: '0.88rem' }}>
                                                ✓ Заявка отправлена!
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {showRequestForm && (
                                    <div ref={requestFormRef}>
                                        <SmartRequestForm
                                            requestForm={requestForm}
                                            onFormChange={setRequestForm}
                                            onSubmit={() => submitRequest(null, { address: requestForm.address, deadline: requestForm.deadline, closeForm: true })}
                                            submitting={requestSubmitting}
                                        />
                                    </div>
                                )}

                                <div className={styles.resultsLayout}>
                                    <div className={styles.sidebar}>
                                        <SearchFilters
                                            onlyDelivery={onlyDelivery}
                                            setOnlyDelivery={setOnlyDelivery}
                                            inStockOnly={inStockOnly}
                                            setInStockOnly={setInStockOnly}
                                            withImageOnly={withImageOnly}
                                            setWithImageOnly={setWithImageOnly}
                                            withArticleOnly={withArticleOnly}
                                            setWithArticleOnly={setWithArticleOnly}
                                            brandFilter={brandFilter}
                                            setBrandFilter={setBrandFilter}
                                            sortBy={sortBy}
                                            setSortBy={setSortBy}
                                            viewMode={viewMode}
                                            setViewMode={setViewMode}
                                        />
                                    </div>
                                    <div className={styles.resultsMain}>
                                        {viewMode === 'list' ? (
                                            <div className={styles.tableWrap}>
                                                <table className={styles.offersTable}>
                                                    <thead>
                                                        <tr>
                                                            <th>Товар</th>
                                                            {dynamicSpecKeys.map(key => (
                                                                <th key={key}>{keyNamesMap[key] || key}</th>
                                                            ))}
                                                            <th>Цена за ед.</th>
                                                            <th>Предложений</th>
                                                            <th></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {groupedResults.map((group) => {
                                                            const master = group[0];
                                                            const bestPrice = master.priceFrom;
                                                            const offerCount = group.length;
                                                            const isPriceOnRequest = bestPrice <= 0 || (master.priceUnit || '').toLowerCase().includes('запрос');
                                                            const isIntercity = !!(master.companyAddress && !master.companyAddress.toLowerCase().includes((parsed?.city || 'алматы').toLowerCase()));

                                                            return (
                                                                <tr key={master.productId} className={styles.masterRow}>
                                                                    <td>
                                                                        <div className={styles.tableProduct}>
                                                                            <Link href={`/product/${master.productSlug || master.productId}`} className={styles.tableThumbWrap}>
                                                                                <img
                                                                                    src={master.imageUrl || '/images/catalog/materials.jpg'}
                                                                                    alt={master.productName}
                                                                                    className={styles.tableThumb}
                                                                                    loading="lazy"
                                                                                />
                                                                            </Link>
                                                                            <div>
                                                                                <Link href={`/product/${master.productSlug || master.productId}`} className={styles.tableTitleLink}>
                                                                                    <div className={styles.tableTitle}>
                                                                                        {master.productName}
                                                                                        {isIntercity && (
                                                                                            <span className={styles.intercityBadge} title={`Доставка из: ${master.companyAddress}`}>
                                                                                                🚛 Межгород
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                </Link>
                                                                                <div className={styles.tableSub}>{master.productBrand || 'Westroy'}</div>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    {dynamicSpecKeys.map(key => (
                                                                        <td key={key}>
                                                                            {master.productSpecs?.[key] ? String(master.productSpecs[key]) : '—'}
                                                                        </td>
                                                                    ))}
                                                                    <td className={styles.priceCol}>
                                                                        {isPriceOnRequest ? (
                                                                            <span className={styles.priceOnRequest}>По запросу</span>
                                                                        ) : (
                                                                            <>
                                                                                <span className={styles.priceAmount}>{formatPrice(bestPrice)} ₸</span>
                                                                                <span className={styles.priceUnit}> / {master.priceUnit}</span>
                                                                            </>
                                                                        )}
                                                                    </td>
                                                                    <td>
                                                                        <span className={styles.offerCountLabel}>
                                                                            {offerCount} {offerCount === 1 ? 'цена' : offerCount < 5 ? 'цены' : 'цен'}
                                                                        </span>
                                                                    </td>
                                                                    <td>
                                                                        <Link href={`/product/${master.productSlug || master.productId}`} className="btn btn-sm btn-ghost">
                                                                            Смотреть
                                                                        </Link>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <div className={viewMode === 'grid-3' ? styles.offersGrid3 : styles.offersGrid}>
                                                {groupedResults.map((group, i) => {
                                                    const master = group[0];
                                                    const offerCount = group.length;
                                                    // In Grid mode, we still show the "Master" product card, but we show multiple prices if applicable
                                                    return (
                                                        <OfferCard
                                                            key={master.productId}
                                                            offer={master}
                                                            index={i}
                                                            isSelected={false} // Selection is now handled in SKU page
                                                            showGuestInline={false}
                                                            guestForm={guestForm}
                                                            setGuestForm={setGuestForm}
                                                            guestSent={guestSent}
                                                            guestSubmitting={guestSubmitting}
                                                            guestSeller={null}
                                                            requestedQuantity={requestedQuantity}
                                                            hasRequestedQuantity={hasRequestedQuantity}
                                                            requestedUnit={requestedUnit}
                                                            isAggregatesCategory={isAggregatesCategory}
                                                            viewMode={viewMode}
                                                            onToggleProduct={() => { }} // Disabled here
                                                            onGuestSubmit={() => { }}
                                                            onGuestRegister={() => { }}
                                                            onGuestLogin={() => { }}
                                                            onGuestContinue={() => { }}
                                                            onGuestPostRegister={() => { }}
                                                            multiOfferCount={offerCount}
                                                            isIntercity={!!(master.companyAddress && !master.companyAddress.toLowerCase().includes((parsed?.city || 'алматы').toLowerCase()))}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                    <aside className={styles.requestBasket}>
                                        <div className={styles.basketCard}>
                                            <h3>Заявка</h3>
                                            <p>{selectedOffers.length} позиц{selectedOffers.length === 1 ? 'ия' : selectedOffers.length < 5 ? 'ии' : 'ий'} выбрано</p>
                                            <div className={styles.basketList}>
                                                {selectedOffers.slice(0, 6).map((offer) => (
                                                    <div key={`basket-${offer.productId}`} className={styles.basketItem}>
                                                        <span>{offer.productName}</span>
                                                        <button type="button" onClick={() => handleProductToggle(offer.companyId, offer.productId)}>×</button>
                                                    </div>
                                                ))}
                                                {selectedOffers.length > 6 && <div className={styles.basketMore}>+ еще {selectedOffers.length - 6}</div>}
                                            </div>
                                            <button
                                                className="btn btn-primary"
                                                onClick={() => submitRequest(null)}
                                                disabled={requestSubmitting || selectedOffers.length === 0}
                                            >
                                                📨 {requestSubmitting ? 'Отправляем...' : 'Отправить заявку'}
                                            </button>
                                            <button
                                                className="btn btn-secondary"
                                                onClick={openRequestForm}
                                                disabled={requestSubmitting}
                                            >
                                                Уточнить детали
                                            </button>
                                        </div>
                                    </aside>
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
