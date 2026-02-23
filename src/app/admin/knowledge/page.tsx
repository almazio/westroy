'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import styles from './page.module.css';
import { KNOWLEDGE_TYPE_LABELS, slugifyKnowledgeTitle, type KnowledgeItemStatus, type KnowledgeItemType } from '@/lib/knowledge-base';

interface KnowledgeSource {
    id: string;
    type: string;
    title: string;
    url?: string | null;
    publisher?: string | null;
    notes?: string | null;
}

interface KnowledgeEntry {
    id: string;
    title: string;
    slug: string;
    market: string;
    type: KnowledgeItemType;
    status: KnowledgeItemStatus;
    topic?: string | null;
    summary?: string | null;
    contentMd: string;
    formula?: string | null;
    inputSchemaJson?: string | null;
    outputSchemaJson?: string | null;
    tagsJson: string;
    regionCode?: string | null;
    sourceName?: string | null;
    sourceUrl?: string | null;
    verificationNote?: string | null;
    createdAt: string;
    updatedAt: string;
    sources: KnowledgeSource[];
}

interface KnowledgeFormState {
    title: string;
    slug: string;
    type: KnowledgeItemType;
    status: KnowledgeItemStatus;
    topic: string;
    summary: string;
    contentMd: string;
    formula: string;
    inputSchemaJson: string;
    outputSchemaJson: string;
    tags: string;
    regionCode: string;
    sourceName: string;
    sourceUrl: string;
    verificationNote: string;
}

const emptyForm: KnowledgeFormState = {
    title: '',
    slug: '',
    type: 'snippet',
    status: 'draft',
    topic: '',
    summary: '',
    contentMd: '',
    formula: '',
    inputSchemaJson: '',
    outputSchemaJson: '',
    tags: '',
    regionCode: '',
    sourceName: '',
    sourceUrl: '',
    verificationNote: '',
};

const STATUS_LABELS: Record<KnowledgeItemStatus, string> = {
    draft: 'Черновик',
    reviewed: 'Проверено',
    published: 'Опубликовано',
    archived: 'Архив',
};

function parseTags(tagsJson: string): string[] {
    try {
        const parsed = JSON.parse(tagsJson);
        return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
    } catch {
        return [];
    }
}

