import { useState } from 'react';
import styles from '../page.module.css';
import { trackEvent } from '@/lib/analytics';
import type { CompanyData, CategoryRef } from '../types';

interface CompanyEditForm {
    name: string;
    description: string;
    phone: string;
    address: string;
    delivery: boolean;
}

interface CompaniesTabProps {
    companies: CompanyData[];
    categories: CategoryRef[];
    setCompanies: React.Dispatch<React.SetStateAction<CompanyData[]>>;
}

export function CompaniesTab({ companies, categories, setCompanies }: CompaniesTabProps) {
    const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
    const [companyForm, setCompanyForm] = useState<CompanyEditForm>({
        name: '',
        description: '',
        phone: '',
        address: '',
        delivery: false,
    });

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

    return (
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
    );
}
