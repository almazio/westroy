'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './page.module.css';
import { trackEvent } from '@/lib/analytics';

interface CategoryRef {
    id: string;
    nameRu: string;
    icon: string;
}

interface CompanyData {
    id: string;
    name: string;
    description: string;
    categoryId: string;
    verified: boolean;
    delivery: boolean;
    phone: string;
    address: string;
    createdAt?: string;
    updatedAt?: string;
    _count?: {
        products: number;
        offers: number;
    };
}

interface RequestData {
    id: string;
    query: string;
    parsedCategory: string;
    status: string;
    createdAt: string;
    offerCount: number;
}

interface OfferData {
    id: string;
    status: 'pending' | 'accepted' | 'rejected';
}

interface UserData {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: 'client' | 'producer' | 'admin';
    createdAt: string;
    company?: { id: string; name: string } | null;
    _count?: { requests: number };
}

interface PartnerApplicationData {
    id: string;
    name: string;
    email: string;
    phone: string;
    companyName: string;
    category: string;
    city: string;
    message: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
}

interface CompanyEditForm {
    name: string;
    description: string;
    phone: string;
    address: string;
    delivery: boolean;
}

interface UserCreateForm {
    name: string;
    email: string;
    phone: string;
    password: string;
    role: 'client' | 'producer' | 'admin';
}

interface UserEditForm {
    name: string;
    phone: string;
    role: 'client' | 'producer' | 'admin';
    password: string;
}

interface CatalogQualityData {
    totals: {
        products: number;
        companies: number;
        companiesWithoutProducts: number;
    };
    quality: {
        missingDescription: number;
        missingPriceUnit: number;
        invalidPrice: number;
        invalidUnit: number;
        staleProducts: number;
        outOfStock: number;
    };
    staleDays: number;
    samples: {
        companiesWithoutProducts: Array<{ id: string; name: string }>;
    };
}

