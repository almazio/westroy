
'use client'

import { useState, Suspense, FormEvent } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import styles from './page.module.css'

function LoginPageContent() {
    const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined)
    const [pending, setPending] = useState(false)
    const searchParams = useSearchParams()
    const callbackUrl = searchParams.get('callbackUrl') || '/'

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setPending(true);
        setErrorMessage(undefined);

        const form = new FormData(event.currentTarget);
        const email = String(form.get('email') || '');
        const password = String(form.get('password') || '');

        const result = await signIn('credentials', {
            email,
            password,
            redirect: false,
            callbackUrl,
        });

        setPending(false);

        if (!result || result.error) {
            setErrorMessage('Invalid credentials.');
            return;
        }

        window.location.href = result.url || callbackUrl;
    }

    return (
        <div className={styles.container}>
            <div className="card" style={{ maxWidth: '400px', width: '100%', margin: '0 auto' }}>
                <h2 style={{ marginBottom: '24px', textAlign: 'center' }}>Вход в систему</h2>
                <form onSubmit={onSubmit} className="flex flex-col gap-16">
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input className="input" id="email" type="email" name="email" placeholder="example@mail.com" required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Пароль</label>
                        <input className="input" id="password" type="password" name="password" required minLength={6} />
                    </div>
                    {errorMessage && (
                        <div className="badge badge-error" style={{ justifyContent: 'center' }}>
                            {errorMessage}
                        </div>
                    )}
                    <button className="btn btn-primary" aria-disabled={pending}>
                        {pending ? 'Вход...' : 'Войти'}
                    </button>
                    <div style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        Нет аккаунта заказчика? <Link href="/register">Зарегистрироваться</Link>
                    </div>
                    <div style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        Я производитель: <Link href="/partners">Подать заявку на подключение</Link>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className={styles.container}><div className="card">Загрузка...</div></div>}>
            <LoginPageContent />
        </Suspense>
    );
}
