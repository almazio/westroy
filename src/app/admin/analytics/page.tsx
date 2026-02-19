'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

type AnalyticsResponse = {
    summary: {
        total: number;
        hubToAppClicks: number;
        uniquePages: number;
    };
    topPlacements: Array<{ placement: string; count: number }>;
    recentEvents: Array<{ eventName: string; pageUrl: string; ts: string; payload: Record<string, unknown> }>;
};

export default function AdminAnalyticsPage() {
    const [data, setData] = useState<AnalyticsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch('/api/admin/analytics/hub');
                const body = await res.json();
                if (!res.ok) throw new Error(body?.error || 'Failed to load analytics');
                setData(body);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load analytics');
            } finally {
                setLoading(false);
            }
        };

        void load();
    }, []);

    return (
        <div className={styles.pageWrap}>
            <div className="container">
                <div className={styles.header}>
                    <h1>Hub Analytics</h1>
                    <p>События из Hub: клики в приложение и поведение CTA.</p>
                    <div style={{ marginTop: 10 }}>
                        <Link href="/admin" className="btn btn-ghost btn-sm">← Назад в админку</Link>
                    </div>
                </div>

                {loading && <div className={styles.muted}>Загрузка...</div>}
                {error && <div className={styles.muted}>Ошибка: {error}</div>}

                {!loading && !error && data && (
                    <>
                        <div className={styles.metrics}>
                            <div className={styles.metric}>
                                <span>Всего событий</span>
                                <strong>{data.summary.total}</strong>
                            </div>
                            <div className={styles.metric}>
                                <span>Переходов в app</span>
                                <strong>{data.summary.hubToAppClicks}</strong>
                            </div>
                            <div className={styles.metric}>
                                <span>Уникальных страниц Hub</span>
                                <strong>{data.summary.uniquePages}</strong>
                            </div>
                        </div>

                        <section className={styles.section}>
                            <h3>Топ размещений CTA</h3>
                            {data.topPlacements.length === 0 ? (
                                <div className={styles.muted}>Нет данных</div>
                            ) : (
                                <div className={styles.list}>
                                    {data.topPlacements.map((item) => (
                                        <div key={item.placement} className={styles.row}>
                                            <span>{item.placement}</span>
                                            <strong>{item.count}</strong>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        <section className={styles.section}>
                            <h3>Последние события</h3>
                            {data.recentEvents.length === 0 ? (
                                <div className={styles.muted}>Событий пока нет</div>
                            ) : (
                                <div className={styles.tableWrap}>
                                    <table className={styles.table}>
                                        <thead>
                                            <tr>
                                                <th>Время</th>
                                                <th>Событие</th>
                                                <th>Страница</th>
                                                <th>Payload</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.recentEvents.map((event, index) => (
                                                <tr key={`${event.ts}-${index}`}>
                                                    <td>{event.ts ? new Date(event.ts).toLocaleString('ru-RU') : '—'}</td>
                                                    <td>{event.eventName}</td>
                                                    <td>{event.pageUrl || '—'}</td>
                                                    <td><code>{JSON.stringify(event.payload)}</code></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>
                    </>
                )}
            </div>
        </div>
    );
}

