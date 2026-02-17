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
                        <h1>Подключайте компанию и получайте входящие заявки от клиентов</h1>
                        <p>
                            Мы подключаем поставщиков через модерацию, чтобы в каталоге были реальные компании,
                            а лиды приходили целевыми и с понятным запросом.
                        </p>
                        <div className={styles.metrics}>
                            <div className={styles.metric}><strong>1 день</strong><span>средний срок модерации</span></div>
                            <div className={styles.metric}><strong>0%</strong><span>комиссии за подключение</span></div>
                            <div className={styles.metric}><strong>100%</strong><span>заявки в одном кабинете</span></div>
                        </div>
                    </div>
                </div>
            </section>

            <section className={styles.benefitsSection}>
                <div className="container">
                    <h2 className={styles.sectionTitle}>Почему поставщики подключаются к WESTROY</h2>
                    <div className={styles.benefitsGrid}>
                        <article className={styles.benefitCard}>
                            <h3>Целевые лиды</h3>
                            <p>Получаете реальные запросы с категорией, объёмом и городом, а не случайные звонки.</p>
                        </article>
                        <article className={styles.benefitCard}>
                            <h3>Управление в одном месте</h3>
                            <p>Каталог, заявки, офферы и статусы клиентов ведутся в одном рабочем кабинете.</p>
                        </article>
                        <article className={styles.benefitCard}>
                            <h3>Быстрый запуск каталога</h3>
                            <p>Можно загрузить прайс массово и сразу начать отвечать на запросы клиентов.</p>
                        </article>
                    </div>
                </div>
            </section>

            <section className={styles.processSection}>
                <div className="container">
                    <h2 className={styles.sectionTitle}>Как проходит подключение</h2>
                    <div className={styles.steps}>
                        <div className={styles.step}><strong>1.</strong> Оставляете заявку</div>
                        <div className={styles.step}><strong>2.</strong> Проверяем компанию и контакты</div>
                        <div className={styles.step}><strong>3.</strong> Открываем доступ в кабинет поставщика</div>
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

            <section className={styles.faqSection}>
                <div className="container">
                    <h2 className={styles.sectionTitle}>Частые вопросы</h2>
                    <div className={styles.faqGrid}>
                        <article className={styles.faqCard}>
                            <h3>Сколько занимает подключение?</h3>
                            <p>Обычно в течение одного рабочего дня после проверки данных компании.</p>
                        </article>
                        <article className={styles.faqCard}>
                            <h3>Можно загрузить прайс листом?</h3>
                            <p>Да. После активации кабинета можно массово загрузить каталог и обновлять цены.</p>
                        </article>
                        <article className={styles.faqCard}>
                            <h3>Кому доступны заявки?</h3>
                            <p>Только верифицированным поставщикам, подключенным к вашей категории и региону.</p>
                        </article>
                    </div>
                </div>
            </section>
        </div>
    );
}
