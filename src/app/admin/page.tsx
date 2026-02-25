'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import styles from './page.module.css';
import type {
    CategoryRef, CompanyData, RequestData, OfferData, UserData,
    PartnerApplicationData, CatalogQualityData, IntegrationSyncLog,
} from './types';

import { CompaniesTab } from './components/CompaniesTab';
import { UsersTab } from './components/UsersTab';
import { RequestsTab } from './components/RequestsTab';
import { CategoriesTab } from './components/CategoriesTab';
import { PartnerApplicationsTab } from './components/PartnerApplicationsTab';
import { CatalogQualityTab } from './components/CatalogQualityTab';
import { IntegrationLogsTab } from './components/IntegrationLogsTab';
import { WebImportsTab } from './components/WebImportsTab';

export default function AdminPanel() {
    const [tab, setTab] = useState<'companies' | 'users' | 'requests' | 'categories' | 'partnerApplications' | 'catalogQuality' | 'integrations' | 'webImports'>('companies');
    const [companies, setCompanies] = useState<CompanyData[]>([]);
    const [users, setUsers] = useState<UserData[]>([]);
    const [requests, setRequests] = useState<RequestData[]>([]);
    const [offers, setOffers] = useState<OfferData[]>([]);
    const [categories, setCategories] = useState<CategoryRef[]>([]);
    const [partnerApplications, setPartnerApplications] = useState<PartnerApplicationData[]>([]);
    const [catalogQuality, setCatalogQuality] = useState<CatalogQualityData | null>(null);
    const [integrationLogs, setIntegrationLogs] = useState<IntegrationSyncLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadErrors, setLoadErrors] = useState<string[]>([]);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
        void loadData();
        void loadSession();
    }, []);

    const loadSession = async () => {
        try {
            const res = await fetch('/api/auth/session');
            if (!res.ok) return;
            const data = await res.json();
            setCurrentUserId(data?.user?.id || null);
        } catch {
            setCurrentUserId(null);
        }
    };

    const loadData = async () => {
        setLoading(true);
        setLoadErrors([]);
        try {
            const results = await Promise.allSettled([
                fetch('/api/companies').then(async (r) => ({ ok: r.ok, key: 'companies', data: await r.json() })),
                fetch('/api/users').then(async (r) => ({ ok: r.ok, key: 'users', data: await r.json() })),
                fetch('/api/requests').then(async (r) => ({ ok: r.ok, key: 'requests', data: await r.json() })),
                fetch('/api/categories').then(async (r) => ({ ok: r.ok, key: 'categories', data: await r.json() })),
                fetch('/api/offers').then(async (r) => ({ ok: r.ok, key: 'offers', data: await r.json() })),
                fetch('/api/partner-applications').then(async (r) => ({ ok: r.ok, key: 'partnerApplications', data: await r.json() })),
                fetch('/api/catalog/quality').then(async (r) => ({ ok: r.ok, key: 'catalogQuality', data: await r.json() })),
                fetch('/api/integrations/onec/sync').then(async (r) => ({ ok: r.ok, key: 'integrationLogs', data: await r.json() })),
            ]);

            const errors: string[] = [];

            for (const item of results) {
                if (item.status === 'rejected') {
                    errors.push('network');
                    continue;
                }

                const { ok, key, data } = item.value;
                if (!ok) {
                    const message = data?.error || 'unknown';
                    errors.push(`${key}:${message}`);
                    continue;
                }

                if (key === 'companies') setCompanies(data);
                if (key === 'users') setUsers(data);
                if (key === 'requests') setRequests(data);
                if (key === 'categories') setCategories(data);
                if (key === 'offers') setOffers(data);
                if (key === 'partnerApplications') setPartnerApplications(Array.isArray(data) ? data : []);
                if (key === 'catalogQuality') setCatalogQuality(data);
                if (key === 'integrationLogs') setIntegrationLogs(Array.isArray(data?.logs) ? data.logs : []);
            }

            setLoadErrors(errors);
        } catch (error) {
            console.error('Failed to load admin data:', error);
            setLoadErrors(['fatal:failed to load data']);
        } finally {
            setLoading(false);
        }
    };

    const analytics = useMemo(() => {
        const accepted = offers.filter((o) => o.status === 'accepted').length;
        const pending = offers.filter((o) => o.status === 'pending').length;
        const conversion = offers.length > 0 ? Math.round((accepted / offers.length) * 100) : 0;
        const inProgressRequests = requests.filter((r) => r.status === 'in_progress').length;
        const verifiedCompanies = companies.filter((c) => c.verified).length;

        return {
            accepted,
            pending,
            conversion,
            inProgressRequests,
            verifiedCompanies,
        };
    }, [companies, offers, requests]);

    const webImportRows = useMemo(() => {
        const sourceRegex = /Источник:\s*(https?:\/\/\S+)/i;
        return companies
            .map((company) => {
                const source = company.description?.match(sourceRegex)?.[1] || '';
                if (!source) return null;
                const category = categories.find((cat) => cat.id === company.categoryId);
                return {
                    id: company.id,
                    name: company.name,
                    source,
                    categoryLabel: `${category?.icon || ''} ${category?.nameRu || company.categoryId}`.trim(),
                    updatedAt: company.updatedAt || company.createdAt || '',
                };
            })
            .filter((row): row is { id: string; name: string; source: string; categoryLabel: string; updatedAt: string } => Boolean(row))
            .sort((a, b) => {
                const left = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
                const right = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
                return right - left;
            });
    }, [categories, companies]);





    return (
        <div className="page">
            <div className="container">
                <div className={styles.header}>
                    <div>
                        <h1>Админ-панель</h1>
                        <p className="text-secondary">Управление компаниями, аккаунтами и оперативной аналитикой</p>
                    </div>
                    <div className={styles.headerActions}>
                        <Link href="/admin/knowledge" className="btn btn-secondary">База знаний KZ</Link>
                    </div>
                </div>

                <div className={styles.stats}>
                    <div className={styles.statCard}>
                        <div className={styles.statValue}>{companies.length}</div>
                        <div className={styles.statLabel}>Компании</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statValue}>{users.length}</div>
                        <div className={styles.statLabel}>Пользователи</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statValue}>{requests.length}</div>
                        <div className={styles.statLabel}>Заявки</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statValue}>{analytics.conversion}%</div>
                        <div className={styles.statLabel}>Конверсия</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statValue}>{partnerApplications.length}</div>
                        <div className={styles.statLabel}>Партнерские заявки</div>
                    </div>
                </div>

                <div className={styles.analyticsRow}>
                    <div className={styles.metric}><span>Принятые офферы</span><strong>{analytics.accepted}</strong></div>
                    <div className={styles.metric}><span>Ожидающие офферы</span><strong>{analytics.pending}</strong></div>
                    <div className={styles.metric}><span>Заявки в работе</span><strong>{analytics.inProgressRequests}</strong></div>
                    <div className={styles.metric}><span>Верифицированные компании</span><strong>{analytics.verifiedCompanies}</strong></div>
                </div>

                <div className={styles.tabs}>
                    {(['companies', 'users', 'requests', 'categories', 'partnerApplications', 'catalogQuality', 'integrations', 'webImports'] as const).map((t) => (
                        <button
                            key={t}
                            className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`}
                            onClick={() => setTab(t)}
                        >
                            {t === 'companies' && 'Компании'}
                            {t === 'users' && 'Пользователи'}
                            {t === 'requests' && 'Заявки'}
                            {t === 'categories' && 'Категории'}
                            {t === 'partnerApplications' && 'Партнеры'}
                            {t === 'catalogQuality' && 'Качество каталога'}
                            {t === 'integrations' && 'Интеграции'}
                            {t === 'webImports' && 'Web imports'}
                        </button>
                    ))}
                </div>

                {loading && <div className="loading">Загрузка...</div>}
                {!loading && loadErrors.length > 0 && (
                    <div className={styles.warningBox}>
                        Некоторые блоки не загрузились: {loadErrors.join(', ')}
                    </div>
                )}

                {!loading && tab === 'companies' && <CompaniesTab companies={companies} categories={categories} setCompanies={setCompanies} />}
                {!loading && tab === 'users' && <UsersTab users={users} setUsers={setUsers} currentUserId={currentUserId} />}
                {!loading && tab === 'requests' && <RequestsTab requests={requests} />}
                {!loading && tab === 'categories' && <CategoriesTab categories={categories} />}
                {!loading && tab === 'partnerApplications' && <PartnerApplicationsTab partnerApplications={partnerApplications} setPartnerApplications={setPartnerApplications} />}
                {!loading && tab === 'catalogQuality' && <CatalogQualityTab catalogQuality={catalogQuality} />}
                {!loading && tab === 'integrations' && <IntegrationLogsTab integrationLogs={integrationLogs} />}
                {!loading && tab === 'webImports' && <WebImportsTab webImportRows={webImportRows} />}
            </div>
        </div>
    );
}
