
'use client';

import { useState, useEffect, useCallback } from 'react';

interface SettingsTabProps {
    companyId: string;
}

export default function SettingsTab({ companyId }: SettingsTabProps) {
    const [loading, setLoading] = useState(true);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        phone: '',
        address: '',
        delivery: false,
    });

    const loadData = useCallback(async () => {
        try {
            const res = await fetch(`/api/companies/${companyId}`);
            if (res.ok) {
                const data = await res.json();
                setFormData({
                    name: data.name,
                    description: data.description,
                    phone: data.phone,
                    address: data.address,
                    delivery: data.delivery,
                });
            }
        } catch (error) {
            console.error(error);
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
            const res = await fetch(`/api/companies/${companyId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!res.ok) throw new Error('Failed to update');
            alert('Сохранено!');
            void loadData();
        } catch {
            alert('Ошибка сохранения');
        }
    };

    if (loading) return <div>Загрузка...</div>;

    return (
        <div className="settings-tab">
            <h2>Настройки профиля</h2>

            <form onSubmit={handleSubmit} className="settings-form">
                <div className="form-group">
                    <label>Название компании</label>
                    <input
                        className="input"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                </div>

                <div className="form-group">
                    <label>Телефон диспетчера</label>
                    <input
                        className="input"
                        value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    />
                </div>

                <div className="form-group">
                    <label>Описание</label>
                    <textarea
                        className="input"
                        rows={4}
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                </div>

                <div className="form-group">
                    <label>Адрес базы/офиса</label>
                    <input
                        className="input"
                        value={formData.address}
                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                    />
                </div>

                <div className="form-group">
                    <label>
                        <input
                            type="checkbox"
                            checked={formData.delivery}
                            onChange={e => setFormData({ ...formData, delivery: e.target.checked })}
                        />
                        Есть собственная доставка
                    </label>
                </div>

                <button type="submit" className="btn btn-primary">Сохранить изменения</button>
            </form>

            <style jsx>{`
                .settings-form { max-width: 600px; }
            `}</style>
        </div>
    );
}
