import styles from '../page.module.css';

interface WebImportsTabProps {
    webImportRows: { id: string; name: string; source: string; categoryLabel: string; updatedAt: string }[];
}

export function WebImportsTab({ webImportRows }: WebImportsTabProps) {
    return (
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
                                <td>{new Date(row.updatedAt).toLocaleDateString()}</td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
