import styles from '../page.module.css';
import type { RequestData } from '../types';
import { formatDate, requestStatusLabels } from '../types';

interface RequestsTabProps {
    requests: RequestData[];
}

export function RequestsTab({ requests }: RequestsTabProps) {
    return (
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
    );
}