export default function KnowledgeAdminPage() {
    const [items, setItems] = useState<KnowledgeEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [seeding, setSeeding] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [form, setForm] = useState<KnowledgeFormState>(emptyForm);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [typeFilter, setTypeFilter] = useState<KnowledgeItemType | 'all'>('all');

    const filtered = useMemo(() => {
        if (typeFilter === 'all') return items;
        return items.filter((item) => item.type === typeFilter);
    }, [items, typeFilter]);

    const totals = useMemo(() => {
        const byStatus = {
            draft: 0,
            reviewed: 0,
            published: 0,
            archived: 0,
        } as Record<KnowledgeItemStatus, number>;

        for (const item of items) {
            byStatus[item.status] += 1;
        }

        return byStatus;
    }, [items]);

    const loadItems = async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/admin/knowledge/entries');
            const body = await res.json();

            if (!res.ok) {
                throw new Error(body?.error || 'Failed to load knowledge base entries');
            }

            setItems(Array.isArray(body) ? body : []);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'Failed to load knowledge base entries');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadItems();
    }, []);

    const resetForm = () => {
        setForm(emptyForm);
        setEditingId(null);
    };

    const startEdit = (item: KnowledgeEntry) => {
        const tags = parseTags(item.tagsJson);
        setEditingId(item.id);
        setForm({
            title: item.title,
            slug: item.slug,
            type: item.type,
            status: item.status,
            topic: item.topic || '',
            summary: item.summary || '',
            contentMd: item.contentMd,
            formula: item.formula || '',
            inputSchemaJson: item.inputSchemaJson || '',
            outputSchemaJson: item.outputSchemaJson || '',
            tags: tags.join(', '),
            regionCode: item.regionCode || '',
            sourceName: item.sourceName || '',
            sourceUrl: item.sourceUrl || '',
            verificationNote: item.verificationNote || '',
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const submitForm = async () => {
        setSubmitting(true);
        setError(null);

        try {
            const payload = {
                ...form,
                slug: form.slug.trim() || slugifyKnowledgeTitle(form.title),
            };

            const endpoint = editingId ? `/api/admin/knowledge/entries/${editingId}` : '/api/admin/knowledge/entries';
            const method = editingId ? 'PATCH' : 'POST';
            const res = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const body = await res.json();

            if (!res.ok) {
                throw new Error(body?.error || 'Failed to save entry');
            }

            await loadItems();
            resetForm();
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : 'Failed to save entry');
        } finally {
            setSubmitting(false);
        }
    };

    const deleteItem = async (id: string) => {
        const ok = window.confirm('Удалить запись из базы знаний?');
        if (!ok) return;

        try {
            const res = await fetch(`/api/admin/knowledge/entries/${id}`, { method: 'DELETE' });
            const body = await res.json();
            if (!res.ok) throw new Error(body?.error || 'Failed to delete entry');

            setItems((prev) => prev.filter((item) => item.id !== id));
            if (editingId === id) {
                resetForm();
            }
        } catch (deleteError) {
            setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete entry');
        }
    };

    const seedKnowledgeBase = async () => {
        setSeeding(true);
        setError(null);

        try {
            const res = await fetch('/api/admin/knowledge/seed', { method: 'POST' });
            const body = await res.json();
            if (!res.ok) throw new Error(body?.error || 'Failed to seed knowledge base');

            await loadItems();
            alert(`Импорт завершен: создано ${body.created}, обновлено ${body.updated}`);
        } catch (seedError) {
            setError(seedError instanceof Error ? seedError.message : 'Failed to seed knowledge base');
        } finally {
            setSeeding(false);
        }
    };

    return (
        <div className="page">
            <div className="container">
                <div className={styles.header}>
                    <div>
                        <h1>База знаний (KZ)</h1>
                        <p className="text-secondary">ГОСТы, СНиП/СП, расчеты, замеры, сниппеты и лайфхаки для рынка Казахстана.</p>
                    </div>
                    <div className={styles.headerActions}>
                        <button className="btn btn-secondary" onClick={() => void seedKnowledgeBase()} disabled={seeding}>
                            {seeding ? 'Импорт...' : 'Импорт стартового пакета'}
                        </button>
                        <Link href="/admin" className="btn btn-ghost">← Назад в админку</Link>
                    </div>
                </div>

                {error && <div className={styles.errorBox}>Ошибка: {error}</div>}

                <div className={styles.summaryGrid}>
                    <div className={styles.card}><span>Всего</span><strong>{items.length}</strong></div>
                    <div className={styles.card}><span>Черновик</span><strong>{totals.draft}</strong></div>
                    <div className={styles.card}><span>Проверено</span><strong>{totals.reviewed}</strong></div>
                    <div className={styles.card}><span>Опубликовано</span><strong>{totals.published}</strong></div>
                    <div className={styles.card}><span>Архив</span><strong>{totals.archived}</strong></div>
                </div>

                <section className={styles.formSection}>
                    <h2>{editingId ? 'Редактирование записи' : 'Новая запись'}</h2>
                    <div className={styles.formGrid}>
                        <input className="input" placeholder="Заголовок" value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} />
                        <input className="input" placeholder="Slug (если пусто, сгенерируется)" value={form.slug} onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))} />
                        <select className="input" value={form.type} onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value as KnowledgeItemType }))}>
                            {(Object.keys(KNOWLEDGE_TYPE_LABELS) as KnowledgeItemType[]).map((type) => (
                                <option key={type} value={type}>{KNOWLEDGE_TYPE_LABELS[type]}</option>
                            ))}
                        </select>
                        <select className="input" value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as KnowledgeItemStatus }))}>
                            {(Object.keys(STATUS_LABELS) as KnowledgeItemStatus[]).map((status) => (
                                <option key={status} value={status}>{STATUS_LABELS[status]}</option>
                            ))}
                        </select>
                        <input className="input" placeholder="Topic (например calculations/concrete)" value={form.topic} onChange={(e) => setForm((prev) => ({ ...prev, topic: e.target.value }))} />
                        <input className="input" placeholder="Region code (опц., например kz-shym)" value={form.regionCode} onChange={(e) => setForm((prev) => ({ ...prev, regionCode: e.target.value }))} />
                        <input className="input" placeholder="Теги через запятую" value={form.tags} onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value }))} />
                        <input className="input" placeholder="Источник (коротко)" value={form.sourceName} onChange={(e) => setForm((prev) => ({ ...prev, sourceName: e.target.value }))} />
                        <input className="input" placeholder="Ссылка на источник" value={form.sourceUrl} onChange={(e) => setForm((prev) => ({ ...prev, sourceUrl: e.target.value }))} />
                        <input className="input" placeholder="Формула (для калькуляторов)" value={form.formula} onChange={(e) => setForm((prev) => ({ ...prev, formula: e.target.value }))} />
                    </div>

                    <textarea className="input" rows={3} placeholder="Краткое описание" value={form.summary} onChange={(e) => setForm((prev) => ({ ...prev, summary: e.target.value }))} />
                    <textarea className="input" rows={6} placeholder="Содержание карточки (Markdown/plain text)" value={form.contentMd} onChange={(e) => setForm((prev) => ({ ...prev, contentMd: e.target.value }))} />

                    <div className={styles.formGrid}>
                        <textarea className="input" rows={4} placeholder="JSON входов (опц.)" value={form.inputSchemaJson} onChange={(e) => setForm((prev) => ({ ...prev, inputSchemaJson: e.target.value }))} />
                        <textarea className="input" rows={4} placeholder="JSON выходов (опц.)" value={form.outputSchemaJson} onChange={(e) => setForm((prev) => ({ ...prev, outputSchemaJson: e.target.value }))} />
                    </div>

                    <textarea className="input" rows={2} placeholder="Комментарий по верификации" value={form.verificationNote} onChange={(e) => setForm((prev) => ({ ...prev, verificationNote: e.target.value }))} />

                    <div className={styles.formActions}>
                        <button className="btn btn-primary" onClick={() => void submitForm()} disabled={submitting}>
                            {submitting ? 'Сохранение...' : editingId ? 'Сохранить изменения' : 'Создать запись'}
                        </button>
                        {editingId && (
                            <button className="btn btn-ghost" onClick={resetForm}>
                                Отмена
                            </button>
                        )}
                    </div>
                </section>

                <section className={styles.listSection}>
                    <div className={styles.listHeader}>
                        <h2>Записи базы знаний</h2>
                        <select className="input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as KnowledgeItemType | 'all')}>
                            <option value="all">Все типы</option>
                            {(Object.keys(KNOWLEDGE_TYPE_LABELS) as KnowledgeItemType[]).map((type) => (
                                <option key={type} value={type}>{KNOWLEDGE_TYPE_LABELS[type]}</option>
                            ))}
                        </select>
                    </div>

                    {loading ? (
                        <div className="text-muted">Загрузка...</div>
                    ) : filtered.length === 0 ? (
                        <div className="text-muted">Записей пока нет</div>
                    ) : (
                        <div className={styles.entries}>
                            {filtered.map((item) => {
                                const tags = parseTags(item.tagsJson);

                                return (
                                    <article key={item.id} className={styles.entryCard}>
                                        <div className={styles.entryTop}>
                                            <div>
                                                <h3>{item.title}</h3>
                                                <p className="text-muted">/{item.slug}</p>
                                            </div>
                                            <div className={styles.badges}>
                                                <span className="badge badge-info">{KNOWLEDGE_TYPE_LABELS[item.type]}</span>
                                                <span className="badge badge-secondary">{STATUS_LABELS[item.status]}</span>
                                            </div>
                                        </div>

                                        {item.summary && <p>{item.summary}</p>}

                                        <div className={styles.metaRow}>
                                            <span><strong>Topic:</strong> {item.topic || '—'}</span>
                                            <span><strong>Обновлено:</strong> {new Date(item.updatedAt).toLocaleString('ru-RU')}</span>
                                        </div>

                                        {item.formula && (
                                            <div className={styles.codeBox}>
                                                <strong>Формула:</strong> <code>{item.formula}</code>
                                            </div>
                                        )}

                                        {tags.length > 0 && (
                                            <div className={styles.tags}>
                                                {tags.map((tag) => (
                                                    <span key={`${item.id}-${tag}`} className="badge badge-ghost">#{tag}</span>
                                                ))}
                                            </div>
                                        )}

                                        {(item.sourceName || item.sourceUrl) && (
                                            <div className={styles.sourceLine}>
                                                <strong>Источник:</strong>{' '}
                                                {item.sourceUrl ? <a href={item.sourceUrl} target="_blank" rel="noreferrer">{item.sourceName || item.sourceUrl}</a> : item.sourceName}
                                            </div>
                                        )}

                                        {item.sources.length > 0 && (
                                            <div className={styles.sourceList}>
                                                {item.sources.map((source) => (
                                                    <div key={source.id}>
                                                        <strong>{source.title}</strong>
                                                        {source.url && <a href={source.url} target="_blank" rel="noreferrer"> {source.url}</a>}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className={styles.entryActions}>
                                            <button className="btn btn-secondary btn-sm" onClick={() => startEdit(item)}>Редактировать</button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => void deleteItem(item.id)}>Удалить</button>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