interface IntegrationSyncLog {
    id: string;
    createdAt: string;
    source: string;
    companyId: string;
    totalReceived: number;
    created: number;
    updated: number;
    skipped: number;
    errors: string[];
}

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

    const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
    const [companyForm, setCompanyForm] = useState<CompanyEditForm>({
        name: '',
        description: '',
        phone: '',
        address: '',
        delivery: false,
    });

    const [creatingUser, setCreatingUser] = useState(false);
    const [createUserForm, setCreateUserForm] = useState<UserCreateForm>({
        name: '',
        email: '',
        phone: '',
        password: '',
        role: 'client',
    });
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [userForm, setUserForm] = useState<UserEditForm>({
        name: '',
        phone: '',
        role: 'client',
        password: '',
    });

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

    const startCompanyEdit = (company: CompanyData) => {
        setEditingCompanyId(company.id);
        setCompanyForm({
            name: company.name,
            description: company.description || '',
            phone: company.phone,
            address: company.address,
            delivery: company.delivery,
        });
    };

    const saveCompany = async (companyId: string) => {
        try {
            const res = await fetch(`/api/companies/${companyId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(companyForm),
            });
            if (!res.ok) throw new Error('Failed to update company');

            setCompanies((prev) =>
                prev.map((company) => (company.id === companyId ? { ...company, ...companyForm } : company))
            );
            trackEvent('admin_action', { action: 'company_update', company_id: companyId });
            setEditingCompanyId(null);
        } catch (error) {
            console.error('Failed to update company:', error);
            alert('Не удалось сохранить изменения компании');
        }
    };

    const deleteCompany = async (companyId: string) => {
        if (!window.confirm('Удалить компанию?')) return;
        try {
            const res = await fetch(`/api/companies/${companyId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete company');
            setCompanies((prev) => prev.filter((c) => c.id !== companyId));
            trackEvent('admin_action', { action: 'company_delete', company_id: companyId });
        } catch (error) {
            console.error('Failed to delete company:', error);
            alert('Не удалось удалить компанию');
        }
    };

    const createUser = async () => {
        setCreatingUser(true);
        try {
            if (!createUserForm.name.trim() || !createUserForm.email.trim() || !createUserForm.phone.trim() || !createUserForm.password.trim()) {
                throw new Error('Заполните имя, email, телефон и пароль');
            }

            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(createUserForm),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed');
            }
            const created: UserData = await res.json();
            setUsers((prev) => [created, ...prev]);
            trackEvent('admin_action', { action: 'user_create', user_id: created.id, role: created.role });
            setCreateUserForm({
                name: '',
                email: '',
                phone: '',
                password: '',
                role: 'client',
            });
        } catch (error) {
            console.error('Failed to create user:', error);
            alert(error instanceof Error ? error.message : 'Не удалось создать пользователя');
        } finally {
            setCreatingUser(false);
        }
    };

    const startUserEdit = (user: UserData) => {
        setEditingUserId(user.id);
        setUserForm({
            name: user.name,
            phone: user.phone,
            role: user.role,
            password: '',
        });
    };

    const saveUser = async (userId: string) => {
        try {
            const res = await fetch(`/api/users/${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userForm),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed');
            }
            const updated: UserData = await res.json();
            setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...updated } : u)));
            trackEvent('admin_action', { action: 'user_update', user_id: userId, role: updated.role });
            setEditingUserId(null);
        } catch (error) {
            console.error('Failed to update user:', error);
            alert('Не удалось обновить пользователя');
        }
    };

    const deleteUser = async (userId: string) => {
        if (!window.confirm('Удалить пользователя?')) return;
        try {
            const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed');
            }
            setUsers((prev) => prev.filter((u) => u.id !== userId));
            trackEvent('admin_action', { action: 'user_delete', user_id: userId });
        } catch (error) {
            console.error('Failed to delete user:', error);
            alert('Не удалось удалить пользователя');
        }
    };

    const setPartnerApplicationStatus = async (
        applicationId: string,
        status: PartnerApplicationData['status']
    ) => {
        try {
            const res = await fetch(`/api/partner-applications/${applicationId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Failed');
            }
            const data = await res.json();
            const updated: PartnerApplicationData = data?.id ? data : data?.application;
            if (!updated?.id) {
                throw new Error('Invalid response');
            }
            setPartnerApplications((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
            trackEvent('admin_action', { action: 'partner_application_status', application_id: applicationId, status });

            const onboarding = data?.onboarding as
                | {
                    email: string;
                    phone: string;
                    companyName: string;
                    isNewUser: boolean;
                    temporaryPassword: string | null;
                }
                | undefined;

            if (status === 'approved' && onboarding) {
                const passwordInfo = onboarding.temporaryPassword
                    ? `\nВременный пароль: ${onboarding.temporaryPassword}`
                    : '\nПароль: существующий (не менялся)';
                alert(
                    `Партнер одобрен и подключен.\n\nКомпания: ${onboarding.companyName}\nЛогин: ${onboarding.email}\nТелефон: ${onboarding.phone}${passwordInfo}`
                );
            }
        } catch (error) {
            console.error('Failed to update partner application status:', error);
            alert('Не удалось обновить статус заявки');
        }
    };

    const formatDate = (date: string) => new Date(date).toLocaleDateString('ru-RU');

    const requestStatusLabels: Record<string, string> = {
        active: '🟢 Активна',
        in_progress: '🟡 В работе',
        completed: '🔵 Завершена',
        cancelled: '⚫ Отменена',
    };

    return (
        <div className="page">
            <div className="container">
                <div className={styles.header}>
                    <h1>Админ-панель</h1>
                    <p className="text-secondary">Управление компаниями, аккаунтами и оперативной аналитикой</p>
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

                {!loading && tab === 'companies' && (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Компания</th>
                                <th>Категория</th>
                                <th>Контакты</th>
                                <th>Статус</th>
                                <th>Продукты/Офферы</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            {companies.map((company) => {
                                const cat = categories.find((ct) => ct.id === company.categoryId);
                                const isEditing = editingCompanyId === company.id;

                                return (
                                    <tr key={company.id}>
                                        <td>
                                            {isEditing ? (
                                                <div className={styles.editFields}>
                                                    <input className="input" value={companyForm.name} onChange={(e) => setCompanyForm((p) => ({ ...p, name: e.target.value }))} />
                                                    <textarea className="input" value={companyForm.description} onChange={(e) => setCompanyForm((p) => ({ ...p, description: e.target.value }))} />
                                                </div>
                                            ) : (
                                                <>
                                                    <strong>{company.name}</strong>
                                                    <div className="text-muted">{company.description || 'Без описания'}</div>
                                                </>
                                            )}
                                        </td>
                                        <td>{cat?.icon} {cat?.nameRu || company.categoryId}</td>
                                        <td>
                                            {isEditing ? (
                                                <div className={styles.editFields}>
                                                    <input className="input" value={companyForm.phone} onChange={(e) => setCompanyForm((p) => ({ ...p, phone: e.target.value }))} />
                                                    <input className="input" value={companyForm.address} onChange={(e) => setCompanyForm((p) => ({ ...p, address: e.target.value }))} />
                                                </div>
                                            ) : (
                                                <>
                                                    <div>{company.phone}</div>
                                                    <div className="text-muted">{company.address}</div>
                                                </>
                                            )}
                                        </td>
                                        <td>
                                            <div>{company.delivery ? '🚚 Есть доставка' : 'Самовывоз'}</div>
                                            <div>{company.verified ? '✅ Верифицирована' : '⏳ Не верифицирована'}</div>
                                        </td>
                                        <td>{company._count?.products ?? 0} / {company._count?.offers ?? 0}</td>
                                        <td>
                                            <div className={styles.rowActions}>
                                                {isEditing ? (
                                                    <>
                                                        <button className="btn btn-primary btn-sm" onClick={() => void saveCompany(company.id)}>Сохранить</button>
                                                        <button className="btn btn-ghost btn-sm" onClick={() => setEditingCompanyId(null)}>Отмена</button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button className="btn btn-secondary btn-sm" onClick={() => startCompanyEdit(company)}>Изменить</button>
                                                        <button className="btn btn-ghost btn-sm" onClick={() => void deleteCompany(company.id)}>Удалить</button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}

                {!loading && tab === 'users' && (
                    <>
                        <div className={styles.userCreateCard}>
                            <h3>Создать аккаунт</h3>
                            <div className={styles.userCreateGrid}>
                                <input className="input" placeholder="Имя" value={createUserForm.name} onChange={(e) => setCreateUserForm((p) => ({ ...p, name: e.target.value }))} />
                                <input className="input" placeholder="Email" value={createUserForm.email} onChange={(e) => setCreateUserForm((p) => ({ ...p, email: e.target.value }))} />
                                <input className="input" placeholder="Телефон" value={createUserForm.phone} onChange={(e) => setCreateUserForm((p) => ({ ...p, phone: e.target.value }))} />
                                <input className="input" type="password" placeholder="Пароль" value={createUserForm.password} onChange={(e) => setCreateUserForm((p) => ({ ...p, password: e.target.value }))} />
                                <select className="input" value={createUserForm.role} onChange={(e) => setCreateUserForm((p) => ({ ...p, role: e.target.value as UserCreateForm['role'] }))}>
                                    <option value="client">client</option>
                                    <option value="producer">producer</option>
                                    <option value="admin">admin</option>
                                </select>
                                <button className="btn btn-primary" onClick={() => void createUser()} disabled={creatingUser}>
                                    {creatingUser ? 'Создание...' : 'Создать'}
                                </button>
                            </div>
                        </div>

                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Пользователь</th>
                                    <th>Роль</th>
                                    <th>Активность</th>
                                    <th>Дата</th>
                                    <th>Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => {
                                    const isEditing = editingUserId === user.id;
                                    const isSelf = user.id === currentUserId;

                                    return (
                                        <tr key={user.id}>
                                            <td>
                                                {isEditing ? (
                                                    <div className={styles.editFields}>
                                                        <input className="input" value={userForm.name} onChange={(e) => setUserForm((p) => ({ ...p, name: e.target.value }))} />
                                                        <input className="input" value={userForm.phone} onChange={(e) => setUserForm((p) => ({ ...p, phone: e.target.value }))} />
                                                        <input className="input" type="password" placeholder="Новый пароль (опц.)" value={userForm.password} onChange={(e) => setUserForm((p) => ({ ...p, password: e.target.value }))} />
                                                    </div>
                                                ) : (
                                                    <>
                                                        <strong>{user.name}</strong>
                                                        <div className="text-muted">{user.email}</div>
                                                        <div className="text-muted">{user.phone}</div>
                                                    </>
                                                )}
                                            </td>
                                            <td>
                                                {isEditing ? (
                                                    <select className="input" value={userForm.role} onChange={(e) => setUserForm((p) => ({ ...p, role: e.target.value as UserEditForm['role'] }))}>
                                                        <option value="client">client</option>
                                                        <option value="producer">producer</option>
                                                        <option value="admin">admin</option>
                                                    </select>
                                                ) : (
                                                    <span className="badge badge-info">{user.role}</span>
                                                )}
                                            </td>
                                            <td>
                                                <div>Заявок: {user._count?.requests ?? 0}</div>
                                                <div className="text-muted">{user.company ? `Компания: ${user.company.name}` : 'Без компании'}</div>
                                            </td>
                                            <td>{formatDate(user.createdAt)}</td>
                                            <td>
                                                <div className={styles.rowActions}>
                                                    {isEditing ? (
                                                        <>
                                                            <button className="btn btn-primary btn-sm" onClick={() => void saveUser(user.id)}>Сохранить</button>
                                                            <button className="btn btn-ghost btn-sm" onClick={() => setEditingUserId(null)}>Отмена</button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button className="btn btn-secondary btn-sm" onClick={() => startUserEdit(user)}>Изменить</button>
                                                            <button className="btn btn-ghost btn-sm" onClick={() => void deleteUser(user.id)} disabled={isSelf}>
                                                                {isSelf ? 'Это вы' : 'Удалить'}
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </>
                )}

                {!loading && tab === 'requests' && (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Запрос</th>
                                <th>Категория</th>
                                <th>Статус</th>
                                <th>Предложений</th>
                                <th>Дата</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.map((r) => (
                                <tr key={r.id}>
                                    <td><code className={styles.code}>{r.id}</code></td>
                                    <td>{r.query}</td>
                                    <td>{r.parsedCategory}</td>
                                    <td>{requestStatusLabels[r.status] || r.status}</td>
                                    <td>{r.offerCount}</td>
                                    <td>{formatDate(r.createdAt)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {!loading && tab === 'categories' && (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Иконка</th>
                                <th>Название</th>
                                <th>ID</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categories.map((c) => (
                                <tr key={c.id}>
                                    <td className={styles.categoryIcon}>{c.icon}</td>
                                    <td><strong>{c.nameRu}</strong></td>
                                    <td><code className={styles.code}>{c.id}</code></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {!loading && tab === 'partnerApplications' && (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Компания</th>
                                <th>Контакт</th>
                                <th>Категория</th>
                                <th>Город</th>
                                <th>Статус</th>
                                <th>Действия</th>
                                <th>Комментарий</th>
                                <th>Дата</th>
                            </tr>
                        </thead>
                        <tbody>
                            {partnerApplications.map((a) => (
                                <tr key={a.id}>
                                    <td><strong>{a.companyName}</strong></td>
                                    <td>
                                        <div>{a.name}</div>
                                        <div className="text-muted">{a.email}</div>
                                        <div className="text-muted">{a.phone}</div>
                                    </td>
                                    <td>{a.category}</td>
                                    <td>{a.city}</td>
                                    <td>
                                        {a.status === 'pending' && <span className="badge badge-warning">pending</span>}
                                        {a.status === 'approved' && <span className="badge badge-success">approved</span>}
                                        {a.status === 'rejected' && <span className="badge badge-error">rejected</span>}
                                    </td>
                                    <td>
                                        <div className={styles.rowActions}>
                                            <button
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => void setPartnerApplicationStatus(a.id, 'approved')}
                                                disabled={a.status === 'approved'}
                                            >
                                                Одобрить
                                            </button>
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                onClick={() => void setPartnerApplicationStatus(a.id, 'rejected')}
                                                disabled={a.status === 'rejected'}
                                            >
                                                Отклонить
                                            </button>
                                        </div>
                                    </td>
                                    <td className={styles.applicationMessage}>{a.message || '—'}</td>
                                    <td>{formatDate(a.createdAt)}</td>
                                </tr>
                            ))}
                            {partnerApplications.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="text-muted">Пока нет заявок</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}

                {!loading && tab === 'catalogQuality' && (
                    <div className={styles.qualitySection}>
                        {!catalogQuality ? (
                            <div className="text-muted">Данные пока недоступны</div>
                        ) : (
                            <>
                                <div className={styles.qualityGrid}>
                                    <div className={styles.metric}><span>Товаров</span><strong>{catalogQuality.totals.products}</strong></div>
                                    <div className={styles.metric}><span>Без описания</span><strong>{catalogQuality.quality.missingDescription}</strong></div>
                                    <div className={styles.metric}><span>Неверная единица</span><strong>{catalogQuality.quality.invalidUnit}</strong></div>
                                    <div className={styles.metric}><span>Невалидная цена</span><strong>{catalogQuality.quality.invalidPrice}</strong></div>
                                    <div className={styles.metric}><span>Устаревшие цены</span><strong>{catalogQuality.quality.staleProducts}</strong></div>
                                    <div className={styles.metric}><span>Нет в наличии</span><strong>{catalogQuality.quality.outOfStock}</strong></div>
                                    <div className={styles.metric}><span>Компаний без товаров</span><strong>{catalogQuality.totals.companiesWithoutProducts}</strong></div>
                                </div>

                                <div className={styles.hintBox}>
                                    Порог устаревания цен: {catalogQuality.staleDays} дней
                                </div>

                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Компании без каталога</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {catalogQuality.samples.companiesWithoutProducts.length === 0 ? (
                                            <tr><td className="text-muted">Все компании имеют товары</td></tr>
                                        ) : (
                                            catalogQuality.samples.companiesWithoutProducts.map((c) => (
                                                <tr key={c.id}>
                                                    <td>{c.name} <code className={styles.code}>{c.id}</code></td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </>
                        )}
                    </div>
                )}

                {!loading && tab === 'integrations' && (
                    <div className={styles.integrationSection}>
                        <div className={styles.hintBox}>
                            1С Sync endpoint: <code>/api/integrations/onec/sync</code> (POST, headers <code>x-integration-key</code> + <code>x-idempotency-key</code>, поддерживается <code>externalSku</code>)
                        </div>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Дата</th>
                                    <th>Источник</th>
                                    <th>Компания</th>
                                    <th>Строк</th>
                                    <th>Результат</th>
                                    <th>Ошибки</th>
                                </tr>
                            </thead>
                            <tbody>
                                {integrationLogs.length === 0 ? (
                                    <tr><td colSpan={6} className="text-muted">Синхронизаций пока нет</td></tr>
                                ) : (
                                    integrationLogs.map((log) => (
                                        <tr key={log.id}>
                                            <td>{formatDate(log.createdAt)}</td>
                                            <td>{log.source}</td>
                                            <td><code className={styles.code}>{log.companyId}</code></td>
                                            <td>{log.totalReceived}</td>
                                            <td>+{log.created} / ~{log.updated} / -{log.skipped}</td>
                                            <td className={styles.applicationMessage}>{log.errors?.slice(0, 2).join(' | ') || '—'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {!loading && tab === 'webImports' && (
                    <div className={styles.integrationSection}>
                        <div className={styles.hintBox}>
                            Компании, добавленные из веб-источников (поле <code>Источник:</code> в описании).
                        </div>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Компания</th>
                                    <th>Категория</th>
                                    <th>Источник</th>
                                    <th>Обновлено</th>
                                </tr>
                            </thead>
                            <tbody>
                                {webImportRows.length === 0 ? (
                                    <tr><td colSpan={4} className="text-muted">Web-импортов пока нет</td></tr>
                                ) : (
                                    webImportRows.map((row) => (
                                        <tr key={row.id}>
                                            <td>{row.name}</td>
                                            <td>{row.categoryLabel}</td>
                                            <td className={styles.applicationMessage}>
                                                <a href={row.source} target="_blank" rel="noreferrer">{row.source}</a>
                                            </td>
                                            <td>{row.updatedAt ? formatDate(row.updatedAt) : '—'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
