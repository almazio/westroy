import styles from '../page.module.css';
import { trackEvent } from '@/lib/analytics';
import type { PartnerApplicationData } from '../types';
import { formatDate } from '../types';

interface PartnerApplicationsTabProps {
    partnerApplications: PartnerApplicationData[];
    setPartnerApplications: React.Dispatch<React.SetStateAction<PartnerApplicationData[]>>;
}

export function PartnerApplicationsTab({ partnerApplications, setPartnerApplications }: PartnerApplicationsTabProps) {
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

    return (
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
    );
}
