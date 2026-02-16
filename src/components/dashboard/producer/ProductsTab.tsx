
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Product, Category } from '@/lib/types'; // We need these types exported or defined locally if not

interface ProductsTabProps {
    companyId: string;
}

export default function ProductsTab({ companyId }: ProductsTabProps) {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [importCsv, setImportCsv] = useState('');
    const [importResult, setImportResult] = useState<null | {
        dryRun?: boolean;
        created: number;
        updated: number;
        skipped: number;
        totalReceived: number;
        errors?: Array<{ row?: number; column?: string; message: string }>;
        preview?: Array<{
            row: number;
            name: string;
            categoryRef: string;
            action: 'create' | 'update' | 'skip';
            reason?: string;
        }>;
    }>(null);
    const [importLoading, setImportLoading] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        categoryId: '',
        priceFrom: '',
        unit: 'м3',
        inStock: true,
    });

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [prodRes, catRes] = await Promise.all([
                fetch(`/api/products?companyId=${companyId}`),
                fetch('/api/categories')
            ]);
            const prods = await prodRes.json();
            const cats = await catRes.json();
            setProducts(prods);
            setCategories(cats);
        } catch (error) {
            console.error('Failed to load data', error);
        } finally {
            setLoading(false);
        }
    }, [companyId]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editingProduct
                ? `/api/products/${editingProduct.id}`
                : '/api/products';

            const method = editingProduct ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!res.ok) throw new Error('Failed to save');

            await loadData();
            closeModal();
        } catch {
            alert('Ошибка сохранения');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Вы уверены, что хотите удалить этот товар?')) return;
        try {
            await fetch(`/api/products/${id}`, { method: 'DELETE' });
            await loadData();
        } catch {
            alert('Ошибка удаления');
        }
    };

    const openModal = (product?: Product) => {
        if (product) {
            setEditingProduct(product);
            setFormData({
                name: product.name,
                description: product.description,
                categoryId: product.categoryId,
                priceFrom: String(product.priceFrom),
                unit: product.unit,
                inStock: product.inStock,
            });
        } else {
            setEditingProduct(null);
            setFormData({
                name: '',
                description: '',
                categoryId: categories[0]?.id || '',
                priceFrom: '',
                unit: 'м3',
                inStock: true,
            });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => setIsModalOpen(false);

    const handleImport = async (dryRun: boolean) => {
        if (!importCsv.trim()) {
            alert('Вставьте CSV данные');
            return;
        }

        setImportLoading(true);
        setImportResult(null);
        try {
            const res = await fetch('/api/products/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ csv: importCsv, dryRun }),
            });
            const result = await res.json();
            if (!res.ok) {
                throw new Error(result.error || 'Ошибка импорта');
            }
            setImportResult(result);
            if (!dryRun) {
                await loadData();
            }
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Ошибка импорта');
        } finally {
            setImportLoading(false);
        }
    };

    if (loading) return <div>Загрузка...</div>;

    return (
        <div className="products-tab">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2>Мои товары</h2>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary" onClick={() => setIsImportOpen((prev) => !prev)}>
                        Импорт CSV
                    </button>
                    <button className="btn btn-primary" onClick={() => openModal()}>
                        + Добавить товар
                    </button>
                </div>
            </div>

            {isImportOpen && (
                <div className="card" style={{ marginBottom: 20 }}>
                    <h3 style={{ marginBottom: 8 }}>Импорт каталога из CSV</h3>
                    <p className="text-secondary" style={{ marginBottom: 10 }}>
                        Колонки: <code>name,description,category,priceFrom,unit,priceUnit,inStock</code>
                    </p>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                                window.location.href = '/api/products/import';
                            }}
                        >
                            Скачать шаблон CSV
                        </button>
                        <span className="text-secondary">Сначала запустите проверку, затем применяйте.</span>
                    </div>
                    <textarea
                        className="input"
                        style={{ minHeight: 170, fontFamily: 'monospace' }}
                        value={importCsv}
                        onChange={(e) => setImportCsv(e.target.value)}
                        placeholder={'name,description,category,priceFrom,unit,priceUnit,inStock\nБетон М300,Тяжелый бетон,Бетон,28000,м3,за м3,true'}
                    />
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <button className="btn btn-secondary" onClick={() => void handleImport(true)} disabled={importLoading}>
                            {importLoading ? 'Проверка...' : 'Проверить (dry-run)'}
                        </button>
                        <button className="btn btn-primary" onClick={() => void handleImport(false)} disabled={importLoading}>
                            {importLoading ? 'Импорт...' : 'Применить импорт'}
                        </button>
                        <button className="btn btn-ghost" onClick={() => setImportCsv('')}>
                            Очистить
                        </button>
                    </div>

                    {importResult && (
                        <div style={{ marginTop: 12 }}>
                            <div className="badge badge-success">
                                {importResult.dryRun ? 'Dry-run: ' : ''}Создано: {importResult.created}, Обновлено: {importResult.updated}, Пропущено: {importResult.skipped}
                            </div>
                            {!!importResult.errors?.length && (
                                <div className="text-secondary" style={{ marginTop: 8 }}>
                                    Ошибки: {importResult.errors.slice(0, 5).map((e) => `${e.row ? `строка ${e.row}` : 'строка'}${e.column ? ` (${e.column})` : ''}: ${e.message}`).join(' | ')}
                                </div>
                            )}
                            {!!importResult.preview?.length && (
                                <div style={{ marginTop: 10, overflowX: 'auto' }}>
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Строка</th>
                                                <th>Товар</th>
                                                <th>Категория</th>
                                                <th>Действие</th>
                                                <th>Причина</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {importResult.preview.slice(0, 30).map((item, idx) => (
                                                <tr key={`${item.row}-${idx}`}>
                                                    <td>{item.row}</td>
                                                    <td>{item.name || '—'}</td>
                                                    <td>{item.categoryRef || '—'}</td>
                                                    <td>
                                                        {item.action === 'create' && 'Создать'}
                                                        {item.action === 'update' && 'Обновить'}
                                                        {item.action === 'skip' && 'Пропустить'}
                                                    </td>
                                                    <td>{item.reason || '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <div className="text-secondary" style={{ marginTop: 6 }}>
                                        Показано {Math.min(importResult.preview.length, 30)} из {importResult.preview.length} строк preview.
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            <div className="grid">
                {products.length === 0 ? (
                    <p>Товаров пока нет. Добавьте первый товар!</p>
                ) : (
                    products.map(product => (
                        <div key={product.id} className="card product-card">
                            <div className="card-header">
                                <h3>{product.name}</h3>
                                <span className={`badge ${product.inStock ? 'badge-success' : 'badge-danger'}`}>
                                    {product.inStock ? 'В наличии' : 'Нет в наличии'}
                                </span>
                            </div>
                            <p className="text-secondary">{product.description}</p>
                            <div className="price-tag">
                                {product.priceFrom} ₸ / {product.unit}
                            </div>
                            <div className="actions" style={{ marginTop: 10, display: 'flex', gap: 10 }}>
                                <button className="btn btn-sm btn-ghost" onClick={() => openModal(product)}>Редактировать</button>
                                <button className="btn btn-sm btn-danger-ghost" onClick={() => handleDelete(product.id)}>Удалить</button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h3>{editingProduct ? 'Редактирование товара' : 'Новый товар'}</h3>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Название</label>
                                <input
                                    className="input"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Категория</label>
                                <select
                                    className="input"
                                    value={formData.categoryId}
                                    onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                                    required
                                >
                                    <option value="">Выберите категорию</option>
                                    {categories.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Описание</label>
                                <textarea
                                    className="input"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                            <div className="row">
                                <div className="form-group col">
                                    <label>Цена (от)</label>
                                    <input
                                        type="number"
                                        className="input"
                                        value={formData.priceFrom}
                                        onChange={e => setFormData({ ...formData, priceFrom: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group col">
                                    <label>Ед. измерения</label>
                                    <select
                                        className="input"
                                        value={formData.unit}
                                        onChange={e => setFormData({ ...formData, unit: e.target.value })}
                                    >
                                        <option value="м3">м³ (куб)</option>
                                        <option value="тонн">тонн</option>
                                        <option value="шт">штук</option>
                                        <option value="час">час</option>
                                        <option value="смена">смена</option>
                                        <option value="рейс">рейс</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={formData.inStock}
                                        onChange={e => setFormData({ ...formData, inStock: e.target.checked })}
                                    /> В наличии
                                </label>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-ghost" onClick={closeModal}>Отмена</button>
                                <button type="submit" className="btn btn-primary">Сохранить</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style jsx>{`
                .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
                .price-tag { font-size: 1.25rem; font-weight: bold; color: var(--primary); margin-top: 10px; }
                .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; alignItems: center; z-index: 1000; }
                .modal { background: var(--bg-card); padding: 30px; border-radius: 12px; width: 100%; max-width: 500px; border: 1px solid var(--border); }
                .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
                .btn-danger-ghost { color: var(--error); background: transparent; border: 1px solid var(--error); }
                .btn-danger-ghost:hover { background: var(--error); color: white; }
            `}</style>
        </div>
    );
}
