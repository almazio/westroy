import styles from '../page.module.css';
import type { CategoryRef } from '../types';

interface CategoriesTabProps {
    categories: CategoryRef[];
}

export function CategoriesTab({ categories }: CategoriesTabProps) {
    return (
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
    );
}
