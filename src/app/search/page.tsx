'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import SearchBar from '@/components/SearchBar';
import styles from './page.module.css';

interface SearchResultData {
    company: {
        id: string; name: string; description: string; delivery: boolean;
        verified: boolean; address: string; phone: string;
    };
    products: { id: string; name: string; priceFrom: number; priceUnit: string; unit: string }[];
    priceFrom: number;
    priceUnit: string;
    relevanceScore: number;
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
            setLoading(false);
        }
        if (q || categoryParam) fetchResults();
    }, [q, categoryParam]);

    const handleChipClick = (value: string) => {
        router.push(`/search?q=${encodeURIComponent(q)}&category=${value}`);
    };

    const { data: session } = useSession();

    const handleSendRequest = async () => {
        if (!parsed) return;
        if (!session?.user?.id) {
            alert('Пожалуйста, войдите в систему, чтобы отправить заявку');
            return;
        }

        try {
            const res = await fetch('/api/requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    categoryId: parsed.categoryId,
                    query: parsed.originalQuery,
                    parsedCategory: parsed.category,
                    parsedVolume: parsed.volume ? `${parsed.volume} ${parsed.unit || ''}`.trim() : undefined,
                    parsedCity: parsed.city,
                    deliveryNeeded: Boolean(parsed.delivery || false),
                    address: requestForm.address,
                    deadline: requestForm.deadline,
                }),
            });

            if (res.ok) {
                setRequestSent(true);
                setShowRequestForm(false);
            } else {
                const err = await res.json();
                console.error('Failed to send request:', err);
                alert(`Ошибка при отправке заявки: ${err.details || err.error}`);
            }
        } catch (e) {
            console.error('Error sending request:', e);
            alert('Произошла ошибка при отправке заявки. Попробуйте позже.');
        }
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('ru-RU').format(price);
    };

    return (
        <div className="page">
            <div className="container">
                {/* Search bar at top */}
                <div className={styles.searchTop}>
                    <SearchBar initialQuery={q} />
                </div>

                {/* Parsed query summary */}
                {parsed && !loading && (
                    <div className={styles.parsedSummary}>
                        <div className={styles.parsedTags}>
                            {parsed.category && (
                                <span className={styles.parsedTag}>
                                    📦 {parsed.category}
                                </span>
                            )}
                            {parsed.grade && (
                                <span className={styles.parsedTag}>
                                    🏷️ {parsed.grade}
                                </span>
                            )}
                            {parsed.volume && (
                                <span className={styles.parsedTag}>
                                    📐 {parsed.volume} {parsed.unit || ''}
                                </span>
                            )}
                            {parsed.city && (
                                <span className={styles.parsedTag}>
                                    📍 {parsed.city}
                                </span>
                            )}
                            {parsed.delivery && (
                                <span className={styles.parsedTag}>
                                    🚚 С доставкой
                                </span>
                            )}
                        </div>

                        {/* Confidence indicator */}
                        {parsed.confidence < 0.5 && (
                            <div className={styles.lowConfidence}>
                                ⚠️ AI не до конца уверен в разборе запроса. Уточните:
                            </div>
                        )}

                        {/* Clarification chips */}
                        {(parsed.suggestions?.length ?? 0) > 0 && parsed.confidence < 0.7 && (
                            <div className={styles.suggestions}>
                                {parsed.suggestions
                                    .filter(s => s.type === 'category')
                                    .map((s, i) => (
                                        <button
                                            key={i}
                                            className={styles.suggestionChip}
                                            onClick={() => handleChipClick(s.value)}
                                        >
                                            {s.label}
                                        </button>
                                    ))}
                            </div>
                        )}
                    </div>
                )}

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
                        <div className={styles.resultsHeader}>
                            <h2>Найдено {results.length} производител{results.length === 1 ? 'ь' : results.length < 5 ? 'я' : 'ей'}</h2>
                            {results.length > 0 && !requestSent && (
                                <button
                                    className="btn btn-primary"
                                    onClick={() => setShowRequestForm(!showRequestForm)}
                                >
                                    📨 Получить точные предложения
                                </button>
                            )}
                            {requestSent && (
                                <span className="badge badge-success" style={{ padding: '8px 16px', fontSize: '0.88rem' }}>
                                    ✓ Заявка отправлена!
                                </span>
                            )}
                        </div>

                        {/* Smart Request Form */}
                        {showRequestForm && (
                            <div className={styles.requestForm}>
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
                                <button className="btn btn-primary btn-lg" onClick={handleSendRequest}>
                                    Отправить заявку производителям
                                </button>
                            </div>
                        )}

                        {/* Result cards */}
                        <div className={styles.resultsList}>
                            {results.map((result, i) => (
                                <div key={result.company.id} className={styles.resultCard} style={{ animationDelay: `${i * 0.06}s` }}>
                                    <div className={styles.resultMain}>
                                        <div className={styles.resultHeader}>
                                            <div className={styles.resultAvatar}>
                                                {result.company.name.charAt(0)}
                                            </div>
                                            <div>
                                                <Link href={`/company/${result.company.id}`} className={styles.resultName}>
                                                    {result.company.name}
                                                </Link>
                                                <div className={styles.resultBadges}>
                                                    {result.company.delivery && <span className="badge badge-success">🚚 Доставка</span>}
                                                    {result.company.verified && <span className="badge badge-info">✓ Проверен</span>}
                                                </div>
                                            </div>
                                        </div>

                                        <p className={styles.resultDesc}>{result.company.description}</p>

                                        {/* Products */}
                                        {result.products.length > 0 && (
                                            <div className={styles.resultProducts}>
                                                {result.products.slice(0, 3).map(product => (
                                                    <div key={product.id} className={styles.productChip}>
                                                        <span>{product.name}</span>
                                                        <span className={styles.productPrice}>
                                                            от {formatPrice(product.priceFrom)} ₸ {product.priceUnit}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className={styles.resultPrice}>
                                        <div className={styles.priceLabel}>Цена от</div>
                                        <div className={styles.priceValue}>{formatPrice(result.priceFrom)} ₸</div>
                                        <div className={styles.priceUnit}>{result.priceUnit}</div>
                                        <Link href={`/company/${result.company.id}`} className="btn btn-secondary btn-sm mt-8">
                                            Подробнее
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {results.length === 0 && (
                            <div className={styles.empty}>
                                <p>Ничего не найдено. Попробуйте изменить запрос.</p>
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
