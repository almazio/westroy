'use client';

import { FormEvent, useState } from 'react';
import styles from './page.module.css';

type SubmitState = 'idle' | 'loading' | 'success' | 'error';

export default function PartnersPage() {
    const [state, setState] = useState<SubmitState>('idle');
    const [error, setError] = useState('');

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setState('loading');
        setError('');

        const form = event.currentTarget;
        const formData = new FormData(form);

        const payload = {
            name: String(formData.get('name') || '').trim(),
            email: String(formData.get('email') || '').trim(),
            phone: String(formData.get('phone') || '').trim(),
            companyName: String(formData.get('companyName') || '').trim(),
            category: String(formData.get('category') || '').trim(),
            city: String(formData.get('city') || '').trim(),
            message: String(formData.get('message') || '').trim(),
        };

        try {
            const response = await fetch('/api/partner-applications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const body = (await response.json().catch(() => ({}))) as { error?: string };
                throw new Error(body.error || 'Не удалось отправить заявку');
            }

            setState('success');
            form.reset();
        } catch (submitError) {
            setState('error');
            setError(submitError instanceof Error ? submitError.message : 'Ошибка отправки');
        }
    }

    return (
        <div className={styles.page}>
            <section className={styles.hero}>
                <div className="container">
                    <div className={styles.heroCard}>
                        <span className={styles.badge}>Партнерская программа WESTROY</span>
                        <h1>Подключение производителей через модерацию</h1>
                        <p>
                            Мы проверяем профиль компании перед выдачей доступа, чтобы в каталоге были только
                            реальные поставщики и клиенты получали качественные отклики.
                        </p>
                        <div className={styles.steps}>
                            <div className={styles.step}><strong>1.</strong> Заявка</div>
                            <div className={styles.step}><strong>2.</strong> Проверка</div>
                            <div className={styles.step}><strong>3.</strong> Доступ в кабинет</div>
                        </div>
                    </div>
                </div>
            </section>

            <section className={styles.formSection}>
                <div className="container">
                    <div className={styles.formCard}>
                        <h2>Оставьте заявку на подключение</h2>
                        <p className={styles.formIntro}>
                            Обычно рассматриваем в течение 1 рабочего дня. После одобрения отправим инструкции на email.
                        </p>

                        <form className={styles.form} onSubmit={onSubmit}>
                            <div className="form-group">
                                <label htmlFor="name">Контактное лицо</label>
                                <input className="input" id="name" name="name" type="text" required />
                            </div>
                            <div className="form-group">
                                <label htmlFor="companyName">Компания</label>
                                <input className="input" id="companyName" name="companyName" type="text" required />
                            </div>
                            <div className={styles.row}>
                                <div className="form-group">
                                    <label htmlFor="email">Email</label>
                                    <input className="input" id="email" name="email" type="email" required />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="phone">Телефон</label>
                                    <input className="input" id="phone" name="phone" type="tel" required />
                                </div>
                            </div>
                            <div className={styles.row}>
                                <div className="form-group">
                                    <label htmlFor="category">Категория</label>
                                    <input
                                        className="input"
                                        id="category"
                                        name="category"
                                        type="text"
                                        placeholder="Бетон, арматура, блоки..."
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="city">Город</label>
                                    <input className="input" id="city" name="city" type="text" defaultValue="Шымкент" required />
                                </div>
                            </div>
                            <div className="form-group">
                                <label htmlFor="message">Комментарий</label>
                                <textarea
                                    className={`${styles.textarea} input`}
                                    id="message"
                                    name="message"
                                    placeholder="Кратко о продукции, объемах и формате поставок"
                                />
                            </div>

                            {state === 'success' && <div className="badge badge-success">Заявка отправлена. Мы свяжемся с вами.</div>}
                            {state === 'error' && <div className="badge badge-error">{error || 'Ошибка отправки'}</div>}

                            <button type="submit" className="btn btn-primary" disabled={state === 'loading'}>
                                {state === 'loading' ? 'Отправка...' : 'Отправить заявку'}
                            </button>
                        </form>
                    </div>
                </div>
            </section>
        </div>
    );
}
