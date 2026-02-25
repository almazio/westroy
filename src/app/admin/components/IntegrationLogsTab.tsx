import styles from '../page.module.css';
import type { IntegrationSyncLog } from '../types';
import { formatDate } from '../types';

interface IntegrationLogsTabProps {
    integrationLogs: IntegrationSyncLog[];
}

export function IntegrationLogsTab({ integrationLogs }: IntegrationLogsTabProps) {
    return (
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
    );
}
